from __future__ import annotations

import hashlib
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from fastapi import FastAPI, Request
from pydantic import BaseModel, ConfigDict, Field
from redis.asyncio import Redis
from redis.exceptions import RedisError

MODEL_PATH = Path(__file__).parent / "models" / "telemetry_isolation_forest.joblib"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not MODEL_PATH.exists():
        raise RuntimeError("Anomaly model artifact is missing. Run `npm run train:ml` first.")
    app.state.anomaly_artifact = joblib.load(MODEL_PATH)
    app.state.redis = Redis.from_url(
        os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
        decode_responses=True,
        protocol=2,
        socket_connect_timeout=0.5,
        socket_timeout=0.5,
    )
    app.state.cache_hits = 0
    app.state.cache_misses = 0
    yield
    await app.state.redis.aclose()


app = FastAPI(title="OkGadi Fleet Intelligence", version="1.0.0", lifespan=lifespan)


class TelemetryInput(BaseModel):
    vehicle_id: str = Field(alias="vehicleId")
    health: int = Field(ge=0, le=100)
    fuel: int = Field(ge=0, le=100)
    temperature: float
    anomalies: int = Field(ge=0)

    model_config = ConfigDict(populate_by_name=True)


class TripRiskInput(BaseModel):
    health: int = Field(ge=0, le=100)
    anomaly_count: int = Field(default=0, alias="anomalyCount", ge=0)
    distance_km: float = Field(default=0, alias="distanceKm", ge=0)
    priority: str = "normal"

    model_config = ConfigDict(populate_by_name=True)


class VehicleCandidate(BaseModel):
    id: str
    status: str
    health: int = Field(ge=0, le=100)
    capacity_kg: float = Field(alias="capacityKg", gt=0)

    model_config = ConfigDict(populate_by_name=True)


class DriverCandidate(BaseModel):
    id: str
    name: str
    status: str
    rating: float = Field(default=5, ge=0, le=5)
    on_time_rate: float = Field(default=100, alias="onTimeRate", ge=0, le=100)
    current_vehicle_id: str | None = Field(default=None, alias="currentVehicleId")

    model_config = ConfigDict(populate_by_name=True)


class AllocationInput(BaseModel):
    trip_id: str = Field(alias="tripId")
    weight_kg: float = Field(alias="weightKg", gt=0)
    priority: str = "normal"
    vehicles: list[VehicleCandidate]
    drivers: list[DriverCandidate]

    model_config = ConfigDict(populate_by_name=True)


def _clamp(value: float, lower: float = 0, upper: float = 100) -> int:
    return round(max(lower, min(upper, value)))


async def _cached(request: Request, namespace: str, payload: BaseModel, calculate: Any) -> dict[str, Any]:
    redis: Redis = request.app.state.redis
    encoded = payload.model_dump_json(by_alias=True, exclude_none=True)
    key = f"okgadi:intelligence:{namespace}:{hashlib.sha256(encoded.encode()).hexdigest()}"

    try:
        cached = await redis.get(key)
        if cached is not None:
            request.app.state.cache_hits += 1
            result = json.loads(cached)
            result["cached"] = True
            return result
    except RedisError:
        pass

    request.app.state.cache_misses += 1
    result = calculate()
    result["cached"] = False
    try:
        await redis.set(key, json.dumps(result), ex=60)
    except RedisError:
        pass
    return result


@app.get("/health")
async def health(request: Request) -> dict[str, Any]:
    redis_status = "connected"
    try:
        await request.app.state.redis.ping()
    except RedisError:
        redis_status = "disconnected"
    return {
        "status": "ok" if redis_status == "connected" else "degraded",
        "service": "fastapi-isolation-forest",
        "redis": redis_status,
        "anomalyModel": {
            "status": "loaded",
            "algorithm": request.app.state.anomaly_artifact["algorithm"],
            "version": request.app.state.anomaly_artifact["version"],
            "trainingRows": request.app.state.anomaly_artifact["training_rows"],
            "trainingSource": request.app.state.anomaly_artifact["training_source"],
        },
        "cache": {
            "hits": request.app.state.cache_hits,
            "misses": request.app.state.cache_misses,
            "hitRate": round(
                request.app.state.cache_hits
                / max(1, request.app.state.cache_hits + request.app.state.cache_misses)
                * 100
            ),
        },
    }


@app.get("/models")
async def models(request: Request) -> dict[str, Any]:
    artifact = request.app.state.anomaly_artifact
    return {
        "mode": "trained-anomaly-model-plus-rules",
        "models": [
            {"id": "vehicle-health", "name": "Vehicle health scoring", "status": "active"},
            {
                "id": "anomaly-detection",
                "name": artifact["algorithm"],
                "version": artifact["version"],
                "trainingRows": artifact["training_rows"],
                "trainingSource": artifact["training_source"],
                "status": "active",
            },
            {"id": "trip-risk", "name": "Trip risk scoring", "status": "active"},
            {"id": "allocation", "name": "Fleet allocation ranking", "status": "active"},
        ],
    }


@app.post("/predict/vehicle-health")
async def predict_vehicle_health(payload: TelemetryInput, request: Request) -> dict[str, Any]:
    def calculate() -> dict[str, Any]:
        temperature_penalty = max(0, payload.temperature - 90) * 0.45
        fuel_penalty = max(0, 20 - payload.fuel) * 0.35
        score = _clamp(payload.health - payload.anomalies * 6 - temperature_penalty - fuel_penalty)
        condition = "healthy" if score >= 80 else "monitor" if score >= 60 else "service recommended"
        return {
            "vehicleId": payload.vehicle_id,
            "healthScore": score,
            "condition": condition,
            "method": "deterministic-rules-v1",
        }

    return await _cached(request, "vehicle-health", payload, calculate)


@app.post("/detect/anomaly")
async def detect_anomaly(payload: TelemetryInput, request: Request) -> dict[str, Any]:
    def calculate() -> dict[str, Any]:
        artifact = request.app.state.anomaly_artifact
        features = np.array([[
            payload.temperature,
            payload.health,
            payload.fuel,
            payload.anomalies,
        ]], dtype=float)
        model = artifact["model"]
        model_outlier = int(model.predict(features)[0]) == -1
        decision_score = float(model.decision_function(features)[0])
        anomaly_score = _clamp(50 - decision_score * 100)
        signals = []
        if payload.temperature > 100:
            signals.append("critical engine temperature")
        elif payload.temperature > 95:
            signals.append("elevated engine temperature")
        if payload.fuel < 15:
            signals.append("low fuel")
        if payload.health < 70:
            signals.append("low vehicle health")
        if payload.anomalies > 0:
            signals.append(f"{payload.anomalies} recorded telemetry issue(s)")
        if model_outlier:
            signals.append("Isolation Forest classified this telemetry as anomalous")
        return {
            "vehicleId": payload.vehicle_id,
            "detected": model_outlier or bool(signals),
            "modelOutlier": model_outlier,
            "anomalyScore": anomaly_score,
            "model": artifact["algorithm"],
            "modelVersion": artifact["version"],
            "signals": signals,
            "method": "isolation-forest-plus-safety-thresholds-v1",
        }

    return await _cached(request, "anomaly", payload, calculate)


@app.post("/score/trip-risk")
async def score_trip_risk(payload: TripRiskInput, request: Request) -> dict[str, Any]:
    def calculate() -> dict[str, Any]:
        priority_penalty = 8 if payload.priority in {"urgent", "high"} else 0
        risk = _clamp(100 - payload.health + payload.anomaly_count * 8 + payload.distance_km * 0.08 + priority_penalty)
        level = "low" if risk < 30 else "medium" if risk < 65 else "high"
        return {"riskScore": risk, "riskLevel": level, "method": "deterministic-rules-v1"}

    return await _cached(request, "trip-risk", payload, calculate)


@app.post("/allocate")
async def allocate(payload: AllocationInput, request: Request) -> dict[str, Any]:
    def calculate() -> dict[str, Any]:
        vehicles = [
            vehicle
            for vehicle in payload.vehicles
            if vehicle.status == "available"
            and vehicle.health >= 65
            and vehicle.capacity_kg >= payload.weight_kg
        ]
        drivers = [
            driver
            for driver in payload.drivers
            if driver.status == "available" and driver.current_vehicle_id is None
        ]

        if not vehicles or not drivers:
            return {
                "allocated": False,
                "reason": "No available driver and capacity-fit vehicle pair.",
                "method": "deterministic-ranking-v1",
            }

        def rank_pair(pair: tuple[VehicleCandidate, DriverCandidate]) -> float:
            vehicle, driver = pair
            utilization = payload.weight_kg / vehicle.capacity_kg
            capacity_fit = 100 - abs(0.7 - utilization) * 100
            return vehicle.health * 0.45 + driver.on_time_rate * 0.3 + driver.rating * 20 * 0.15 + capacity_fit * 0.1

        vehicle, driver = max(
            ((vehicle, driver) for vehicle in vehicles for driver in drivers),
            key=rank_pair,
        )
        return {
            "allocated": True,
            "tripId": payload.trip_id,
            "vehicleId": vehicle.id,
            "driverId": driver.id,
            "driverName": driver.name,
            "matchScore": _clamp(rank_pair((vehicle, driver))),
            "reasons": [
                f"Vehicle health is {vehicle.health}%.",
                f"Capacity fit is {round(payload.weight_kg / vehicle.capacity_kg * 100)}%.",
                f"Driver on-time rate is {round(driver.on_time_rate)}%.",
            ],
            "method": "deterministic-ranking-v1",
        }

    return await _cached(request, "allocation", payload, calculate)
