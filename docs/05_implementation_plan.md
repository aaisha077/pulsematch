# Implementation Plan
## Blood Bank Inventory Matching Network — Build Today

Goal: working, demoable app by end of day. Scoped tight — skip anything not needed to prove the MongoDB concepts live.

### Phase 1 — Database Setup (30 min)
1. Create free MongoDB Atlas cluster (M0) at cloud.mongodb.com.
2. Create DB user + allow network access (0.0.0.0/0 for demo simplicity).
3. Copy connection string into `.env` as `MONGO_URI`.
4. Run the seed script from `04_backend_schema.md` → confirm 15-20 documents in Atlas UI.
5. Confirm `2dsphere` index exists (Atlas → Indexes tab).

### Phase 2 — Backend (60-90 min)
1. `pip install fastapi uvicorn pymongo python-dotenv`
2. Build `main.py` with the 3 endpoints from `02_TRD.md`:
   - `/banks`
   - `/banks/nearest`
   - `/alerts/expiring`
3. Run locally: `uvicorn main:app --reload`
4. Test all 3 endpoints via `/docs` (Swagger UI) — this alone is enough to demo the backend if you run out of time for the frontend.

### Phase 3 — Frontend (60-90 min, can be trimmed)
Minimal single HTML page is enough:
1. A form: blood type dropdown + preset location dropdown ("Near Koramangala", "Near Whitefield" etc. mapped to lat/lng) + "Find Nearest Stock" button.
2. A results `<div>` that fetches `/banks/nearest` and renders a simple list/table.
3. A second tab/section for `/alerts/expiring` results table.
4. Keep styling minimal — plain CSS, no framework needed.

### Phase 4 — Polish for Demo (30 min)
1. Seed a few banks intentionally close to your demo "search location" with the exact blood type you'll search, so results are visibly meaningful (not empty).
2. Seed a couple of units expiring in the next 1-3 days so the expiry tab isn't empty.
3. Take 2-3 screenshots as backup in case live demo/wifi fails.
4. Rehearse the exact click-path once end to end.

### Time Budget (if starting now)
| Phase | Time |
|---|---|
| DB setup + seed | 30 min |
| Backend + test | 60-90 min |
| Frontend | 60-90 min |
| Polish + rehearse | 30 min |
| **Total** | **~3-4 hrs** |

### Fallback If Short on Time
Skip the frontend entirely — demo purely through FastAPI's auto-generated `/docs` Swagger UI. It's a legitimate, working application interface and still proves every MongoDB concept (geospatial query, aggregation, schema) live. Pair it with the PDF answer already written for the written portion.

### Stretch Goals (only if time remains)
- Add the map view (Leaflet.js) showing bank markers + highlighted matches.
- Add mock "alert sent" log line printed to console/UI when a match is clicked.
