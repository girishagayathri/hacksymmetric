import React, { useMemo, useState } from 'react';
import { CalendarDays, Download, MapPin, Search } from 'lucide-react';
import { useFleetData } from '../data/FleetData';

export function TripHistory() {
  const { trips, vehicles, drivers } = useFleetData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const filteredTrips = useMemo(() => trips.filter((trip) => {
    const vehicle = vehicles.find((item) => item.id === trip.vehicleId);
    const driver = drivers.find((item) => item.id === trip.driverId);
    const search = searchQuery.trim().toLowerCase();
    const matchesSearch = !search || [trip.id, trip.from, trip.to, trip.cargo, vehicle?.id, driver?.name].some((value) => value?.toLowerCase().includes(search));
    const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
    const ageDays = (Date.now() - new Date(trip.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    const matchesDate = dateRange === 'all' || (dateRange === 'today' ? ageDays < 1 : ageDays < Number(dateRange));
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [trips, vehicles, drivers, searchQuery, filterStatus, dateRange]);

  const completed = trips.filter((trip) => trip.status === 'completed').length;
  const active = trips.filter((trip) => ['assigned', 'in-progress'].includes(trip.status)).length;
  const pending = trips.filter((trip) => trip.status === 'pending').length;

  function exportCsv() {
    const header = ['Trip ID', 'Pickup', 'Destination', 'Scheduled', 'Cargo', 'Weight kg', 'Priority', 'Status', 'Vehicle', 'Driver'];
    const rows = filteredTrips.map((trip) => [
      trip.id,
      trip.from,
      trip.to,
      new Date(trip.scheduledAt).toISOString(),
      trip.cargo,
      String(trip.weightKg),
      trip.priority,
      trip.status,
      vehicles.find((vehicle) => vehicle.id === trip.vehicleId)?.id ?? '',
      drivers.find((driver) => driver.id === trip.driverId)?.name ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fleet-trips.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    { label: 'Total trips', value: trips.length, note: 'Saved records' },
    { label: 'Completed', value: completed, note: 'Closed trips' },
    { label: 'In progress', value: active, note: 'Assigned or underway' },
    { label: 'Awaiting dispatch', value: pending, note: 'Pending assignment' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Operations records</p>
        <h2 className="mt-1 text-xl font-semibold text-gray-950">Trip history</h2>
        <p className="mt-1 text-sm text-gray-500">Trip records sync to the local API and SQLite database; browser storage is the fallback.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => <article key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"><p className="text-sm text-gray-600">{stat.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-gray-950">{stat.value}</p><p className="mt-1 text-xs text-gray-500">{stat.note}</p></article>)}
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_170px_auto]">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search trip, route, vehicle, driver..." className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <select aria-label="Filter by status" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800">
            <option value="all">All statuses</option><option value="pending">Pending</option><option value="assigned">Assigned</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
          <select aria-label="Filter by creation date" value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800">
            <option value="all">Any date</option><option value="today">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select>
          <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"><Download size={16} /> Export CSV</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-950">Trip records</h3>
          <span className="text-xs text-gray-500">{filteredTrips.length} shown</span>
        </div>
        {filteredTrips.length === 0 ? (
          <div className="px-6 py-14 text-center"><CalendarDays size={23} className="mx-auto text-gray-400" /><p className="mt-3 text-sm font-medium text-gray-900">No matching trips</p><p className="mt-1 text-sm text-gray-500">Try another search or date range.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Trip</th><th className="px-5 py-3">Vehicle / Driver</th><th className="px-5 py-3">Route</th><th className="px-5 py-3">Scheduled</th><th className="px-5 py-3">Cargo</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-gray-50/70">
                    <td className="px-5 py-4"><p className="text-sm font-semibold text-gray-900">{trip.id}</p><p className="mt-1 text-xs capitalize text-gray-500">{trip.priority} priority</p></td>
                    <td className="px-5 py-4 text-sm"><p className="text-gray-900">{vehicles.find((vehicle) => vehicle.id === trip.vehicleId)?.id ?? 'Unassigned'}</p><p className="mt-1 text-xs text-gray-500">{drivers.find((driver) => driver.id === trip.driverId)?.name ?? 'No driver'}</p></td>
                    <td className="max-w-[260px] px-5 py-4 text-sm"><p className="flex items-start gap-1.5 text-gray-800"><MapPin size={14} className="mt-0.5 shrink-0 text-emerald-700" /><span className="truncate">{trip.from}</span></p><p className="mt-1 flex items-start gap-1.5 text-gray-500"><MapPin size={14} className="mt-0.5 shrink-0 text-red-600" /><span className="truncate">{trip.to}</span></p></td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">{new Date(trip.scheduledAt).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm"><p className="text-gray-900">{trip.cargo}</p><p className="mt-1 text-xs text-gray-500">{trip.weightKg.toLocaleString()} kg</p></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-sm px-2 py-1 text-xs capitalize ${trip.status === 'completed' ? 'bg-emerald-50 text-emerald-800' : trip.status === 'in-progress' ? 'bg-sky-50 text-sky-800' : trip.status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>{trip.status.replace('-', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}