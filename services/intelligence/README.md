# Fleet Intelligence Service

The FastAPI service uses a scikit-learn Isolation Forest for telemetry anomaly detection. Vehicle-health scoring, trip-risk scoring, and allocation ranking remain deterministic rules.

## Run

Install the requirements into the Python 3.14 selected by the `py` launcher, then train the artifact and start the full application:

```powershell
py -3.14 -m pip install -r services/intelligence/requirements.txt
npm run train:ml
npm run dev:full
```

The model artifact is written to `services/intelligence/models/telemetry_isolation_forest.joblib`. Retrain it after changing the training generator:

```powershell
npm run train:ml
```

## Training data and limitations

The checked-in artifact is trained reproducibly on 6,000 generated nominal telemetry samples. It is a working starter model, not validated fleet accuracy. Synthetic data does not represent every vehicle, route, season, or sensor. Replace or augment the generator with cleaned, representative fleet telemetry and validate against reviewed anomaly labels before using scores for maintenance or safety decisions.

Features are engine temperature, vehicle health, fuel percentage, and reported anomaly count. The API combines the model result with explicit safety thresholds and reports the model version, anomaly score, and signals.

The service binds to localhost by default and has no authentication. Do not expose it publicly without access control and deployment hardening.