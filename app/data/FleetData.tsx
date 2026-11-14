import React, { createContext, useContext, useEffect, useState } from 'react';

export type VehicleStatus = 'on-trip' | 'available' | 'warning' | 'maintenance' | 'offline';
export type DriverStatus = 'on-trip' | 'available' | 'break' | 'off-duty';
export type TripStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export type Vehicle = {
  id: string;
  type: string;
  status: VehicleStatus;
  health: number;
  location: string;
  driverId: string | null;
  fuel: number;
  temperature: number;
  speed: number;
  anomalies: number;
  capacityKg: number;
};

export type Driver = {
  id: string;
  name: string;
  status: DriverStatus;
  rating: number;
  trips: number;
  onTimeRate: number;
  currentVehicleId: string | null;
  location: string;
  experience: string;
  specialty: string;
};

export type Trip = {
  id: string;
  from: string;
  to: string;
  scheduledAt: string;
  cargo: string;
  weightKg: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: TripStatus;
  vehicleId: string | null;
  driverId: string | null;
  createdAt: string;
};

type FleetState = { vehicles: Vehicle[]; drivers: Driver[]; trips: Trip[] };
type NewTrip = Pick<Trip, 'from' | 'to' | 'scheduledAt' | 'cargo' | 'weightKg' | 'priority'>;
type NewVehicle = Pick<Vehicle, 'id' | 'type' | 'capacityKg'>;
type NewDriver = Pick<Driver, 'name' | 'specialty'>;
type ApiStatus = 'connecting' | 'connected' | 'offline';
type ServiceStatus = 'connecting' | 'connected' | 'offline';
type CacheMetrics = { hits: number; misses: number; hitRate: number };
type AnomalyModelInfo = { status: string; algorithm: string; version: string; trainingRows: number; trainingSource: string };
type DatabaseStatus = { postgres: ServiceStatus; mongo: ServiceStatus; telemetryCount: number };

type FleetContextValue = FleetState & {
  apiStatus: ApiStatus;
  aiStatus: ServiceStatus;
  redisStatus: ServiceStatus;
  cacheMetrics: CacheMetrics;
  anomalyModel: AnomalyModelInfo | null;
  databaseStatus: DatabaseStatus;
  createTrip: (trip: NewTrip) => Trip;
  assignTrip: (tripId: string, vehicleId?: string, driverId?: string) => { vehicle: Vehicle; driver: Driver } | null;
  updateTripStatus: (tripId: string, status: TripStatus) => void;
  cancelTrip: (tripId: string) => void;
  createVehicle: (vehicle: NewVehicle) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  deleteVehicle: (vehicleId: string) => void;
  createDriver: (driver: NewDriver) => void;
  updateDriverStatus: (driverId: string, status: DriverStatus) => void;
  deleteDriver: (driverId: string) => void;
  resetDemoData: () => void;
};

const STORAGE_KEY = 'okgadi-fleet-data-v1';

function createSeedData(): FleetState {
  const now = new Date();
  const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  const daysAgo = (days: number, hours: number) => new Date(now.getTime() - (days * 24 + hours) * 60 * 60 * 1000).toISOString();

  const vehicles: Vehicle[] = [
    { id: 'VH-2301', type: 'Heavy Truck', status: 'on-trip', health: 94, location: 'N1 Highway, 23 km from destination', driverId: 'DRV-001', fuel: 78, temperature: 87, speed: 65, anomalies: 0, capacityKg: 12000 },
    { id: 'VH-1892', type: 'Medium Van', status: 'on-trip', health: 89, location: 'Downtown, Sector B', driverId: 'DRV-002', fuel: 45, temperature: 92, speed: 35, anomalies: 0, capacityKg: 3500 },
    { id: 'VH-4521', type: 'Light Truck', status: 'warning', health: 72, location: 'Service Station, Main Road', driverId: 'DRV-003', fuel: 23, temperature: 105, speed: 0, anomalies: 2, capacityKg: 5000 },
    { id: 'VH-3344', type: 'Heavy Truck', status: 'maintenance', health: 68, location: 'Maintenance Bay 3', driverId: null, fuel: 55, temperature: 72, speed: 0, anomalies: 1, capacityKg: 12000 },
    { id: 'VH-8110', type: 'Medium Van', status: 'available', health: 98, location: 'Central Depot', driverId: null, fuel: 92, temperature: 76, speed: 0, anomalies: 0, capacityKg: 3500 },
  ];

  const drivers: Driver[] = [
    { id: 'DRV-001', name: 'John Smith', status: 'on-trip', rating: 4.8, trips: 342, onTimeRate: 98, currentVehicleId: 'VH-2301', location: 'N1 Highway, En Route', experience: '5 years', specialty: 'Heavy Freight' },
    { id: 'DRV-002', name: 'Sarah Johnson', status: 'on-trip', rating: 4.9, trips: 456, onTimeRate: 99, currentVehicleId: 'VH-1892', location: 'Downtown, Sector B', experience: '7 years', specialty: 'Express Delivery' },
    { id: 'DRV-003', name: 'Mike Chen', status: 'break', rating: 4.7, trips: 298, onTimeRate: 96, currentVehicleId: 'VH-4521', location: 'Service Station', experience: '4 years', specialty: 'Local Routes' },
    { id: 'DRV-004', name: 'Emily Rodriguez', status: 'available', rating: 4.9, trips: 521, onTimeRate: 99, currentVehicleId: null, location: 'Central Depot', experience: '8 years', specialty: 'Long Distance' },
  ];

  const trips: Trip[] = [
    { id: 'TRP-2401', from: 'Warehouse A, Industrial Area', to: 'Distribution Center B, East Zone', scheduledAt: daysAgo(0, 3), cargo: 'Electronics', weightKg: 450, priority: 'high', status: 'in-progress', vehicleId: 'VH-2301', driverId: 'DRV-001', createdAt: daysAgo(0, 5) },
    { id: 'TRP-2402', from: 'Factory C, West District', to: 'Port Terminal D', scheduledAt: daysAgo(0, 1), cargo: 'Machinery Parts', weightKg: 820, priority: 'normal', status: 'in-progress', vehicleId: 'VH-1892', driverId: 'DRV-002', createdAt: daysAgo(0, 4) },
    { id: 'TRP-2398', from: 'Storage Unit E', to: 'Retail Hub F', scheduledAt: daysAgo(1, 2), cargo: 'Consumer Goods', weightKg: 320, priority: 'low', status: 'completed', vehicleId: 'VH-4521', driverId: 'DRV-003', createdAt: daysAgo(1, 4) },
    { id: 'TRP-2397', from: 'Depot G', to: 'Customer H', scheduledAt: daysAgo(2, 1), cargo: 'Perishable Items', weightKg: 280, priority: 'normal', status: 'completed', vehicleId: 'VH-2301', driverId: 'DRV-001', createdAt: daysAgo(2, 3) },
  ];

  return { vehicles, drivers, trips };
}

function readInitialState(): FleetState {
  if (typeof window === 'undefined') return createSeedData();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FleetState;
      if (Array.isArray(parsed.vehicles) && Array.isArray(parsed.drivers) && Array.isArray(parsed.trips)) return parsed;
    }
  } catch {
    return createSeedData();
  }
  return createSeedData();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function isFleetState(value: unknown): value is FleetState {
  if (!value || typeof value !== 'object') return false;
  const fleet = value as Partial<FleetState>;
  return Array.isArray(fleet.vehicles) && Array.isArray(fleet.drivers) && Array.isArray(fleet.trips);
}

const FleetContext = createContext<FleetContextValue | null>(null);

export function FleetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FleetState>(readInitialState);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('connecting');
  const [apiReady, setApiReady] = useState(false);
  const [aiStatus, setAiStatus] = useState<ServiceStatus>('connecting');
  const [redisStatus, setRedisStatus] = useState<ServiceStatus>('connecting');
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics>({ hits: 0, misses: 0, hitRate: 0 });
  const [anomalyModel, setAnomalyModel] = useState<AnomalyModelInfo | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>({ postgres: 'connecting', mongo: 'connecting', telemetryCount: 0 });

  useEffect(() => {
    let active = true;

    async function checkDatabases() {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        if (!response.ok) throw new Error('Backend health check failed');
        const health = await response.json() as { postgres?: string; mongo?: string; telemetryCount?: number };
        if (active) {
          setDatabaseStatus({
            postgres: health.postgres === 'connected' ? 'connected' : 'offline',
            mongo: health.mongo === 'connected' ? 'connected' : 'offline',
            telemetryCount: health.telemetryCount ?? 0,
          });
        }
      } catch {
        if (active) setDatabaseStatus({ postgres: 'offline', mongo: 'offline', telemetryCount: 0 });
      }
    }

    void checkDatabases();
    const intervalId = window.setInterval(checkDatabases, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The app remains usable when browser storage is disabled or full.
    }
  }, [state]);

  useEffect(() => {
    let active = true;

    async function connectToApi() {
      try {
        const response = await fetch('/api/fleet');
        if (!response.ok) throw new Error('Fleet API unavailable');
        const result = await response.json() as { initialized?: boolean; data?: unknown };

        if (result.initialized && isFleetState(result.data)) {
          setState(result.data);
        } else {
          const seedResponse = await fetch('/api/fleet', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
          });
          if (!seedResponse.ok) throw new Error('Unable to initialize fleet API');
        }

        if (active) {
          setApiStatus('connected');
          setApiReady(true);
        }
      } catch {
        if (active) {
          setApiStatus('offline');
          setApiReady(true);
        }
      }
    }

    void connectToApi();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!apiReady) return;
    let active = true;

    fetch('/api/fleet', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).then((response) => {
      if (!response.ok) throw new Error('Fleet API write failed');
      if (active) setApiStatus('connected');
    }).catch(() => {
      if (active) setApiStatus('offline');
    });

    return () => { active = false; };
  }, [state, apiReady]);

  useEffect(() => {
    let active = true;

    async function checkIntelligence() {
      try {
        const response = await fetch('/ai/health', { cache: 'no-store' });
        if (!response.ok) throw new Error('Intelligence service unavailable');
        const health = await response.json() as { redis?: string; cache?: CacheMetrics; anomalyModel?: AnomalyModelInfo };
        if (!active) return;
        setAiStatus('connected');
        setRedisStatus(health.redis === 'connected' ? 'connected' : 'offline');
        if (health.cache) setCacheMetrics(health.cache);
        if (health.anomalyModel) setAnomalyModel(health.anomalyModel);
      } catch {
        if (active) {
          setAiStatus('offline');
          setRedisStatus('offline');
          setAnomalyModel(null);
        }
      }
    }

    void checkIntelligence();
    const intervalId = window.setInterval(checkIntelligence, 15000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const value: FleetContextValue = {
    ...state,
    apiStatus,
    aiStatus,
    redisStatus,
    cacheMetrics,
    anomalyModel,
    databaseStatus,
    createTrip: (input) => {
      const trip: Trip = { ...input, id: createId('TRP'), status: 'pending', vehicleId: null, driverId: null, createdAt: new Date().toISOString() };
      setState((current) => ({ ...current, trips: [trip, ...current.trips] }));
      return trip;
    },
    assignTrip: (tripId, vehicleId, driverId) => {
      const trip = state.trips.find((item) => item.id === tripId);
      if (!trip) return null;
      const availableVehicles = state.vehicles.filter((item) => item.status === 'available' && item.health >= 65 && item.capacityKg >= trip.weightKg);
      const availableDrivers = state.drivers.filter((item) => item.status === 'available' && !item.currentVehicleId);
      const vehicle = vehicleId ? availableVehicles.find((item) => item.id === vehicleId) : availableVehicles[0];
      const driver = driverId ? availableDrivers.find((item) => item.id === driverId) : availableDrivers[0];
      if (!vehicle || !driver) return null;

      setState((current) => ({
        ...current,
        vehicles: current.vehicles.map((item) => item.id === vehicle.id ? { ...item, status: 'on-trip', driverId: driver.id } : item),
        drivers: current.drivers.map((item) => item.id === driver.id ? { ...item, status: 'on-trip', currentVehicleId: vehicle.id } : item),
        trips: current.trips.map((item) => item.id === tripId ? { ...item, status: 'assigned', vehicleId: vehicle.id, driverId: driver.id } : item),
      }));
      return { vehicle, driver };
    },
    updateTripStatus: (tripId, status) => {
      const trip = state.trips.find((item) => item.id === tripId);
      setState((current) => ({
        ...current,
        trips: current.trips.map((item) => item.id === tripId ? { ...item, status } : item),
        vehicles: status === 'completed' && trip?.vehicleId ? current.vehicles.map((item) => item.id === trip.vehicleId ? { ...item, status: 'available', driverId: null, speed: 0 } : item) : current.vehicles,
        drivers: status === 'completed' && trip?.driverId ? current.drivers.map((item) => item.id === trip.driverId ? { ...item, status: 'available', currentVehicleId: null, trips: item.trips + 1 } : item) : current.drivers,
      }));
    },
    cancelTrip: (tripId) => setState((current) => ({ ...current, trips: current.trips.map((item) => item.id === tripId && item.status === 'pending' ? { ...item, status: 'cancelled' } : item) })),
    createVehicle: (input) => setState((current) => ({ ...current, vehicles: [...current.vehicles, { ...input, status: 'available', health: 100, location: 'Central Depot', driverId: null, fuel: 100, temperature: 75, speed: 0, anomalies: 0 }] })),
    updateVehicleStatus: (vehicleId, status) => setState((current) => ({ ...current, vehicles: current.vehicles.map((item) => item.id === vehicleId ? { ...item, status } : item) })),
    deleteVehicle: (vehicleId) => setState((current) => ({
      ...current,
      vehicles: current.vehicles.filter((item) => item.id !== vehicleId),
      drivers: current.drivers.map((item) => item.currentVehicleId === vehicleId ? { ...item, currentVehicleId: null, status: item.status === 'on-trip' ? 'available' : item.status } : item),
    })),
    createDriver: (input) => setState((current) => ({ ...current, drivers: [...current.drivers, { ...input, id: createId('DRV'), status: 'available', rating: 5, trips: 0, onTimeRate: 100, currentVehicleId: null, location: 'Central Depot', experience: 'New' }] })),
    updateDriverStatus: (driverId, status) => setState((current) => ({ ...current, drivers: current.drivers.map((item) => item.id === driverId ? { ...item, status } : item) })),
    deleteDriver: (driverId) => setState((current) => ({
      ...current,
      drivers: current.drivers.filter((item) => item.id !== driverId),
      vehicles: current.vehicles.map((item) => item.driverId === driverId ? { ...item, driverId: null, status: item.status === 'on-trip' ? 'available' : item.status } : item),
    })),
    resetDemoData: () => setState(createSeedData()),
  };

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleetData() {
  const context = useContext(FleetContext);
  if (!context) throw new Error('useFleetData must be used within FleetProvider');
  return context;
}
