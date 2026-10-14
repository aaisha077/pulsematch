"""
Seeds the `banks` collection with 15-20 realistic blood bank documents
spread across Bengaluru, each with randomized inventory + expiry dates.

Run:  python seed.py
"""
import os
import random
from datetime import datetime, timedelta

import ssl
from dotenv import load_dotenv
from pymongo import MongoClient, GEOSPHERE

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "pulsematch_db")

if not MONGO_URI:
    raise SystemExit("MONGO_URI not set. Copy .env.example to .env and fill it in.")

client = MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True)
db = client[DB_NAME]
banks = db["banks"]

# Wipe existing demo data
banks.delete_many({})

BANK_NAMES = [
    "Victoria Hospital Blood Bank",
    "St. John's Blood Bank",
    "Manipal Hospital Blood Bank",
    "Bowring Hospital Blood Bank",
    "Vani Vilas Blood Bank",
    "Jayadeva Institute Blood Bank",
    "Rajiv Gandhi Institute Blood Bank",
    "Fortis Hospital Blood Bank",
    "Apollo Blood Bank",
    "NIMHANS Blood Bank",
    "K.C. General Hospital Blood Bank",
    "Sagar Hospitals Blood Bank",
    "Sparsh Hospital Blood Bank",
    "Rotary Blood Bank Indiranagar",
    "Red Cross Blood Bank Bengaluru",
    "Columbia Asia Blood Bank",
    "Aster CMI Blood Bank",
]

BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

# Approx Bengaluru bounding box
LAT_RANGE = (12.85, 13.05)
LNG_RANGE = (77.50, 77.70)

# A few known landmark points so demo searches return meaningful results
LANDMARKS = {
    "Koramangala":  (12.9352, 77.6245),
    "Whitefield":   (12.9698, 77.7500),
    "Jayanagar":    (12.9308, 77.5838),
    "MG Road":      (12.9758, 77.6069),
    "Malleshwaram": (13.0035, 77.5709),
    "Electronic City": (12.8452, 77.6602),
}


def random_inventory():
    inv = []
    for bt in random.sample(BLOOD_TYPES, k=random.randint(3, 6)):
        inv.append({
            "blood_type": bt,
            "units": random.randint(0, 25),
            "nearest_expiry": (
                datetime.utcnow() + timedelta(days=random.randint(1, 40))
            ).strftime("%Y-%m-%d"),
        })
    return inv


def build_docs():
    docs = []
    landmark_names = list(LANDMARKS.keys())

    for i, name in enumerate(BANK_NAMES):
        # Bias some banks to sit near landmarks so demo searches have hits
        if i < len(landmark_names):
            base_lat, base_lng = LANDMARKS[landmark_names[i]]
            lat = round(base_lat + random.uniform(-0.01, 0.01), 4)
            lng = round(base_lng + random.uniform(-0.01, 0.01), 4)
        else:
            lat = round(random.uniform(*LAT_RANGE), 4)
            lng = round(random.uniform(*LNG_RANGE), 4)

        inventory = random_inventory()

        # Guarantee at least one bank has O- (universal donor, most searched)
        if i == 0:
            inventory.append({
                "blood_type": "O-",
                "units": 14,
                "nearest_expiry": (datetime.utcnow() + timedelta(days=20)).strftime("%Y-%m-%d"),
            })

        # Guarantee at least a couple of units expiring very soon (for the alerts demo)
        if i in (1, 2):
            inventory.append({
                "blood_type": random.choice(BLOOD_TYPES),
                "units": random.randint(1, 5),
                "nearest_expiry": (datetime.utcnow() + timedelta(days=random.randint(1, 3))).strftime("%Y-%m-%d"),
            })

        docs.append({
            "bank_id": f"BB{2200 + i}",
            "name": name,
            "location": {"type": "Point", "coordinates": [lng, lat]},
            "address": f"{name.split(' Blood Bank')[0]}, Bengaluru",
            "inventory": inventory,
            "cold_chain_status": random.choice(
                ["compliant", "compliant", "compliant", "excursion"]
            ),
            "last_updated": datetime.utcnow().isoformat(),
        })
    return docs


def main():
    docs = build_docs()
    banks.insert_many(docs)
    banks.create_index([("location", GEOSPHERE)])
    banks.create_index([("inventory.blood_type", 1), ("inventory.nearest_expiry", 1)])
    print(f"Seeded {len(docs)} banks into '{DB_NAME}.banks' and created indexes.")


if __name__ == "__main__":
    main()
