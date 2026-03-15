# API Cortex

AI-powered API security monitoring platform with a FastAPI backend and a Next.js frontend.

API Cortex simulates and monitors API traffic in real time, detects suspicious behavior (SQL injection, DDoS/flooding, shadow APIs, geolocation anomalies), scores risk, and provides investigation workflows through a live dashboard.

## Highlights

- Real-time API traffic monitoring over WebSocket
- Multi-layer threat detection and risk scoring
- Shadow API discovery and blocked IP management
- Attack simulation controls for demos/testing
- Threat investigation and resolution workflow
- Analytics views for traffic, mapping, reports, and threats

## Tech Stack

**Backend**
- FastAPI
- SQLite (`cortex.db`)
- `httpx`, `scikit-learn`, `pandas`, `numpy`

**Frontend**
- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Recharts + Framer Motion

## Repository Structure

```text
api-cortex/
├── backend/
│   ├── main.py
│   ├── anomaly_detector.py
│   ├── ddos_detector.py
│   ├── sql_detector.py
│   ├── geo_detector.py
│   ├── shadow_api_discovery.py
│   ├── security_agent.py
│   ├── traffic_generator.py
│   └── requirements.txt
└── frontend/
    ├── src/app/
    ├── src/components/
    └── package.json
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Quick Start

Run backend and frontend in two terminals.

### 1) Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:
- `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at:
- `http://localhost:3000`

## Core API Endpoints

### Real-time + Monitoring
- `GET /api/stats`
- `GET /api/traffic-summary`
- `GET /api/logs?limit=50`
- `GET /api/threats`
- `GET /api/threat-stats`
- `WS /ws/traffic`

### Threat Operations
- `POST /api/threats/{threat_id}/resolve`
- `GET /api/threat-summary`

### Simulation + Traffic Controls
- `POST /api/simulate`
- `GET /api/traffic-control/status`
- `POST /api/traffic-control/start`
- `POST /api/traffic-control/stop`
- `POST /api/traffic-control/resume`
- `POST /api/traffic-control/configure`

### Security Features
- `GET /api/features`
- `GET /api/shadow-apis`
- `GET /api/blocked-ips`
- `POST /api/unblock-ip`
- `GET /api/dependency-graph`

## Example: Trigger a Simulation

```bash
curl -X POST "http://localhost:8000/api/simulate?attack_type=sql_injection" \
  -H "Content-Type: application/json" \
  -d "{\"count\": 10}"
```

## Frontend Sections

The frontend includes dedicated views for:
- Dashboard
- Features
- Investigator
- Mapping
- Reports
- Simulator
- Threats
- Traffic
- Settings

## Notes

- The backend creates and updates `cortex.db` automatically on startup.
- Frontend API URLs are currently hardcoded to `http://localhost:8000` and WebSocket to `ws://localhost:8000/ws/traffic`.
- CORS is enabled for all origins in backend middleware for development/demo use.

## Scripts

### Backend
- Start dev server: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

### Frontend
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`

## License

Add your preferred license (MIT, Apache-2.0, etc.) in a `LICENSE` file.