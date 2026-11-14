import React, { useState } from 'react';
import { Activity, AlertTriangle, Brain, CheckCircle2, Database, Server, Sparkles, Truck, WifiOff } from 'lucide-react';
import { useFleetData } from '../data/FleetData';

const plannedModels = [
  { name: 'Vehicle health scoring', description: 'Rule-based scoring from vehicle health, temperature, fuel, and recorded issues.' },
  { name: 'Isolation Forest anomaly detector', description: 'Unsupervised outlier detection over temperature, health, fuel, and reported anomaly features.' },
  { name: 'Trip risk scoring', description: 'Deterministic risk score from vehicle condition, route distance, and priority.' },
  { name: 'Fleet allocation ranking', description: 'Rank available drivers and capacity-fit vehicles for a trip request.' },
];

export function AIInsights() {
  const { vehicles, trips, apiStatus, aiStatus, redisStatus, cacheMetrics, anomalyModel, databaseStatus } = useFleetData();
  const [analyses, setAnalyses] = useState<Record<string, { detected: boolean; modelOutlier: boolean; anomalyScore: number; signals: string[]; modelVersion: string }>>({});
  const [analyzingVehicleId, setAnalyzingVehicleId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const signals = vehicles.filter((vehicle) => vehicle.anomalies > 0 || vehicle.status === 'warning' || vehicle.status === 'maintenance');

  async function analyzeVehicle(vehicle: typeof vehicles[number]) {
    setAnalyzingVehicleId(vehicle.id);
    setAnalysisError('');
    try {
      const response = await fetch('/ai/detect/anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          health: vehicle.health,
          fuel: vehicle.fuel,
          temperature: vehicle.temperature,
          anomalies: vehicle.anomalies,
        }),
      });
      if (!response.ok) throw new Error('Model analysis failed');
      const result = await response.json();
      setAnalyses((current) => ({ ...current, [vehicle.id]: result }));
    } catch {
      setAnalysisError(`Could not analyze ${vehicle.id}. Check that the intelligence service is running.`);
    } finally {
      setAnalyzingVehicleId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-gray-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-emerald-500/15 p-2.5 text-emerald-300"><Brain size={22} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Intelligence layer</p>
              <h2 className="mt-1 text-xl font-semibold">AI / ML service status</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-300">Anomaly detection uses a trained Isolation Forest on a synthetic baseline. Other scoring remains deterministic; train on representative fleet telemetry before operational use.</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs ${aiStatus === 'connected' && redisStatus === 'connected' ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/30 bg-amber-300/10 text-amber-200'}`}>
            {aiStatus === 'connected' && redisStatus === 'connected' ? <CheckCircle2 size={13} /> : <WifiOff size={13} />}
            {aiStatus === 'connected' ? `FastAPI active · Redis ${redisStatus}` : `FastAPI ${aiStatus}`}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Anomaly model', value: anomalyModel?.algorithm ?? 'Loading model', icon: Brain },
          { label: 'Redis cache hit rate', value: `${cacheMetrics.hitRate}%`, icon: Database },
          { label: 'Fleet / trip records', value: `${vehicles.length} / ${trips.length}`, icon: Truck },
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-600"><item.icon size={16} className="text-emerald-700" />{item.label}</div>
            <p className="mt-2 text-lg font-semibold text-gray-950">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-base font-semibold text-gray-950">Trained anomaly model</h3><p className="mt-1 text-sm text-gray-500">{anomalyModel ? `${anomalyModel.version} · ${anomalyModel.trainingRows.toLocaleString()} training rows · ${anomalyModel.trainingSource}` : 'Waiting for model service metadata.'}</p></div>
          <Activity size={18} className="text-sky-700" />
        </div>
        <div className="mt-4 divide-y divide-gray-100">
          {plannedModels.map((model) => (
            <div key={model.name} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div><p className="text-sm font-medium text-gray-900">{model.name}</p><p className="mt-1 text-sm text-gray-500">{model.description}</p></div>
              <span className={`rounded-sm px-2 py-1 text-xs font-medium ${aiStatus === 'connected' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{aiStatus === 'connected' ? (model.name.includes('Isolation') ? `${anomalyModel?.version ?? 'Trained model'}` : 'Active · rules') : 'Service offline'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h3 className="text-base font-semibold text-gray-950">Fleet signals</h3>
          <p className="mt-1 text-sm text-gray-500">Sample conditions from local vehicle records, not ML predictions.</p>
        </div>
        {signals.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 size={16} /> No sample fleet issues are currently flagged.</div>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {analysisError && <p role="alert" className="py-3 text-sm text-red-700">{analysisError}</p>}
            {signals.map((vehicle) => (
              <article key={vehicle.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex gap-3"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="text-sm font-medium text-gray-900">{vehicle.id} · {vehicle.status}</p><p className="mt-1 text-sm text-gray-600">{vehicle.anomalies} sample flagged item{vehicle.anomalies === 1 ? '' : 's'} · health {vehicle.health}% · temperature {vehicle.temperature} °C</p></div></div>
                  {analyses[vehicle.id] && (
                    <div className="ml-8 mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">Isolation Forest: {analyses[vehicle.id].modelOutlier ? 'outlier detected' : 'within baseline'} · score {analyses[vehicle.id].anomalyScore}/100</p>
                      <p className="mt-1 text-xs text-gray-500">{analyses[vehicle.id].modelVersion}</p>
                      {analyses[vehicle.id].signals.map((signal) => <p key={signal} className="mt-1 text-xs text-gray-600">{signal}</p>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Needs operator review</span>
                  <button disabled={aiStatus !== 'connected' || analyzingVehicleId === vehicle.id} onClick={() => void analyzeVehicle(vehicle)} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">{analyzingVehicleId === vehicle.id ? 'Analyzing...' : 'Analyze telemetry'}</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div><h3 className="text-base font-semibold text-gray-950">Architecture connections</h3><p className="mt-1 text-sm text-gray-500">Current runnable mode compared with the proposed production stack.</p></div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { title: 'Web dashboard', detail: 'React + Vite', status: 'Running in browser', icon: Activity, ready: true },
            { title: 'Fleet persistence', detail: databaseStatus.postgres === 'connected' ? 'PostgreSQL via Node.js API' : 'Browser / SQLite fallback', status: databaseStatus.postgres === 'connected' ? 'Connected' : 'Offline fallback', icon: Database, ready: databaseStatus.postgres === 'connected' },
            { title: 'Telemetry store', detail: `MongoDB vehicle_telemetry · ${databaseStatus.telemetryCount} records`, status: databaseStatus.mongo, icon: Database, ready: databaseStatus.mongo === 'connected' },
            { title: 'Backend API', detail: 'Node.js / Express', status: apiStatus === 'connected' ? 'Connected' : apiStatus === 'connecting' ? 'Connecting' : 'Offline', icon: Server, ready: apiStatus === 'connected' },
            { title: 'Intelligence API', detail: 'Python FastAPI · Isolation Forest + rules', status: aiStatus === 'connected' ? 'Connected' : aiStatus === 'connecting' ? 'Connecting' : 'Offline', icon: Brain, ready: aiStatus === 'connected' },
            { title: 'Redis cache', detail: 'Prediction cache · 60 second TTL', status: redisStatus === 'connected' ? `${cacheMetrics.hits} hits · ${cacheMetrics.misses} misses` : redisStatus, icon: Database, ready: redisStatus === 'connected' },
          ].map((layer) => (
            <div key={layer.title} className="flex items-start justify-between gap-3 rounded-md border border-gray-200 p-4">
              <div className="flex gap-3"><layer.icon size={17} className={layer.ready ? 'mt-0.5 text-emerald-700' : 'mt-0.5 text-gray-400'} /><div><p className="text-sm font-medium text-gray-900">{layer.title}</p><p className="mt-1 text-xs text-gray-500">{layer.detail}</p></div></div>
              <span className={`shrink-0 text-xs ${layer.ready ? 'text-emerald-800' : 'text-gray-500'}`}>{layer.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}