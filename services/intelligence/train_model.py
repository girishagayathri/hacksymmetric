from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

FEATURES = ["temperature", "health", "fuel", "reported_anomalies"]
MODEL_PATH = Path(__file__).parent / "models" / "telemetry_isolation_forest.joblib"
SEED = 20261114


def training_data(sample_count: int = 6000) -> np.ndarray:
    rng = np.random.default_rng(SEED)
    temperature = np.clip(rng.normal(82, 5, sample_count), 60, 98)
    health = np.clip(rng.normal(92, 6, sample_count), 68, 100)
    fuel = rng.beta(3.2, 2.2, sample_count) * 100
    reported_anomalies = rng.poisson(0.08, sample_count)
    return np.column_stack((temperature, health, fuel, reported_anomalies))


def train_model():
    model = IsolationForest(
        n_estimators=300,
        contamination=0.025,
        max_samples="auto",
        random_state=SEED,
        n_jobs=-1,
    )
    samples = training_data()
    model.fit(samples)
    return {
        "model": model,
        "features": FEATURES,
        "version": "telemetry-iforest-v1",
        "algorithm": "IsolationForest",
        "training_source": "synthetic nominal telemetry",
        "training_rows": len(samples),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "random_seed": SEED,
    }


def main() -> None:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    artifact = train_model()
    joblib.dump(artifact, MODEL_PATH, compress=3)
    print(
        f"Saved {artifact['algorithm']} ({artifact['version']}) trained on "
        f"{artifact['training_rows']} synthetic normal telemetry rows to {MODEL_PATH}"
    )


if __name__ == "__main__":
    main()
