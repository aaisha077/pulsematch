# Product Requirements Document (PRD)
## Blood Bank Inventory Matching Network

### 1. Overview
A demo web application that lets blood banks maintain live inventory records in MongoDB, and lets a hospital/requester find the nearest bank with a needed blood type in real time — plus a view of units nearing expiry that should be redistributed.

This is built to demonstrate the MongoDB big-data concepts from the assignment (geospatial queries, aggregation pipeline, flexible schema) as a **working, demoable application**, not a production system.

### 2. Problem
- No real-time visibility across blood banks → shortages during emergencies even when nearby stock exists.
- No expiry tracking across banks → wastage of soon-to-expire units that could be redirected.

### 3. Goals for the Demo
- Show live data in MongoDB (seeded, realistic-looking).
- Show a **working geospatial "find nearest bank with X blood type" query** end-to-end (UI → API → MongoDB → result).
- Show a **working aggregation pipeline** for expiry alerts.
- Be demoable in under 2 minutes to an examiner.

### 4. Out of Scope (for this demo)
- Real authentication/user accounts
- Real SMS/push notifications (can mock/log instead)
- Real donor management workflows
- Production-grade sharding/replica set (mention conceptually, don't need to actually deploy multi-node cluster)

### 5. Core Features (MVP)

| # | Feature | Priority |
|---|---|---|
| 1 | Seed database with ~15–20 blood banks across Bengaluru (name, location, inventory per type) | Must |
| 2 | API: "Find nearest banks with blood type X within radius Y" (geospatial) | Must |
| 3 | API: "List units expiring within N days" (aggregation) | Must |
| 4 | Simple frontend: search form (blood type + location) → results list with distance & units | Must |
| 5 | Simple frontend: expiry alert dashboard table | Should |
| 6 | Map view (marker per bank, highlight matches) | Nice-to-have |
| 7 | Mock "alert sent" log when a match is found | Nice-to-have |

### 6. User Flow (primary)
1. User opens app, selects a blood type and a location (or uses a preset hospital location).
2. Clicks "Find Nearest Stock."
3. App calls backend → backend runs `$geoNear` + `$match` aggregation on MongoDB.
4. Results shown: bank name, distance, units available, expiry of nearest batch — sorted by distance.

### 7. Success Criteria for Demo
- Can search a blood type and get real ranked results from MongoDB (not hardcoded).
- Can show the expiry-alert list populated from an aggregation query.
- Can explain the schema and show at least one raw document in MongoDB Compass/Atlas UI live.

### 8. Target Stack
See TRD for details — FastAPI + PyMongo + MongoDB Atlas (free tier) + simple HTML/JS frontend, buildable and deployable same day.
