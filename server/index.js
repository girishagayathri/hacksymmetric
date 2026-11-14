import initSqlJs from 'sql.js';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { MongoClient } from 'mongodb';
import pg from 'pg';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const databaseDirectory = join(serverDirectory, 'data');
const databasePath = join(databaseDirectory, 'fleet.sqlite');
mkdirSync(databaseDirectory, { recursive: true });

const SQL = await initSqlJs({
  locateFile: () => fileURLToPath(new URL('../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url)),
});
const fallbackDatabase = existsSync(databasePath)
  ? new SQL.Database(new Uint8Array(readFileSync(databasePath)))
  : new SQL.Database();
fallbackDatabase.exec(`
  CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS drivers (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS fleet_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

const postgres = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://okgadi:local-dev-only@127.0.0.1:5433/okgadi',
  connectionTimeoutMillis: 1000,
  max: 10,
});
const mongoUsername = process.env.MONGODB_USERNAME;
const mongoPassword = process.env.MONGODB_PASSWORD;
const defaultMongoUrl = mongoUsername && mongoPassword
  ? `mongodb://${encodeURIComponent(mongoUsername)}:${encodeURIComponent(mongoPassword)}@${process.env.MONGODB_HOST ?? '127.0.0.1:27017'}/?authSource=admin`
  : 'mongodb://127.0.0.1:27017';
const mongoClient = new MongoClient(process.env.MONGODB_URL ?? defaultMongoUrl, {
  serverSelectionTimeoutMS: 1000,
});
let postgresConnected = false;
let mongoConnected = false;
let postgresInitializing = null;
let mongoInitializing = null;
let mongoDatabase;
let telemetryCollection;

function readFallbackRows(table) {
  const result = fallbackDatabase.exec(`SELECT payload FROM ${table} ORDER BY rowid`);
  return result[0]?.values.map(([payload]) => JSON.parse(payload)) ?? [];
}

function fallbackIsInitialized() {
  return fallbackDatabase.exec("SELECT value FROM fleet_meta WHERE key = 'initialized'")[0]?.values.length > 0;
}

function persistFallback() {
  const temporaryPath = `${databasePath}.tmp`;
  writeFileSync(temporaryPath, Buffer.from(fallbackDatabase.export()));
  renameSync(temporaryPath, databasePath);
}

function replaceFallback(fleet) {
  fallbackDatabase.run('BEGIN TRANSACTION');
  try {
    for (const table of ['vehicles', 'drivers', 'trips']) {
      fallbackDatabase.run(`DELETE FROM ${table}`);
      const insert = fallbackDatabase.prepare(`INSERT INTO ${table} (id, payload) VALUES (?, ?)`);
      for (const record of fleet[table]) insert.run([record.id, JSON.stringify(record)]);
      insert.free();
    }
    fallbackDatabase.run("INSERT OR REPLACE INTO fleet_meta (key, value) VALUES ('initialized', 'true')");
    fallbackDatabase.run('COMMIT');
    persistFallback();
  } catch (error) {
    fallbackDatabase.run('ROLLBACK');
    throw error;
  }
}

function legacyFleet() {
  if (!existsSync(databasePath)) return null;
  try {
    const legacy = new SQL.Database(new Uint8Array(readFileSync(databasePath)));
    const initialized = legacy.exec("SELECT value FROM fleet_meta WHERE key = 'initialized'")[0]?.values.length > 0;
    if (!initialized) {
      legacy.close();
      return null;
    }
    const read = (table) => legacy.exec(`SELECT payload FROM ${table} ORDER BY rowid`)[0]?.values.map(([payload]) => JSON.parse(payload)) ?? [];
    const fleet = { vehicles: read('vehicles'), drivers: read('drivers'), trips: read('trips') };
    legacy.close();
    return fleet;
  } catch {
    return null;
  }
}

async function ensurePostgres() {
  if (postgresConnected) {
    try {
      await postgres.query('SELECT 1');
      return true;
    } catch {
      postgresConnected = false;
    }
  }
  if (postgresInitializing) return postgresInitializing;

  postgresInitializing = (async () => {
    try {
      await postgres.query(`
        CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, payload JSONB NOT NULL);
        CREATE TABLE IF NOT EXISTS drivers (id TEXT PRIMARY KEY, payload JSONB NOT NULL);
        CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, payload JSONB NOT NULL);
        CREATE TABLE IF NOT EXISTS fleet_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      `);
      const count = await postgres.query('SELECT (SELECT COUNT(*) FROM vehicles) + (SELECT COUNT(*) FROM drivers) + (SELECT COUNT(*) FROM trips) AS total');
      if (Number(count.rows[0].total) === 0) {
        const legacy = legacyFleet();
        if (legacy) await replacePostgres(legacy);
      }
      postgresConnected = true;
    } catch (error) {
      postgresConnected = false;
      if (process.env.NODE_ENV !== 'test') console.warn(`PostgreSQL unavailable; using local SQLite fallback: ${error.message}`);
    } finally {
      postgresInitializing = null;
    }
    return postgresConnected;
  })();

  return postgresInitializing;
}

async function replacePostgres(fleet) {
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    for (const table of ['vehicles', 'drivers', 'trips']) {
      await client.query(`DELETE FROM ${table}`);
      for (const item of fleet[table]) {
        await client.query(`INSERT INTO ${table} (id, payload) VALUES ($1, $2::jsonb)`, [item.id, JSON.stringify(item)]);
      }
    }
    await client.query("INSERT INTO fleet_meta (key, value) VALUES ('initialized', 'true') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function readPostgresRows(table) {
  const result = await postgres.query(`SELECT payload FROM ${table} ORDER BY id`);
  return result.rows.map((row) => row.payload);
}

async function readFleet() {
  if (await ensurePostgres()) {
    const initialized = await postgres.query("SELECT value FROM fleet_meta WHERE key = 'initialized'");
    return {
      initialized: initialized.rowCount > 0,
      data: {
        vehicles: await readPostgresRows('vehicles'),
        drivers: await readPostgresRows('drivers'),
        trips: await readPostgresRows('trips'),
      },
      database: 'postgresql',
    };
  }
  return {
    initialized: fallbackIsInitialized(),
    data: { vehicles: readFallbackRows('vehicles'), drivers: readFallbackRows('drivers'), trips: readFallbackRows('trips') },
    database: 'sqlite-fallback',
  };
}

async function writeFleet(fleet) {
  if (await ensurePostgres()) {
    await replacePostgres(fleet);
    return 'postgresql';
  }
  replaceFallback(fleet);
  return 'sqlite-fallback';
}

async function ensureMongo() {
  if (mongoConnected && telemetryCollection) {
    try {
      await mongoDatabase.command({ ping: 1 });
      return true;
    } catch {
      mongoConnected = false;
      telemetryCollection = null;
    }
  }
  if (mongoInitializing) return mongoInitializing;

  mongoInitializing = (async () => {
    try {
      try {
        await mongoClient.db('admin').command({ ping: 1 });
      } catch {
        await mongoClient.close().catch(() => undefined);
        await mongoClient.connect();
      }
      await mongoClient.db('admin').command({ ping: 1 });
      mongoDatabase = mongoClient.db(process.env.MONGODB_DATABASE ?? 'okgadi_telemetry');
      telemetryCollection = mongoDatabase.collection('vehicle_telemetry');
      await telemetryCollection.createIndex({ vehicleId: 1, recordedAt: -1 });
      mongoConnected = true;
    } catch (error) {
      mongoConnected = false;
      telemetryCollection = null;
      if (process.env.NODE_ENV !== 'test') console.warn(`MongoDB unavailable: ${error.message}`);
    } finally {
      mongoInitializing = null;
    }
    return mongoConnected;
  })();

  return mongoInitializing;
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

app.get('/api/health', async (_request, response) => {
  const postgresStatus = await ensurePostgres() ? 'connected' : 'disconnected';
  const mongoStatus = await ensureMongo() ? 'connected' : 'disconnected';
  const telemetryCount = mongoConnected ? await telemetryCollection.countDocuments().catch(() => 0) : 0;
  response.json({
    status: postgresStatus === 'connected' && mongoStatus === 'connected' ? 'ok' : 'degraded',
    postgres: postgresStatus,
    mongo: mongoStatus,
    fleetStorage: postgresStatus === 'connected' ? 'postgresql' : 'sqlite-fallback',
    telemetryCollection: mongoConnected ? 'vehicle_telemetry' : null,
    telemetryCount,
  });
});

app.get('/api/fleet', async (_request, response) => {
  try {
    response.json(await readFleet());
  } catch (error) {
    response.status(503).json({ error: error.message });
  }
});

app.put('/api/fleet', writeLimiter, async (request, response) => {
  const fleet = request.body;
  const collections = ['vehicles', 'drivers', 'trips'];
  const valid = fleet && collections.every((name) => Array.isArray(fleet[name]) && fleet[name].every((item) => item && typeof item.id === 'string' && item.id.length > 0));

  if (!valid) {
    response.status(400).json({ error: 'Expected vehicles, drivers, and trips arrays with string IDs.' });
    return;
  }

  try {
    const database = await writeFleet(fleet);
    response.json({ saved: true, database, updatedAt: new Date().toISOString() });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save fleet data.' });
  }
});

app.get('/api/telemetry', async (request, response) => {
  if (!(await ensureMongo())) {
    response.status(503).json({ error: 'MongoDB telemetry storage is unavailable.' });
    return;
  }
  const vehicleId = typeof request.query.vehicleId === 'string' ? request.query.vehicleId : undefined;
  const filter = vehicleId ? { vehicleId } : {};
  const documents = await telemetryCollection.find(filter).sort({ recordedAt: -1 }).limit(100).toArray();
  response.json(documents);
});

app.post('/api/telemetry', writeLimiter, async (request, response) => {
  if (!(await ensureMongo())) {
    response.status(503).json({ error: 'MongoDB telemetry storage is unavailable.' });
    return;
  }
  const { vehicleId, temperature, fuel, speed, health, anomalies, source = 'dashboard-snapshot' } = request.body ?? {};
  const values = [temperature, fuel, speed, health, anomalies];
  if (typeof vehicleId !== 'string' || !vehicleId.trim() || values.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    response.status(400).json({ error: 'Expected a vehicleId and numeric temperature, fuel, speed, health, and anomalies.' });
    return;
  }

  const document = {
    vehicleId: vehicleId.trim(),
    temperature,
    fuel,
    speed,
    health,
    anomalies,
    source: typeof source === 'string' ? source.slice(0, 64) : 'dashboard-snapshot',
    recordedAt: new Date(),
  };
  const result = await telemetryCollection.insertOne(document);
  response.status(201).json({ ...document, _id: result.insertedId });
});

const port = Number(process.env.API_PORT ?? 3001);
const server = app.listen(port, process.env.API_HOST ?? '127.0.0.1', async () => {
  console.log(`Fleet API listening on http://127.0.0.1:${port}`);
  await Promise.all([ensurePostgres(), ensureMongo()]);
});

function closeServer() {
  server.close(async () => {
    await Promise.allSettled([postgres.end(), mongoClient.close()]);
    fallbackDatabase.close();
    process.exit(0);
  });
}

process.on('SIGINT', closeServer);
process.on('SIGTERM', closeServer);