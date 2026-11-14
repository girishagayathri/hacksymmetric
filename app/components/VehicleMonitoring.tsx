import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, Battery, Database, Droplet, Gauge, Plus, Thermometer, Trash2, Truck, X } from 'lucide-react';
import { useFleetData, VehicleStatus } from '../data/FleetData';

const statuses: VehicleStatus[] = ['available', 'on-trip', 'warning', 'maintenance', 'offline'];
const fieldClass = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

type TelemetryRecord = {
  _id: string;
  vehicleId: string;
  temperature: number;
  fuel: number;
  speed: number;
  health: number;
  anomalies: number;
  source: string;
  recordedAt: string;
};

export function VehicleMonitoring() {
  const { vehicles, drivers, databaseStatus, createVehicle, updateVehicleStatus, deleteVehicle } = useFleetData();
  const [selectedId, setSelectedId] = useState('VH-2301');
  const [showForm, setShowForm] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleType, setVehicleType] = useState('Medium Van');
  const [capacityKg, setCapacityKg] = useState('3500');
  const [error, setError] = useState('');
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([]);
  const [telemetryError, setTelemetryError] = useState('');
  const [recordingTelemetry, setRecordingTelemetry] = useState(false);
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId) ?? vehicles[0];

  useEffect(() => {
    let active = true;

    async function loadTelemetry() {
      if (!selected || databaseStatus.mongo !== 'connected') {
        setTelemetry([]);
        return;
      }
      try {
        const response = await fetch(`/api/telemetry?vehicleId=${encodeURIComponent(selected.id)}`);
        if (!response.ok) throw new Error('Unable to load MongoDB telemetry.');
        const records = await response.json() as TelemetryRecord[];
        if (active) {
          setTelemetry(records);
          setTelemetryError('');
        }
      } catch {
        if (active) setTelemetryError('Could not load telemetry from MongoDB.');
      }
    }

    void loadTelemetry();
    const intervalId = window.setInterval(loadTelemetry, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [selected?.id, databaseStatus.mongo]);

  async function recordTelemetrySnapshot() {
    if (!selected) return;
    setRecordingTelemetry(true);
    setTelemetryError('');
    try {
      const response = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selected.id,
          temperature: selected.temperature,
          fuel: selected.fuel,
          speed: selected.speed,
          health: selected.health,
          anomalies: selected.anomalies,
          source: 'dashboard-snapshot',
        }),
      });
      if (!response.ok) throw new Error('Unable to save telemetry to MongoDB.');
      const record = await response.json() as TelemetryRecord;
      setTelemetry((current) => [record, ...current].slice(0, 100));
    } catch {
      setTelemetryError('Could not record telemetry. Check the MongoDB service connection.');
    } finally {
      setRecordingTelemetry(false);
    }
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = vehicleId.trim().toUpperCase();
    if (vehicles.some((vehicle) => vehicle.id.toLowerCase() === id.toLowerCase())) {
      setError('That vehicle ID already exists.');
      return;
    }
    createVehicle({ id, type: vehicleType, capacityKg: Number(capacityKg) });
    setSelectedId(id);
    setVehicleId('');
    setError('');
    setShowForm(false);
  }

  function handleDelete(id: string) {
    deleteVehicle(id);
    if (selectedId === id) setSelectedId(vehicles.find((vehicle) => vehicle.id !== id)?.id ?? '');
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Fleet assets</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-950">Vehicle monitoring</h2>
            <p className="mt-1 text-sm text-gray-500">{vehicles.length} vehicles · demo telemetry is illustrative, not live-connected.</p>
          </div>
          <button onClick={() => setShowForm((open) => !open)} className="inline-flex items-center gap-2 rounded-md bg-gray-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800">
            {showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Close' : 'Add vehicle'}
          </button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-5 sm:grid-cols-4">
            <input className={fieldClass} value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} placeholder="Vehicle ID (e.g. VH-9001)" aria-label="Vehicle ID" required />
            <select className={fieldClass} value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} aria-label="Vehicle type">
              <option>Light Truck</option><option>Medium Van</option><option>Heavy Truck</option><option>Refrigerated Truck</option>
            </select>
            <input className={fieldClass} type="number" min="1" value={capacityKg} onChange={(event) => setCapacityKg(event.target.value)} aria-label="Capacity in kilograms" placeholder="Capacity (kg)" required />
            <button type="submit" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">Save vehicle</button>
            {error && <p role="alert" className="text-sm text-red-700 sm:col-span-4">{error}</p>}
          </form>
        )}
      </section>

      {vehicles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <Truck size={26} className="mx-auto text-gray-400" />
          <p className="mt-3 font-medium text-gray-900">No vehicles in the fleet</p>
          <p className="mt-1 text-sm text-gray-500">Add a vehicle to enable dispatch.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {vehicles.map((vehicle) => (
              <button key={vehicle.id} onClick={() => setSelectedId(vehicle.id)} className={`rounded-lg border p-4 text-left transition-colors ${selected?.id === vehicle.id ? 'border-emerald-700 bg-emerald-50/60' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-950">{vehicle.id}</span>
                  <span className={`h-2 w-2 rounded-full ${vehicle.status === 'available' ? 'bg-emerald-600' : vehicle.status === 'on-trip' ? 'bg-sky-600' : vehicle.status === 'warning' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                </div>
                <p className="mt-1 text-xs text-gray-500">{vehicle.type}</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Health</span><span className="font-medium text-gray-800">{vehicle.health}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-sm bg-gray-100"><div className={`h-full rounded-sm ${vehicle.health >= 80 ? 'bg-emerald-600' : vehicle.health >= 60 ? 'bg-amber-500' : 'bg-red-600'}`} style={{ width: `${vehicle.health}%` }} /></div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.8fr]">
              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Vehicle record</p>
                    <h3 className="mt-1 text-xl font-semibold text-gray-950">{selected.id}</h3>
                    <p className="text-sm text-gray-500">{selected.type} · capacity {selected.capacityKg.toLocaleString()} kg</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className={fieldClass} aria-label={`Set ${selected.id} status`} value={selected.status} onChange={(event) => updateVehicleStatus(selected.id, event.target.value as VehicleStatus)}>
                      {statuses.map((status) => <option key={status} value={status}>{status.replace('-', ' ')}</option>)}
                    </select>
                    <button onClick={() => handleDelete(selected.id)} title="Delete vehicle" aria-label={`Delete ${selected.id}`} className="rounded-md border border-gray-300 p-2 text-gray-500 hover:border-red-300 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Speed', value: `${selected.speed} km/h`, icon: Gauge },
                    { label: 'Temperature', value: `${selected.temperature} °C`, icon: Thermometer },
                    { label: 'Fuel', value: `${selected.fuel}%`, icon: Droplet },
                    { label: 'Health', value: `${selected.health}%`, icon: Activity },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-md border border-gray-200 bg-gray-50/70 p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500"><metric.icon size={14} />{metric.label}</div>
                      <p className="mt-2 text-lg font-semibold tabular-nums text-gray-950">{metric.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Last known location</p>
                    <p className="mt-1 text-sm text-gray-900">{selected.location}</p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Assigned driver</p>
                    <p className="mt-1 text-sm text-gray-900">{drivers.find((driver) => driver.id === selected.driverId)?.name ?? 'Unassigned'}</p>
                  </div>
                </div>

                {selected.anomalies > 0 && <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><AlertCircle size={17} className="mt-0.5 shrink-0" />{selected.anomalies} sample telemetry issue{selected.anomalies === 1 ? '' : 's'} flagged for review.</div>}

                <div className="mt-5 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-gray-900">Sample telemetry window</h4><span className="text-xs text-gray-500">Illustrative values</span></div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {[{ label: 'Engine RPM', values: [74, 80, 78, 84, 76, 91, 82, 88], color: 'bg-emerald-600' }, { label: 'Vibration', values: [38, 45, 40, 54, 46, 49, 42, 44], color: 'bg-amber-500' }, { label: 'Tire pressure', values: [62, 66, 64, 70, 67, 68, 72, 70], color: 'bg-sky-600' }].map((series) => (
                      <div key={series.label}>
                        <p className="text-xs text-gray-600">{series.label}</p>
                        <div className="mt-2 flex h-20 items-end gap-1 border-b border-gray-200 pb-1">{series.values.map((value, index) => <div key={index} className={`flex-1 ${series.color}`} style={{ height: `${value}%` }} />)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Database size={15} className="text-emerald-700" /> MongoDB telemetry</h4>
                      <p className="mt-1 text-xs text-gray-500">{databaseStatus.mongo === 'connected' ? `${telemetry.length} saved snapshots for ${selected.id}` : 'MongoDB is not connected.'}</p>
                    </div>
                    <button disabled={databaseStatus.mongo !== 'connected' || recordingTelemetry} onClick={() => void recordTelemetrySnapshot()} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                      {recordingTelemetry ? 'Saving...' : 'Record current snapshot'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Stores the displayed sample reading; this demo has no physical sensor stream.</p>
                  {telemetryError && <p role="alert" className="mt-2 text-sm text-red-700">{telemetryError}</p>}
                  {telemetry.length > 0 && (
                    <div className="mt-3 max-h-52 divide-y divide-gray-100 overflow-y-auto">
                      {telemetry.slice(0, 8).map((record) => (
                        <div key={record._id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                          <span className="text-gray-700">{new Date(record.recordedAt).toLocaleString()}</span>
                          <span className="text-gray-500">{record.temperature} °C · fuel {record.fuel}% · {record.speed} km/h · health {record.health}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between"><h3 className="text-base font-semibold text-gray-950">Condition summary</h3><Battery size={18} className="text-emerald-700" /></div>
                <div className="mt-5 space-y-4">
                  {[{ label: 'Overall vehicle health', value: selected.health }, { label: 'Fuel level', value: selected.fuel }, { label: 'Capacity utilization', value: 0 }].map((metric) => (
                    <div key={metric.label}>
                      <div className="mb-1.5 flex justify-between text-sm"><span className="text-gray-600">{metric.label}</span><span className="font-medium text-gray-900">{metric.value}%</span></div>
                      <div className="h-1.5 rounded-sm bg-gray-100"><div className="h-full rounded-sm bg-emerald-700" style={{ width: `${metric.value}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fleet data store</p>
                  <p className="mt-2 text-sm text-gray-800">PostgreSQL</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Vehicle and driver records persist in the fleet database.</p>
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}