"""
PulseMatch — Blood Bank Inventory Matching Network
FastAPI backend: geospatial nearest-match search + expiry alert aggregation + full CRUD.

Run:  uvicorn main:app --reload
Docs: http://127.0.0.1:8000/docs
"""
import os
from datetime import datetime, timedelta
from typing import List, Optional
import ssl

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, GEOSPHERE
from pydantic import BaseModel

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "pulsematch_db")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI not set. Copy .env.example to .env and fill it in.")

client = MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True)
db = client[DB_NAME]
banks = db["banks"]


# ── Pydantic models ────────────────────────────────────────────────────────────

class InventoryItem(BaseModel):
    blood_type: str
    units: int
    nearest_expiry: str  # YYYY-MM-DD

class BankCreate(BaseModel):
    name: str
    address: str
    lat: float
    lng: float
    inventory: List[InventoryItem] = []

class BankUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    inventory: Optional[List[InventoryItem]] = None

app = FastAPI(
    title="PulseMatch API",
    description="Blood Bank Inventory Matching Network — MongoDB geospatial + aggregation demo",
    version="1.0.0",
)

# Allow the local frontend (or any origin, for demo simplicity) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_BLOOD_TYPES = {"O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"}


@app.get("/")
def root():
    return {"status": "ok", "service": "PulseMatch API", "docs": "/docs"}


@app.get("/banks")
def list_banks():
    """Return all banks — used for the map/debug view."""
    docs = list(banks.find({}, {"_id": 0}))
    return {"count": len(docs), "banks": docs}


@app.get("/banks/nearest")
def nearest_banks(
    lat: float = Query(..., description="Requester latitude"),
    lng: float = Query(..., description="Requester longitude"),
    blood_type: str = Query(..., description="Blood type needed, e.g. O-"),
    radius_km: float = Query(15, description="Search radius in kilometers"),
):
    """
    Geospatial + inventory match: find the nearest banks with the requested
    blood type in stock, ranked by distance. Uses $geoNear (requires the
    2dsphere index created by seed.py).
    """
    blood_type = blood_type.upper()
    if blood_type not in VALID_BLOOD_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid blood_type. Must be one of {sorted(VALID_BLOOD_TYPES)}")

    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [lng, lat]},
                "distanceField": "distance_m",
                "maxDistance": radius_km * 1000,
                "spherical": True,
            }
        },
        {"$unwind": "$inventory"},
        {"$match": {"inventory.blood_type": blood_type, "inventory.units": {"$gt": 0}}},
        {"$sort": {"distance_m": 1}},
        {"$limit": 10},
        {
            "$project": {
                "_id": 0,
                "bank_id": 1,
                "name": 1,
                "address": 1,
                "distance_km": {"$round": [{"$divide": ["$distance_m", 1000]}, 2]},
                "blood_type": "$inventory.blood_type",
                "units": "$inventory.units",
                "nearest_expiry": "$inventory.nearest_expiry",
            }
        },
    ]

    results = list(banks.aggregate(pipeline))
    return {
        "query": {"lat": lat, "lng": lng, "blood_type": blood_type, "radius_km": radius_km},
        "count": len(results),
        "results": results,
    }


@app.get("/alerts/expiring")
def expiring_units(days: int = Query(5, description="Flag units expiring within N days")):
    """
    Aggregation: units across all banks expiring within N days, soonest first.
    In a real system these would trigger redistribution alerts to nearby hospitals.
    """
    cutoff = (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d")

    pipeline = [
        {"$unwind": "$inventory"},
        {"$match": {"inventory.nearest_expiry": {"$lte": cutoff}}},
        {"$sort": {"inventory.nearest_expiry": 1}},
        {
            "$project": {
                "_id": 0,
                "bank_id": 1,
                "name": 1,
                "address": 1,
                "blood_type": "$inventory.blood_type",
                "units": "$inventory.units",
                "nearest_expiry": "$inventory.nearest_expiry",
            }
        },
    ]

    results = list(banks.aggregate(pipeline))
    return {"cutoff_date": cutoff, "count": len(results), "alerts": results}


@app.post("/banks/seed")
def reseed():
    """Dev-only convenience endpoint: wipes and reseeds demo data via seed.py's logic."""
    import seed as seed_module
    seed_module.main()
    return {"status": "reseeded"}


# ── CRUD ───────────────────────────────────────────────────────────────────────

@app.post("/banks/create", status_code=201)
def create_bank(body: BankCreate):
    """Create a new blood bank entry."""
    # Auto-generate a bank_id
    count = banks.count_documents({})
    bank_id = f"BB{3000 + count}"

    doc = {
        "bank_id": bank_id,
        "name": body.name,
        "address": body.address,
        "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
        "inventory": [item.model_dump() for item in body.inventory],
        "cold_chain_status": "compliant",
        "last_updated": datetime.utcnow().isoformat(),
    }
    banks.insert_one(doc)
    # Ensure geo index exists
    banks.create_index([("location", GEOSPHERE)], background=True)
    return {"status": "created", "bank_id": bank_id}


@app.get("/banks/{bank_id}")
def get_bank(bank_id: str):
    """Get a single blood bank by bank_id."""
    doc = banks.find_one({"bank_id": bank_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Bank not found")
    return doc


@app.put("/banks/{bank_id}")
def update_bank(bank_id: str, body: BankUpdate):
    """Update fields of an existing bank."""
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Rebuild location if lat/lng provided
    lat = update_data.pop("lat", None)
    lng = update_data.pop("lng", None)
    if lat is not None or lng is not None:
        existing = banks.find_one({"bank_id": bank_id}, {"_id": 0, "location": 1})
        if not existing:
            raise HTTPException(status_code=404, detail="Bank not found")
        old_coords = existing["location"]["coordinates"]
        update_data["location"] = {
            "type": "Point",
            "coordinates": [lng if lng is not None else old_coords[0],
                            lat if lat is not None else old_coords[1]],
        }

    # Serialize inventory items
    if "inventory" in update_data:
        update_data["inventory"] = [i if isinstance(i, dict) else i.model_dump()
                                     for i in update_data["inventory"]]

    update_data["last_updated"] = datetime.utcnow().isoformat()
    result = banks.update_one({"bank_id": bank_id}, {"$set": update_data})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bank not found")
    return {"status": "updated", "bank_id": bank_id}


@app.delete("/banks/{bank_id}")
def delete_bank(bank_id: str):
    """Delete a blood bank by bank_id."""
    result = banks.delete_one({"bank_id": bank_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bank not found")
    return {"status": "deleted", "bank_id": bank_id}
