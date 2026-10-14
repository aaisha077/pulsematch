# PulseMatch — Blood Bank Inventory Matching Network

MongoDB-based big data demo app: geospatial nearest-bank search + expiry-alert aggregation.

## Structure
```
pulsematch/
  backend/
    main.py           FastAPI app (3 endpoints)
    seed.py            Seeds 17 demo blood banks across Bengaluru
    requirements.txt
    .env.example
  frontend/
    index.html
    style.css
    app.js
```

## Setup (≈10 minutes)

### 1. MongoDB Atlas
1. Create a free account at https://cloud.mongodb.com and a free M0 cluster.
2. Database Access → add a DB user with a password.
3. Network Access → allow access from anywhere (0.0.0.0/0) for demo simplicity.
4. Click "Connect" → "Drivers" → copy the connection string.

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and paste your MONGO_URI

python seed.py                    # populates ~17 banks + creates indexes
uvicorn main:app --reload         # starts API at http://127.0.0.1:8000
```
Visit **http://127.0.0.1:8000/docs** to see and test all endpoints (Swagger UI) — this alone is a legitimate working-app demo if you're short on time.

### 3. Frontend
Just open `frontend/index.html` directly in a browser (double-click it), or serve it:
```bash
cd frontend
python -m http.server 5500
```
Then visit http://127.0.0.1:5500. Make sure the backend (`uvicorn`) is running at the same time — the frontend calls `http://127.0.0.1:8000` by default (edit `API_BASE` in `app.js` if your backend runs elsewhere).

## Demo Script (for viva)
1. Open MongoDB Atlas → `pulsematch_db.banks` → click a document → show the flexible schema + GeoJSON `location` field.
2. Open the frontend → Search tab → pick blood type `O-` and location `Koramangala` → Find Nearest Stock → real ranked results appear.
3. Switch to Expiring Soon tab → shows units flagged by the aggregation pipeline.
4. (Optional) Open `/docs` and run `/banks/nearest` live to show the raw JSON + the aggregation pipeline in `main.py`.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/banks` | List all banks |
| GET | `/banks/nearest?lat=&lng=&blood_type=&radius_km=` | Geospatial + type match, nearest first |
| GET | `/alerts/expiring?days=5` | Units expiring within N days |
| POST | `/banks/seed` | Dev-only: wipe & reseed demo data |

## Notes
- Atlas's free tier already runs as a 3-node replica set — worth showing in the Atlas UI as evidence of built-in replication.
- Sharding by `region` is discussed in the written report as the scale-out plan; not required for this demo-scale cluster.
