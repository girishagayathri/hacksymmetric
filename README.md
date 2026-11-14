# OkGadi Fleet Operations

## Local stack

The development stack uses PostgreSQL for fleet, driver, and trip records; MongoDB for vehicle telemetry snapshots; Redis for cached intelligence results; and FastAPI for anomaly scoring and dispatch recommendations.

Prerequisites on Windows:

- Node.js and npm
- Docker Desktop running with the Linux container engine
- Python 3.14 available through the `py` launcher
- The local Redis service running on port 6379

Start the databases and application:

```powershell
npm install
py -3.14 -m pip install -r services/intelligence/requirements.txt
npm run train:ml
npm run dev:full
```

The dashboard opens at `http://127.0.0.1:5173`. PostgreSQL is exposed on `127.0.0.1:5433` to avoid colliding with older local OkGadi stacks on port 5432. MongoDB uses `127.0.0.1:27017`; the backend and frontend use the configured local defaults.

`npm run infra:up` starts only the PostgreSQL and MongoDB containers. `npm run infra:down` stops this Compose project without removing its persistent volumes. The project is isolated as `okgadi-infra` and does not stop or reuse containers from the older OkGadi Compose project.

## Data behavior

- PostgreSQL is the primary store for fleet, driver, and trip records.
- If a populated legacy `server/data/fleet.sqlite` exists, the API imports it once when initializing an empty PostgreSQL database.
- If PostgreSQL is unavailable, the Node API reports the degraded state and uses the SQLite fallback; the browser also retains its local fallback.
- Vehicle Monitoring can save the currently displayed sample readings to MongoDB and browse recent snapshots for that vehicle. No physical sensor stream is connected in this demo.
- Docker credentials in `compose.yaml` are for local development only. Do not expose these services publicly or reuse these credentials in production.

## Public deployment

Production deployment targets a Linux VPS with Docker Engine and Docker Compose. Only Caddy publishes ports 80 and 443; it obtains HTTPS certificates. The app is public with no sign-in, and all visitors share the same writable demo fleet data. The API applies per-IP rate limits, but these do not replace user authentication or authorization. Databases, Redis, Node, and FastAPI have no public host ports.

1. Point a DNS `A` record for your domain at the VPS public IPv4 address. Allow inbound TCP ports 80 and 443 (and UDP 443 for HTTP/3) in the host/cloud firewall.
2. Install Docker Engine and the Docker Compose plugin on the VPS, then copy this project to it.
3. Copy `.env.production.example` to `.env.production` and set your domain and unique database/cache secrets. Use long random alphanumeric passwords.
4. Start the stack with `npm run deploy:up` or `docker compose --env-file .env.production -f compose.production.yaml up --build -d --wait`.
5. Visit `https://<your-domain>`.

The production Compose project has its own persistent volumes and does not stop or reuse the local development database containers. Back up the `postgres_data`, `mongo_data`, and `redis_data` volumes before host maintenance. Do not commit `.env.production` or publish its credentials. Because access is public, this configuration is suitable for a demo with synthetic records; add user authentication and authorization before using real fleet data.
