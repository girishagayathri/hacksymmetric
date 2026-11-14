import React from 'react';
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Database, Server, Sparkles, Truck, Users } from 'lucide-react';
import { useFleetData } from '../data/FleetData';

export function Dashboard() {
  const { vehicles, drivers, trips, apiStatus, aiStatus, redisStatus, databaseStatus } = useFleetData();
  const apiLabel = apiStatus === 'connected' ? 'Connected' : apiStatus === 'connecting' ? 'Connecting' : 'Offline · local fallback';
  const aiLabel = aiStatus === 'connected' ? 'Connected · model + rules' : aiStatus === 'connecting' ? 'Connecting' : 'Offline';
  const redisLabel = redisStatus === 'connected' ? 'Connected' : redisStatus === 'connecting' ? 'Connecting' : 'Offline';
  const pendingTrips = trips.filter((trip) => trip.status === 'pending').length;
  const alerts = vehicles.filter((vehicle) => vehicle.anomalies > 0 || vehicle.status === 'warning' || vehicle.status === 'maintenance');
  const onTrip = vehicles.filter((vehicle) => vehicle.status === 'on-trip').length;
  const available = vehicles.filter((vehicle) => vehicle.status === 'available').length;
  const maintenance = vehicles.filter((vehicle) => vehicle.status === 'maintenance').length;
  const offline = vehicles.filter((vehicle) => vehicle.status === 'offline').length;
  const vehicleTotal = vehicles.length || 1;

  const stats = [
    { label: 'Vehicles on trip', value: onTrip, note: `${vehicles.length} vehicles in fleet`, icon: Truck, tone: 'emerald' },
    { label: 'Drivers available', value: drivers.filter((driver) => driver.status === 'available').length, note: `${drivers.filter((driver) => driver.status === 'on-trip').length} currently driving`, icon: Users, tone: 'blue' },
    { label: 'Pending requests', value: pendingTrips, note: `${trips.length} total trip records`, icon: Activity, tone: 'amber' },
    { label: 'Fleet alerts', value: alerts.length, note: 'Vehicles need attention', icon: AlertTriangle, tone: 'red' },
  ];

  const allocation = [
    { label: 'On trip', count: onTrip, color: 'bg-emerald-600' },
    { label: 'Available', count: available, color: 'bg-sky-600' },
    { label: 'Maintenance', count: maintenance, color: 'bg-amber-500' },
    { label: 'Offline', count: offline, color: 'bg-gray-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Operations snapshot</p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-950">Fleet overview</h2>
          <p className="mt-1 text-sm text-gray-500">Current activity across vehicles, drivers, and dispatch.</p>
        </div>
        <span className="rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">Local demo data</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <stat.icon size={18} className={stat.tone === 'emerald' ? 'text-emerald-700' : stat.tone === 'blue' ? 'text-sky-700' : stat.tone === 'amber' ? 'text-amber-700' : 'text-red-700'} />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-gray-950">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-500">{stat.note}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-950">Vehicle availability</h3>
              <p className="mt-1 text-sm text-gray-500">Fleet and trip records are stored in PostgreSQL.</p>
            </div>
            <Truck className="text-emerald-700" size={19} />
          </div>
          <div className="mt-6 space-y-4">
            {allocation.map((item) => {
              const percentage = Math.round((item.count / vehicleTotal) * 100);
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="tabular-nums text-gray-600">{item.count} <span className="text-gray-400">/ {vehicles.length}</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-sm bg-gray-100">
                    <div className={`h-full ${item.color} transition-[width] duration-500`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-700"><Sparkles size={16} className="text-emerald-700" /> Allocation suggestion</div>
            <span className="text-sm font-medium text-gray-900">Capacity + availability rules</span>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-950">Service connections</h3>
              <p className="mt-1 text-sm text-gray-500">Live connection status from the local services.</p>
            </div>
            <Server className="text-sky-700" size={19} />
          </div>
          <div className="mt-5 divide-y divide-gray-100">
            <div className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-sm text-gray-700"><Database size={15} className="text-gray-400" /> Browser storage fallback</span>
              <span className="text-xs font-medium text-gray-500">Available offline</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-sm text-gray-700"><Server size={15} className="text-gray-400" /> Backend API</span>
              <span className={`text-xs font-medium ${apiStatus === 'connected' ? 'text-emerald-800' : 'text-amber-800'}`}>{apiLabel}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-sm text-gray-700"><Database size={15} className="text-gray-400" /> PostgreSQL fleet data</span>
              <span className={`text-xs font-medium ${databaseStatus.postgres === 'connected' ? 'text-emerald-800' : 'text-amber-800'}`}>{databaseStatus.postgres}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-sm text-gray-700"><Database size={15} className="text-gray-400" /> MongoDB telemetry</span>
              <span className={`text-xs font-medium ${databaseStatus.mongo === 'connected' ? 'text-emerald-800' : 'text-amber-800'}`}>{databaseStatus.mongo} · {databaseStatus.telemetryCount} records</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-sm text-gray-700"><Sparkles size={15} className="text-gray-400" /> Python FastAPI</span>
              <span className={`text-xs font-medium ${aiStatus === 'connected' ? 'text-emerald-800' : 'text-amber-800'}`}>{aiLabel}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-sm text-gray-700"><Database size={15} className="text-gray-400" /> Redis telemetry cache</span>
              <span className={`text-xs font-medium ${redisStatus === 'connected' ? 'text-emerald-800' : 'text-amber-800'}`}>{redisLabel}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-base font-semibold text-gray-950">Fleet attention</h3>
            <p className="mt-1 text-sm text-gray-500">Derived from the sample vehicle telemetry.</p>
          </div>
          <ArrowUpRight size={18} className="text-gray-400" />
        </div>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 px-6 py-6 text-sm text-emerald-800"><CheckCircle2 size={17} /> No vehicles currently need attention.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {alerts.map((vehicle) => (
              <div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={17} className={vehicle.status === 'maintenance' ? 'mt-0.5 text-amber-700' : 'mt-0.5 text-red-700'} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{vehicle.id} · {vehicle.status === 'maintenance' ? 'Maintenance required' : 'Telemetry anomaly detected'}</p>
                    <p className="mt-1 text-sm text-gray-500">{vehicle.anomalies} flagged item{vehicle.anomalies === 1 ? '' : 's'} · health {vehicle.health}% · {vehicle.location}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{vehicle.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}