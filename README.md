# HACKSYMMETRIC

A fleet operations and intelligence demo that brings together a React dashboard, a Node.js API, PostgreSQL/MongoDB data layers, and a Python-based anomaly detection service.

This project is designed to simulate a modern logistics command center where operators can review trip requests, monitor vehicles, manage drivers, inspect operational history, and use AI-assisted insights to spot risky conditions.

## Deployed Website

[Open the live HACKSYMMETRIC website](https://soldiers-handling-contacting-flour.trycloudflare.com/)

## Features

- Fleet overview dashboard with operational KPIs and alerts
- Trip dispatch workflow for creating and evaluating trip requests
- Vehicle monitoring panel with sample telemetry and health states
- Driver management and readiness tracking
- Fleet trip history and operational reporting
- AI insights using a trained anomaly detection model
- Local and production deployment setup with Docker Compose
- Database fallback logic for local demo resilience

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- API layer: Node.js, Express
- Data stores: PostgreSQL, MongoDB, SQLite fallback support
- AI service: Python, FastAPI, scikit-learn
- Orchestration: Docker Compose

## Project Structure

```text
.
├── app/                     # React frontend and dashboard UI
├── server/                  # Express API and backend logic
├── services/
│   └── intelligence/       # FastAPI anomaly detection package and ML model
├── deploy/                  # Deployment-related files
├── styles/                  # Styling assets
├── Dockerfile.api           # API container definition
├── Dockerfile.web           # Web container definition
├── compose.yaml             # Local development stack
├── compose.production.yaml  # Production stack configuration
├── package.json             # App scripts and dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
├── index.html               # App entry HTML
├── main.tsx                 # Frontend bootstrap
├── .env.production.example  # Production env template
├── README.md                # Project documentation
└── ...
```

## Getting Started

### Prerequisites

- Node.js and npm
- Docker Desktop with the Linux container engine enabled
- Python 3.14 via the `py` launcher on Windows
- Redis running locally on port 6379 for the intelligence service

### Install and Run

```powershell
npm install
py -3.14 -m pip install -r services/intelligence/requirements.txt
npm run train:ml
npm run dev:full
```

This starts the local data services, the AI service, and the Vite web application.

- Web app: http://127.0.0.1:5173
- PostgreSQL: 127.0.0.1:5433
- MongoDB: 127.0.0.1:27017
- Redis: 127.0.0.1:6379

## Common Scripts

```powershell
npm run dev          # Start the frontend only
npm run api          # Start the Express API
npm run ai           # Start the FastAPI intelligence service
npm run train:ml     # Train the anomaly detection model
npm run infra:up     # Start PostgreSQL and MongoDB containers
npm run infra:down   # Stop the local infrastructure stack
npm run deploy:up    # Start the production-style Docker stack
npm run deploy:down  # Stop the production stack
```

## Data and Runtime Behavior

- PostgreSQL stores the primary operational records for fleet entities and trips.
- MongoDB is used for telemetry snapshots and vehicle monitoring data.
- Redis supports cached intelligence results and related demo workflows.
- SQLite may be used as a fallback if the primary database is unavailable.
- The AI model is a synthetic, demo-oriented anomaly detector and should not be treated as production-ready fleet intelligence without further validation.

## Production Deployment

A production deployment targets a Linux VPS with Docker Engine and Docker Compose. The project includes a production Compose file and environment template for configuring domain, secrets, and service networking.

1. Copy `.env.production.example` to `.env.production`.
2. Set your domain and secure database/cache secrets.
3. Start the stack with:

```powershell
npm run deploy:up
```

4. Open the configured HTTPS URL for the application.

## Notes

This repository is a demo and starter implementation for fleet operations monitoring and AI-powered operational intelligence. It is intended for local development, experimentation, and demonstration workflows rather than as a hardened production system without additional security, validation, and operational review.

## License

This project does not currently declare a license file in the repository. If you plan to distribute or reuse it publicly, add an appropriate open-source license before doing so.
