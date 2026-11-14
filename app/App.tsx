import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard.tsx';
import { TripRequestPanel } from './components/TripRequestPanel.tsx';
import { VehicleMonitoring } from './components/VehicleMonitoring.tsx';
import { DriverManagement } from './components/DriverManagement.tsx';
import { AIInsights } from './components/AIInsights.tsx';
import { TripHistory } from './components/TripHistory.tsx';
import { BrainCircuit, ClipboardList, Database, History, LayoutDashboard, Menu, RotateCcw, Truck, Users, X } from 'lucide-react';
import { FleetProvider, useFleetData } from './data/FleetData';

export default function App() {
  return (
    <FleetProvider>
      <FleetDashboard />
    </FleetProvider>
  );
}

function FleetDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resetDemoData, apiStatus, databaseStatus } = useFleetData();

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'trips', label: 'Dispatch', icon: ClipboardList },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'ai-insights', label: 'Intelligence', icon: BrainCircuit },
    { id: 'history', label: 'Trip history', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f2] text-gray-950">
      <header className="border-b border-gray-800 bg-gray-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500 text-gray-950">
                <Truck size={21} strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-base font-semibold leading-tight">OkGadi Fleet</h1>
                <p className="mt-0.5 text-xs text-gray-400">Operations console</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-sm border border-gray-700 px-2.5 py-1.5 sm:flex">
                <Database size={14} className={databaseStatus.postgres === 'connected' && databaseStatus.mongo === 'connected' ? 'text-emerald-400' : 'text-amber-300'} />
                <span className="text-xs text-gray-300">
                  {apiStatus === 'offline'
                    ? 'API offline · local fallback'
                    : databaseStatus.postgres === 'connected' && databaseStatus.mongo === 'connected'
                      ? 'PostgreSQL + MongoDB connected'
                      : `Databases · PG ${databaseStatus.postgres} · Mongo ${databaseStatus.mongo}`}
                </span>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Reset vehicles, drivers, and trips to the original sample data?')) resetDemoData();
                }}
                title="Reset sample data"
                aria-label="Reset sample data"
                className="hidden rounded-md border border-gray-700 p-2 text-gray-300 transition hover:bg-gray-800 hover:text-white sm:inline-flex"
              >
                <RotateCcw size={16} />
              </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
              className="rounded-md border border-gray-700 p-2 text-gray-200 hover:bg-gray-800 md:hidden"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="Main navigation" className={`border-b border-gray-200 bg-white ${mobileMenuOpen ? 'block' : 'hidden'} md:block`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1 py-2 md:flex-row md:gap-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`
                  flex items-center gap-2 border-l-2 px-3 py-2 text-left text-sm transition-colors md:border-l-0 md:border-b-2 md:px-1 md:py-3
                  ${activeTab === tab.id
                    ? 'border-emerald-700 bg-emerald-50/60 font-medium text-emerald-900 md:bg-transparent'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 md:hover:bg-transparent md:hover:text-gray-950'
                  }
                `}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'trips' && <TripRequestPanel />}
        {activeTab === 'vehicles' && <VehicleMonitoring />}
        {activeTab === 'drivers' && <DriverManagement />}
        {activeTab === 'ai-insights' && <AIInsights />}
        {activeTab === 'history' && <TripHistory />}
      </main>
    </div>
  );
}
