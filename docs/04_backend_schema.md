# Backend Schema
## Blood Bank Inventory Matching Network

### Database: `blood_bank_db`

### Collection: `banks`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Auto-generated |
| `bank_id` | String | Human-readable ID, e.g. `BB2201` |
| `name` | String | Bank/hospital name |
| `location` | GeoJSON Point | `{ "type": "Point", "coordinates": [lng, lat] }` — **lng first, then lat** |
| `address` | String | Display address |
| `inventory` | Array of subdocuments | See below |
| `inventory[].blood_type` | String | One of `O+ O- A+ A- B+ B- AB+ AB-` |
| `inventory[].units` | Number | Units currently in stock |
| `inventory[].nearest_expiry` | ISO Date string | Expiry of the soonest-expiring unit of that type |
| `cold_chain_status` | String | `compliant` / `excursion` (bonus field, ties into cold-chain idea from the written answer) |
| `last_updated` | ISO Date string | Last inventory sync timestamp |

### Indexes
```python
banks.create_index([("location", "2dsphere")])
banks.create_index([("inventory.blood_type", 1), ("inventory.nearest_expiry", 1)])
```

### Sample Seed Document
```json
{
  "bank_id": "BB2201",
  "name": "Victoria Hospital Blood Bank",
  "location": { "type": "Point", "coordinates": [77.5946, 12.9716] },
  "address": "K.R. Market, Bengaluru",
  "inventory": [
    { "blood_type": "O-",  "units": 12, "nearest_expiry": "2026-09-05" },
    { "blood_type": "AB+", "units": 3,  "nearest_expiry": "2026-09-10" },
    { "blood_type": "A+",  "units": 20, "nearest_expiry": "2026-09-20" }
  ],
  "cold_chain_status": "compliant",
  "last_updated": "2026-08-27T09:00:00Z"
}
```

### Seed Script Sketch (generates 15-20 banks around Bengaluru)
```python
import random
from datetime import datetime, timedelta
from pymongo import MongoClient, GEOSPHERE

client = MongoClient(MONGO_URI)
db = client["blood_bank_db"]
banks = db["banks"]
banks.delete_many({})

bank_names = [
    "Victoria Hospital Blood Bank", "St. John's Blood Bank", "Manipal Hospital Blood Bank",
    "Bowring Hospital Blood Bank", "Vani Vilas Blood Bank", "Jayadeva Institute Blood Bank",
    "Rajiv Gandhi Institute Blood Bank", "Fortis Hospital Blood Bank", "Apollo Blood Bank",
    "NIMHANS Blood Bank", "K.C. General Hospital Blood Bank", "Sagar Hospitals Blood Bank",
    "Sparsh Hospital Blood Bank", "Rotary Blood Bank Indiranagar", "Red Cross Blood Bank Bengaluru"
]
blood_types = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

# Bengaluru bounding box (approx)
LAT_RANGE = (12.85, 13.05)
LNG_RANGE = (77.50, 77.70)

docs = []
for i, name in enumerate(bank_names):
    lat = round(random.uniform(*LAT_RANGE), 4)
    lng = round(random.uniform(*LNG_RANGE), 4)
    inventory = []
    for bt in random.sample(blood_types, k=random.randint(3, 6)):
        inventory.append({
            "blood_type": bt,
            "units": random.randint(0, 25),
            "nearest_expiry": (datetime.utcnow() + timedelta(days=random.randint(1, 40))).strftime("%Y-%m-%d")
        })
    docs.append({
        "bank_id": f"BB{2200 + i}",
        "name": name,
        "location": {"type": "Point", "coordinates": [lng, lat]},
        "address": f"{name.split(' Blood Bank')[0]}, Bengaluru",
        "inventory": inventory,
        "cold_chain_status": random.choice(["compliant", "compliant", "compliant", "excursion"]),
        "last_updated": datetime.utcnow().isoformat()
    })

banks.insert_many(docs)
banks.create_index([("location", GEOSPHERE)])
banks.create_index([("inventory.blood_type", 1), ("inventory.nearest_expiry", 1)])
print(f"Seeded {len(docs)} banks")
```
