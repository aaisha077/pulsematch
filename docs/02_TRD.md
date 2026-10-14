# Technical Requirements Document (TRD)
## Blood Bank Inventory Matching Network

### 1. Stack
| Layer | Choice | Why |
|---|---|---|
| Database | MongoDB Atlas (free M0 cluster) | No local install hassle, geospatial + aggregation fully supported, shareable connection string for demo |
| Backend | Python + FastAPI + PyMongo | Fast to build, easy to demo aggregation pipelines directly, auto-generated docs at `/docs` (nice for viva) |
| Frontend | Plain HTML/CSS/JS (or a single React page) | Keep it light — this is a backend/data demo, not a UI showcase |
| Hosting (optional) | Render/Railway for backend, static hosting for frontend | Only if you want a live link; otherwise run locally for the demo |

### 2. Database Design

**Database:** `blood_bank_db`
**Collection:** `banks`

```json
{
  "_id": ObjectId,
  "bank_id": "BB2201",
  "name": "Victoria Hospital Blood Bank",
  "location": { "type": "Point", "coordinates": [77.5946, 12.9716] },
  "address": "K.R. Market, Bengaluru",
  "inventory": [
    { "blood_type": "O-", "units": 12, "nearest_expiry": "2026-09-05" },
    { "blood_type": "AB+", "units": 3, "nearest_expiry": "2026-09-10" }
  ],
  "cold_chain_status": "compliant",
  "last_updated": "2026-08-27T09:00:00Z"
}
```

**Indexes:**
```python
banks.create_index([("location", "2dsphere")])
banks.create_index([("inventory.blood_type", 1), ("inventory.nearest_expiry", 1)])
```

### 3. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/banks` | List all banks (for map/debug view) |
| GET | `/banks/nearest?lat=&lng=&blood_type=&radius_km=` | Geospatial + type match, sorted by distance |
| GET | `/alerts/expiring?days=5` | Aggregation: units expiring within N days |
| POST | `/banks/seed` | (dev-only) Reset & reseed demo data |

### 4. Core Query Logic

**Nearest bank match:**
```python
@app.get("/banks/nearest")
def nearest_banks(lat: float, lng: float, blood_type: str, radius_km: float = 15):
    pipeline = [
        {"$geoNear": {
            "near": {"type": "Point", "coordinates": [lng, lat]},
            "distanceField": "distance_m",
            "maxDistance": radius_km * 1000,
            "spherical": True
        }},
        {"$unwind": "$inventory"},
        {"$match": {"inventory.blood_type": blood_type, "inventory.units": {"$gt": 0}}},
        {"$sort": {"distance_m": 1}},
        {"$limit": 5},
        {"$project": {
            "_id": 0, "name": 1, "address": 1,
            "distance_km": {"$round": [{"$divide": ["$distance_m", 1000]}, 2]},
            "blood_type": "$inventory.blood_type",
            "units": "$inventory.units",
            "nearest_expiry": "$inventory.nearest_expiry"
        }}
    ]
    return list(db.banks.aggregate(pipeline))
```

**Expiry alerts:**
```python
@app.get("/alerts/expiring")
def expiring_units(days: int = 5):
    cutoff = (datetime.utcnow() + timedelta(days=days)).isoformat()
    pipeline = [
        {"$unwind": "$inventory"},
        {"$match": {"inventory.nearest_expiry": {"$lte": cutoff}}},
        {"$project": {
            "_id": 0, "name": 1,
            "blood_type": "$inventory.blood_type",
            "units": "$inventory.units",
            "nearest_expiry": "$inventory.nearest_expiry"
        }}
    ]
    return list(db.banks.aggregate(pipeline))
```

### 5. Environment Setup
```bash
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn pymongo python-dotenv
```
`.env`:
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/
```

### 6. Non-Functional Notes (for the written answer, not required to build)
- **Sharding**: shard key `region` — conceptual, mention in report; not needed on Atlas free tier demo.
- **Replication**: Atlas free tier already runs a 3-node replica set by default — you can literally show this in the Atlas dashboard as "real" evidence.
- **Security**: in a real system, add auth (JWT) on write endpoints — out of scope for demo.

### 7. Deliverables Checklist
- [ ] MongoDB Atlas cluster with seeded `banks` collection
- [ ] FastAPI backend with the 3 endpoints working (test via `/docs` Swagger UI)
- [ ] Minimal frontend calling the search + alerts endpoints
- [ ] Screenshot/live demo of a real document in Atlas + a real query result
