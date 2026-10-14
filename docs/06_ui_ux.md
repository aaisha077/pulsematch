# UI/UX Doc
## Blood Bank Inventory Matching Network

### Design Principle
Keep it minimal and functional — this is a data/backend demo, not a design showcase. Clean, legible, and fast to click through in a live viva is more valuable than visual polish.

### Screens

**1. Search Screen (default/home)**
- Header: "Blood Bank Inventory Matching Network"
- Blood type dropdown (O+, O-, A+, A-, B+, B-, AB+, AB-)
- Location dropdown (preset Bengaluru points: Koramangala, Whitefield, Jayanagar, MG Road, etc.) or optional manual lat/lng inputs
- Radius input (default 15 km)
- "Find Nearest Stock" button
- Results area: card/list per matching bank, showing:
  - Bank name + address
  - Distance (km)
  - Units available
  - Nearest expiry date
  - Sorted nearest-first (already sorted by backend)
- Empty state: "No stock found within radius — try increasing radius" (also proves radius-escalation logic if implemented)

**2. Expiry Watch Tab**
- Simple table: Bank | Blood Type | Units | Expiry Date
- Sorted soonest-expiring first
- Optional: red highlight row if expiry is within 2 days

**3. (Optional) Map View**
- Leaflet.js map centered on Bengaluru
- Marker per bank (from `/banks`)
- Highlighted/different color marker for banks returned in the last search result

### Color/Style Notes
- Primary color: deep red (#7A0F16 or similar) — thematically appropriate, matches the PDF answer's accent color
- Neutral background, high-contrast text for readability during a projector demo
- No need for animations/transitions — prioritize working functionality over polish

### Component List (if building in React)
- `<SearchForm />` — blood type + location + radius inputs
- `<ResultsList />` — renders bank match cards
- `<ExpiryTable />` — renders expiry alert rows
- `<MapView />` (optional) — Leaflet wrapper

### Demo-Readiness Checklist
- [ ] Text is legible from a distance (font size ≥ 16px for body)
- [ ] Loading state shown while waiting on API (even a simple "Searching...")
- [ ] Results clearly show distance + units, since those are the two numbers proving the query worked
- [ ] No console errors visible during the demo click-path
