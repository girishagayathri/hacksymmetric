import React, { useEffect, useState } from 'react';
import { Calendar, Check, Clock3, MapPin, Package, Sparkles, X } from 'lucide-react';
import { useFleetData } from '../data/FleetData';

const fieldClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

type AllocationResult = {
  allocated: boolean;
  vehicleId?: string;
  driverId?: string;
  driverName?: string;
  matchScore?: number;
  reasons?: string[];
  cached?: boolean;
  method?: string;
};

export function TripRequestPanel() {
  const { trips, vehicles, drivers, aiStatus, createTrip, assignTrip, updateTripStatus, cancelTrip } = useFleetData();
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    scheduledAt: '',
    cargo: '',
    weightKg: '',
    priority: 'normal' as const,
  });
  const [suggestedTripId, setSuggestedTripId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [allocation, setAllocation] = useState<AllocationResult | null>(null);
  const [allocationLoading, setAllocationLoading] = useState(false);

  const suggestedTrip = trips.find((trip) => trip.id === suggestedTripId);
  useEffect(() => {
    if (!suggestedTrip || aiStatus !== 'connected') {
      setAllocation(null);
      setAllocationLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setAllocationLoading(true);
    fetch('/ai/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        tripId: suggestedTrip.id,
        weightKg: suggestedTrip.weightKg,
        priority: suggestedTrip.priority,
        vehicles: vehicles.map(({ id, status, health, capacityKg }) => ({ id, status, health, capacityKg })),
        drivers: drivers.map(({ id, name, status, rating, onTimeRate, currentVehicleId }) => ({ id, name, status, rating, onTimeRate, currentVehicleId })),
      }),
    }).then(async (response) => {
      if (!response.ok) throw new Error('Allocation request failed');
      return response.json() as Promise<AllocationResult>;
    }).then((result) => {
      if (active) setAllocation(result);
    }).catch(() => {
      if (active) setAllocation(null);
    }).finally(() => {
      if (active) setAllocationLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [suggestedTrip, aiStatus, vehicles, drivers]);

  const suggestedVehicle = suggestedTrip && (
    allocation?.allocated
      ? vehicles.find((vehicle) => vehicle.id === allocation.vehicleId)
      : allocation && !allocation.allocated
        ? undefined
        : vehicles.find((vehicle) => vehicle.status === 'available' && vehicle.health >= 65 && vehicle.capacityKg >= suggestedTrip.weightKg)
  );
  const suggestedDriver = suggestedTrip && (
    allocation?.allocated
      ? drivers.find((driver) => driver.id === allocation.driverId)
      : allocation && !allocation.allocated
        ? undefined
        : drivers.find((driver) => driver.status === 'available' && !driver.currentVehicleId)
  );
  const openTrips = trips.filter((trip) => ['pending', 'assigned', 'in-progress'].includes(trip.status));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trip = createTrip({ ...formData, weightKg: Number(formData.weightKg) });
    setSuggestedTripId(trip.id);
    setNotice('Request saved through the local API, with browser storage as a fallback. Review the suggested assignment below.');
    setFormData({ from: '', to: '', scheduledAt: '', cargo: '', weightKg: '', priority: 'normal' });
  }

  function handleAssign(tripId: string, vehicleId?: string, driverId?: string) {
    const assignment = assignTrip(tripId, vehicleId, driverId);
    if (!assignment) {
      setNotice('No available vehicle with enough capacity and an available driver. Update fleet availability to assign this trip.');
      return;
    }
    setNotice(`${assignment.vehicle.id} and ${assignment.driver.name} assigned.`);
    setSuggestedTripId(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Dispatch</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-950">Create trip request</h2>
          </div>
          <span className={`rounded-sm px-2.5 py-1 text-xs font-medium ${aiStatus === 'connected' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{aiStatus === 'connected' ? 'FastAPI allocation' : 'Local allocation fallback'}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 flex items-center gap-2"><MapPin size={15} /> Pickup location</span>
              <input className={fieldClass} value={formData.from} onChange={(event) => setFormData({ ...formData, from: event.target.value })} placeholder="Warehouse or address" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 flex items-center gap-2"><MapPin size={15} /> Destination</span>
              <input className={fieldClass} value={formData.to} onChange={(event) => setFormData({ ...formData, to: event.target.value })} placeholder="Customer or address" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 flex items-center gap-2"><Calendar size={15} /> Scheduled departure</span>
              <input className={fieldClass} type="datetime-local" value={formData.scheduledAt} onChange={(event) => setFormData({ ...formData, scheduledAt: event.target.value })} required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5 flex items-center gap-2"><Package size={15} /> Cargo type</span>
              <select className={fieldClass} value={formData.cargo} onChange={(event) => setFormData({ ...formData, cargo: event.target.value })} required>
                <option value="">Select cargo</option>
                <option>Electronics</option>
                <option>Machinery parts</option>
                <option>Consumer goods</option>
                <option>Perishable items</option>
                <option>Hazardous materials</option>
                <option>Other</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5">Weight (kg)</span>
              <input className={fieldClass} type="number" min="1" step="1" value={formData.weightKg} onChange={(event) => setFormData({ ...formData, weightKg: event.target.value })} placeholder="e.g. 450" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              <span className="mb-1.5">Priority</span>
              <select className={fieldClass} value={formData.priority} onChange={(event) => setFormData({ ...formData, priority: event.target.value as typeof formData.priority })}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800">
              <Sparkles size={16} /> Save and suggest assignment
            </button>
            <span className="text-xs text-gray-500">Suggestions are cached by Redis when available.</span>
          </div>
        </form>
        {notice && <p role="status" className="mt-4 border-l-2 border-emerald-600 pl-3 text-sm text-gray-700">{notice}</p>}
      </section>

      {suggestedTrip && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">{aiStatus === 'connected' ? 'FastAPI suggestion' : 'Local fallback suggestion'} · {suggestedTrip.id}</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-950">{suggestedVehicle && suggestedDriver ? `${suggestedVehicle.id} with ${suggestedDriver.name}` : 'No suitable match available'}</h3>
              <p className="mt-1 text-sm text-gray-600">{suggestedVehicle && suggestedDriver ? `${suggestedVehicle.type} · ${suggestedVehicle.capacityKg.toLocaleString()} kg capacity · ${suggestedVehicle.health}% health` : 'Check vehicle capacity, health, and driver availability in fleet management.'}</p>
              {allocationLoading && <p className="mt-2 text-xs text-gray-500">Checking the intelligence service...</p>}
              {allocation?.allocated && <p className="mt-2 text-xs text-gray-600">Match score {allocation.matchScore}/100 · {allocation.cached ? 'Redis cache hit' : 'Fresh calculation'}</p>}
              {allocation?.reasons?.map((reason) => <p key={reason} className="mt-1 text-xs text-gray-600">{reason}</p>)}
            </div>
            <Sparkles className="text-emerald-700" size={20} />
          </div>
          {suggestedVehicle && suggestedDriver && (
            <button disabled={allocationLoading} onClick={() => handleAssign(suggestedTrip.id, suggestedVehicle.id, suggestedDriver.id)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-gray-950 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60">
              <Check size={16} /> Confirm assignment
            </button>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Active requests</h2>
            <p className="mt-0.5 text-sm text-gray-500">{openTrips.length} trips requiring dispatch or monitoring</p>
          </div>
        </div>
        {openTrips.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">No active requests. Create one above to get started.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {openTrips.map((trip) => {
              const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
              const driver = drivers.find((item) => item.id === trip.driverId);
              return (
                <article key={trip.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-950">{trip.id}</span>
                      <span className="rounded-sm bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-700">{trip.priority}</span>
                      <span className="rounded-sm bg-emerald-50 px-2 py-0.5 text-xs capitalize text-emerald-800">{trip.status.replace('-', ' ')}</span>
                    </div>
                    <p className="mt-2 truncate text-sm text-gray-800">{trip.from} <span className="px-1 text-gray-400">to</span> {trip.to}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><Clock3 size={13} /> {new Date(trip.scheduledAt).toLocaleString()}</span>
                      <span>{trip.cargo} · {trip.weightKg.toLocaleString()} kg</span>
                      {vehicle && driver && <span>{vehicle.id} · {driver.name}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {trip.status === 'pending' && <button onClick={() => handleAssign(trip.id)} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">Assign</button>}
                    {trip.status === 'assigned' && <button onClick={() => updateTripStatus(trip.id, 'in-progress')} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">Start trip</button>}
                    {trip.status === 'in-progress' && <button onClick={() => updateTripStatus(trip.id, 'completed')} className="rounded-md border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">Complete</button>}
                    {trip.status === 'pending' && <button onClick={() => { cancelTrip(trip.id); setNotice(`${trip.id} cancelled.`); }} aria-label={`Cancel ${trip.id}`} title="Cancel request" className="rounded-md border border-gray-300 p-2 text-gray-500 hover:border-red-300 hover:text-red-700"><X size={16} /></button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}