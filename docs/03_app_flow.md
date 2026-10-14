# App Flow
## Blood Bank Inventory Matching Network

### Primary Flow — "Find Nearest Stock"
```
User opens app
      |
      v
Selects blood type (dropdown: O+, O-, A+, A-, B+, B-, AB+, AB-)
      |
      v
Selects/enters location (dropdown of preset Bengaluru hospitals, or lat/lng)
      |
      v
Clicks "Find Nearest Stock"
      |
      v
Frontend calls  GET /banks/nearest?lat=..&lng=..&blood_type=..&radius_km=15
      |
      v
Backend runs $geoNear + $unwind + $match + $sort aggregation on MongoDB
      |
      v
Results returned: [ {bank name, distance_km, units, nearest_expiry}, ... ]
      |
      v
Frontend renders ranked list (nearest first)
      |
      v
(optional) Click a result -> mock "Alert sent to bank" confirmation logged
```

### Secondary Flow — "Expiry Watch Dashboard"
```
User opens "Expiring Soon" tab
      |
      v
Frontend calls  GET /alerts/expiring?days=5
      |
      v
Backend runs $unwind + $match aggregation on MongoDB
      |
      v
Table rendered: bank name, blood type, units, expiry date
      |
      v
(explain in demo: "these units would be auto-flagged for redistribution")
```

### Dev/Setup Flow — "Seed Data"
```
Run seed script (or POST /banks/seed)
      |
      v
15-20 bank documents inserted into MongoDB with realistic
Bengaluru coordinates + randomized inventory + expiry dates
      |
      v
2dsphere index created on `location`
      |
      v
App is ready to demo
```

### What to Show Live in the Demo (viva order)
1. Open MongoDB Atlas → show the `banks` collection, click into one raw document (proves flexible schema + geospatial field).
2. Open `/docs` (FastAPI Swagger) → run `/banks/nearest` live, show JSON response.
3. Switch to frontend → same search, shown nicely.
4. Run `/alerts/expiring` → show expiry table.
5. Briefly point at the index definition (`2dsphere`) and explain why it makes the geo query fast.
