import React, { useState } from 'react';
import { Award, MapPin, Plus, Star, Trash2, UserRound, X } from 'lucide-react';
import { DriverStatus, useFleetData } from '../data/FleetData';

const driverStatuses: DriverStatus[] = ['available', 'on-trip', 'break', 'off-duty'];
const fieldClass = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100';

export function DriverManagement() {
  const { drivers, vehicles, trips, createDriver, updateDriverStatus, deleteDriver } = useFleetData();
  const [selectedId, setSelectedId] = useState('DRV-001');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('Local Routes');
  const [error, setError] = useState('');
  const selected = drivers.find((driver) => driver.id === selectedId) ?? drivers[0];

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (drivers.some((driver) => driver.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A driver with that name already exists.');
      return;
    }
    createDriver({ name: name.trim(), specialty });
    setName('');
    setError('');
    setShowForm(false);
  }

  function handleDelete(driverId: string) {
    deleteDriver(driverId);
    if (selectedId === driverId) setSelectedId(drivers.find((driver) => driver.id !== driverId)?.id ?? '');
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">People & assignments</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-950">Driver management</h2>
            <p className="mt-1 text-sm text-gray-500">{drivers.length} driver records · availability affects trip assignment.</p>
          </div>
          <button onClick={() => setShowForm((open) => !open)} className="inline-flex items-center gap-2 rounded-md bg-gray-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-gray-800">
            {showForm ? <X size={16} /> : <Plus size={16} />}{showForm ? 'Close' : 'Add driver'}
          </button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-5 sm:grid-cols-[1fr_1fr_auto]">
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Driver full name" aria-label="Driver name" required />
            <select className={fieldClass} value={specialty} onChange={(event) => setSpecialty(event.target.value)} aria-label="Driver specialty">
              <option>Local Routes</option><option>Heavy Freight</option><option>Express Delivery</option><option>Long Distance</option><option>Refrigerated Cargo</option>
            </select>
            <button type="submit" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">Save driver</button>
            {error && <p role="alert" className="text-sm text-red-700 sm:col-span-3">{error}</p>}
          </form>
        )}
      </section>

      {drivers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <UserRound size={26} className="mx-auto text-gray-400" />
          <p className="mt-3 font-medium text-gray-900">No driver records</p>
          <p className="mt-1 text-sm text-gray-500">Add a driver to enable trip assignment.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {drivers.map((driver) => (
              <button key={driver.id} onClick={() => setSelectedId(driver.id)} className={`rounded-lg border p-4 text-left transition-colors ${selected?.id === driver.id ? 'border-sky-700 bg-sky-50/60' : 'border-gray-200 bg-white hover:border-gray-400'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-800"><UserRound size={18} /></div>
                  <span className={`rounded-sm px-2 py-1 text-xs capitalize ${driver.status === 'available' ? 'bg-emerald-50 text-emerald-800' : driver.status === 'on-trip' ? 'bg-sky-50 text-sky-800' : 'bg-gray-100 text-gray-600'}`}>{driver.status.replace('-', ' ')}</span>
                </div>
                <h3 className="mt-3 font-semibold text-gray-950">{driver.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{driver.id} · {driver.specialty}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-gray-600"><Star size={13} className="fill-amber-400 text-amber-500" />{driver.rating.toFixed(1)} <span className="text-gray-400">·</span> {driver.trips} completed trips</div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.8fr]">
              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 text-sky-800"><UserRound size={22} /></div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Driver record · {selected.id}</p>
                      <h3 className="mt-1 text-xl font-semibold text-gray-950">{selected.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className={fieldClass} aria-label={`Set ${selected.name} status`} value={selected.status} onChange={(event) => updateDriverStatus(selected.id, event.target.value as DriverStatus)}>
                      {driverStatuses.map((status) => <option key={status} value={status}>{status.replace('-', ' ')}</option>)}
                    </select>
                    <button onClick={() => handleDelete(selected.id)} title="Delete driver" aria-label={`Delete ${selected.name}`} className="rounded-md border border-gray-300 p-2 text-gray-500 hover:border-red-300 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[{ label: 'Experience', value: selected.experience }, { label: 'Specialty', value: selected.specialty }, { label: 'On-time rate', value: `${selected.onTimeRate}%` }, { label: 'Completed trips', value: String(selected.trips) }].map((metric) => (
                    <div key={metric.label} className="rounded-md border border-gray-200 bg-gray-50/70 p-3">
                      <p className="text-xs text-gray-500">{metric.label}</p><p className="mt-1.5 text-sm font-semibold text-gray-950">{metric.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-gray-50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current vehicle</p><p className="mt-1 text-sm text-gray-900">{selected.currentVehicleId ?? 'Unassigned'}</p></div>
                  <div className="rounded-md bg-gray-50 p-4"><p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500"><MapPin size={13} />Last known location</p><p className="mt-1 text-sm text-gray-900">{selected.location}</p></div>
                </div>

                <div className="mt-5 border-t border-gray-100 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900">Recent assigned trips</h4>
                  <div className="mt-3 divide-y divide-gray-100">
                    {trips.filter((trip) => trip.driverId === selected.id).slice(0, 4).map((trip) => (
                      <div key={trip.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                        <div><p className="font-medium text-gray-900">{trip.id} · {trip.from} to {trip.to}</p><p className="mt-0.5 text-xs text-gray-500">{trip.cargo} · {new Date(trip.scheduledAt).toLocaleDateString()}</p></div>
                        <span className="text-xs capitalize text-gray-600">{trip.status.replace('-', ' ')}</span>
                      </div>
                    ))}
                    {!trips.some((trip) => trip.driverId === selected.id) && <p className="py-3 text-sm text-gray-500">No trip history for this driver yet.</p>}
                  </div>
                </div>
              </section>

              <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center gap-2"><Award size={18} className="text-amber-700" /><h3 className="text-base font-semibold text-gray-950">Performance snapshot</h3></div>
                <div className="mt-5 space-y-4">
                  {[{ label: 'On-time delivery', value: selected.onTimeRate }, { label: 'Customer rating', value: selected.rating * 20 }, { label: 'Fleet assignment', value: selected.currentVehicleId ? 100 : 0 }].map((metric) => (
                    <div key={metric.label}>
                      <div className="mb-1.5 flex justify-between text-sm"><span className="text-gray-600">{metric.label}</span><span className="font-medium text-gray-900">{metric.value}%</span></div>
                      <div className="h-1.5 rounded-sm bg-gray-100"><div className="h-full rounded-sm bg-sky-700" style={{ width: `${metric.value}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assignment eligibility</p>
                  <p className="mt-2 text-sm text-gray-800">{selected.status === 'available' && !selected.currentVehicleId ? 'Available for a new trip.' : 'Not currently available for dispatch.'}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Availability changes sync to the API and immediately affect trip suggestions.</p>
                </div>
                <p className="mt-5 border-t border-gray-100 pt-4 text-xs text-gray-500">Performance values are seeded demo records, not production analytics.</p>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}