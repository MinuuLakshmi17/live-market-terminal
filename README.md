# Live Market Terminal

A full-stack real-time market terminal: Angular standalone components + strict TypeScript + RxJS, signal-based portfolio/watchlist state, and a FastAPI WebSocket feed using geometric Brownian motion (GBM).

**Synthetic data only.** This does not connect to a broker or exchange and is not investment advice.

## Features
- GBM simulated quotes for AAPL, MSFT, NVDA, AMZN, GOOGL, TSLA, META and JPM.
- FastAPI REST endpoints, WebSocket snapshots/ticks, subscription filtering, heartbeat, bounded per-client queues and slow-client disconnect.
- Angular signals store, RxJS WebSocket ingestion, `auditTime(100)` UI throttling, reconnect backoff, line and OHLC candle charts, watchlist, portfolio P&L, simulated depth ladder and recent tick tape.
- Python tests, Jest specs, Playwright smoke test, Docker Compose.

## Run with Docker
Requirements: Docker + Compose v2.
```bash
cp .env.example .env
docker compose up --build
```
UI: http://localhost:4200 · API docs: http://localhost:8000/docs · Health: http://localhost:8000/health

## Run locally
Backend:
```bash
cd backend
python -m venv .venv
# activate the venv, then:
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```
From repository root: `PYTHONPATH=backend pytest -q backend/tests`

Frontend (Node 20+):
```bash
cd frontend
npm install
npm start
npm test -- --runInBand
npx playwright install chromium
npm run e2e
```

## Protocol
Send `{"type":"subscribe","symbols":["AAPL","MSFT"]}` to `/ws/market`. Messages: `snapshot`, `tick`, `heartbeat`, `error`. A full outbound queue closes only that slow client with code 1013 so other subscribers keep receiving updates.

## Engineering notes
Charts are self-contained SVG to avoid a heavyweight chart dependency. The REST candle endpoint returns true per-minute OHLC bars; the chart aggregates the tick stream into 2-second OHLC buckets client-side for a livelier intraday view. The book is simulated top-of-book depth, not exchange order-level data. Production readiness would additionally require authentication, entitlements, market calendars, sequence numbers, durable replay, observability and exchange adapters.
