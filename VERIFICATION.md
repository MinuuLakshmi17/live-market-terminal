# Verification

What was actually run and checked before this repo shipped (2026-10-23).

## Verified

- **Backend tests: 6/6 pass** (`pytest` — simulator reproducibility, quote
  invariants, candle OHLC invariants, API endpoints).
- **Backend live over HTTP:** `/health`, `/api/quotes`, and
  `/api/candles/{symbol}` served real responses from a running server.
- **WebSocket protocol live:** snapshot on connect (8 symbols), subscribe
  filtering (a client subscribed to NVDA/TSLA received only those ticks),
  heartbeat response to `ping`, and clean `error` messages for invalid JSON
  and unknown message types.
- **Frontend install:** `npm install` completes cleanly (1,107 packages).
- **Frontend production build:** `ng build` succeeds.
- **Frontend tests:** Jest 2/2 suites pass (store spec, component spec).
  The suite is small; it is a smoke-level safety net, not deep coverage.

## Defects found and fixed before shipping

1. **`npm install` failed out of the box (ERESOLVE).**
   `jest-preset-angular` resolved `@angular/platform-browser-dynamic@20`
   against the project's Angular 19. Fixed by pinning
   `@angular/platform-browser-dynamic@^19.2.0` in `devDependencies`.
   This also repairs the Docker frontend build, which runs `npm install`.
2. **The Angular build did not compile (NG5002).** The watchlist row in
   `app.component.ts` closed three template blocks where only two were
   open. Removed the extra `}`; the production build now succeeds.
3. **Candles were not candles.** The backend labeled cumulative session
   snapshots (session open/high/low) as per-minute candles, stamping
   dozens of entries with the same minute, and the chart drew those
   snapshots as OHLC bars whose bodies never chained. The backend now
   emits true per-minute OHLC bars, and the chart aggregates the tick
   stream into 2-second OHLC buckets client-side.

Also added: `frontend/package-lock.json` (the original upload had none,
so installs were not reproducible) and a root `.gitignore`.

## Not verified

- **Docker Compose run** — no Docker daemon in the verification
  environment. The Compose file, Dockerfiles, and nginx proxy rules were
  reviewed statically and are mutually consistent (API on 8000, UI on
  4200, `/ws/` upgrade headers set).
- **Playwright e2e and in-browser click-through** — the Playwright
  browser download could not complete in the verification environment,
  so `e2e/terminal.spec.ts` has not been executed. Run
  `docker compose up --build`, open http://localhost:4200, and confirm
  live prices update and the line/candle toggle renders before relying
  on the UI.
