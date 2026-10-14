'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Check,
  ChevronDown,
  Droplets,
  Edit2,
  LocateFixed,
  MapPin,
  Navigation,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  Waves,
  X,
} from 'lucide-react'

const API_BASE = 'http://127.0.0.1:8000'

const LANDMARKS: Record<string, { lat: number; lng: number }> = {
  Koramangala: { lat: 12.9352, lng: 77.6245 },
  Whitefield: { lat: 12.9698, lng: 77.7500 },
  Jayanagar: { lat: 12.9308, lng: 77.5838 },
  'MG Road': { lat: 12.9758, lng: 77.6069 },
  Indiranagar: { lat: 12.9784, lng: 77.6408 },
  Malleshwaram: { lat: 13.0035, lng: 77.5709 },
  'Electronic City': { lat: 12.8452, lng: 77.6602 },
}

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']

interface InventoryItem { blood_type: string; units: number; nearest_expiry: string }
interface SearchResult {
  bank_id: string; name: string; address: string
  distance_km: number; units: number; nearest_expiry: string; blood_type: string
  location?: { coordinates: [number, number] }
}
interface ExpiryItem {
  bank_id: string; name: string; address: string
  blood_type: string; units: number; nearest_expiry: string
}
interface BankItem {
  bank_id: string; name: string; address: string
  location: { type: string; coordinates: [number, number] }
  inventory: InventoryItem[]
  cold_chain_status?: string
  last_updated?: string
}

function CountUp({ value, active }: { value: number; active: boolean }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    setCount(0)
    const start = window.setTimeout(() => {
      const timer = window.setInterval(() => setCount((c) => {
        if (c >= value) { window.clearInterval(timer); return value }
        return c + 1
      }), 45)
      return () => window.clearInterval(timer)
    }, 40)
    return () => window.clearTimeout(start)
  }, [active, value])
  return <span>{count}</span>
}

function DropMark({ small = false }: { small?: boolean }) {
  return <span className={`drop-mark ${small ? 'drop-mark-small' : ''}`} aria-hidden="true"><Droplets size={small ? 16 : 25} strokeWidth={2.2} /></span>
}

function coordsToPercent(lng: number, lat: number) {
  const minLng = 77.48, maxLng = 77.76, minLat = 12.82, maxLat = 13.08
  const x = Math.max(10, Math.min(90, ((lng - minLng) / (maxLng - minLng)) * 100))
  const y = Math.max(10, Math.min(90, (1 - (lat - minLat) / (maxLat - minLat)) * 100))
  return { x: Math.round(x), y: Math.round(y) }
}

// ── Admin Panel ────────────────────────────────────────────────────────────────

function AdminPanel({ allBanks, onRefresh }: { allBanks: BankItem[]; onRefresh: () => void }) {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editBank, setEditBank] = useState<BankItem | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Create form state
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '' })
  const [inventory, setInventory] = useState<{ blood_type: string; units: string; nearest_expiry: string }[]>([])
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({ name: '', address: '', lat: '', lng: '' })
  const [editInventory, setEditInventory] = useState<{ blood_type: string; units: string; nearest_expiry: string }[]>([])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Delete ──
  async function handleDelete(bank_id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(bank_id)
    try {
      const res = await fetch(`${API_BASE}/banks/${bank_id}`, { method: 'DELETE' })
      if (res.ok) { showToast(`Deleted ${name}`); onRefresh() }
      else showToast('Delete failed', 'error')
    } catch { showToast('Network error', 'error') }
    finally { setDeleting(null) }
  }

  // ── Create ──
  function addInventoryRow() {
    setInventory([...inventory, { blood_type: 'O-', units: '0', nearest_expiry: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] }])
  }
  function removeInventoryRow(i: number) { setInventory(inventory.filter((_, idx) => idx !== i)) }
  function updateInventoryRow(i: number, field: string, val: string) {
    setInventory(inventory.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.lat || !form.lng) return showToast('Name, lat, lng are required', 'error')
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/banks/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          address: form.address || form.name + ', Bengaluru',
          lat: parseFloat(form.lat),
          lng: parseFloat(form.lng),
          inventory: inventory.map(r => ({ blood_type: r.blood_type, units: parseInt(r.units) || 0, nearest_expiry: r.nearest_expiry })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Created bank ${data.bank_id} ✓`)
        setForm({ name: '', address: '', lat: '', lng: '' })
        setInventory([])
        setView('list')
        onRefresh()
      } else showToast(data.detail || 'Create failed', 'error')
    } catch { showToast('Network error', 'error') }
    finally { setSaving(false) }
  }

  // ── Edit ──
  function openEdit(bank: BankItem) {
    setEditBank(bank)
    setEditForm({
      name: bank.name,
      address: bank.address,
      lat: String(bank.location.coordinates[1]),
      lng: String(bank.location.coordinates[0]),
    })
    setEditInventory(bank.inventory.map(i => ({ blood_type: i.blood_type, units: String(i.units), nearest_expiry: i.nearest_expiry })))
    setView('edit')
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editBank) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/banks/${editBank.bank_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name || undefined,
          address: editForm.address || undefined,
          lat: editForm.lat ? parseFloat(editForm.lat) : undefined,
          lng: editForm.lng ? parseFloat(editForm.lng) : undefined,
          inventory: editInventory.map(r => ({ blood_type: r.blood_type, units: parseInt(r.units) || 0, nearest_expiry: r.nearest_expiry })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(`Updated ${editForm.name} ✓`)
        setView('list')
        onRefresh()
      } else showToast(data.detail || 'Update failed', 'error')
    } catch { showToast('Network error', 'error') }
    finally { setSaving(false) }
  }

  const commonInventoryEditor = (
    inv: typeof inventory,
    updateRow: (i: number, f: string, v: string) => void,
    removeRow: (i: number) => void,
    addRow: () => void
  ) => (
    <div className="admin-inv-editor">
      <div className="admin-inv-head">
        <span>Blood Type</span><span>Units</span><span>Expiry Date</span><span />
      </div>
      {inv.length === 0 && <p className="admin-inv-empty">No inventory rows yet.</p>}
      {inv.map((row, i) => (
        <div className="admin-inv-row" key={i}>
          <select value={row.blood_type} onChange={e => updateRow(i, 'blood_type', e.target.value)}>
            {BLOOD_TYPES.map(bt => <option key={bt}>{bt}</option>)}
          </select>
          <input type="number" min="0" max="999" value={row.units} onChange={e => updateRow(i, 'units', e.target.value)} />
          <input type="date" value={row.nearest_expiry} onChange={e => updateRow(i, 'nearest_expiry', e.target.value)} />
          <button type="button" className="admin-inv-del" onClick={() => removeRow(i)} aria-label="Remove row"><X size={14} /></button>
        </div>
      ))}
      <button type="button" className="admin-add-row" onClick={addRow}><Plus size={14} /> Add blood type</button>
    </div>
  )

  return (
    <section className="admin-section">
      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type === 'error' ? 'admin-toast-error' : ''}`}>
          {toast.type === 'success' ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header bar */}
      <div className="results-heading">
        <div>
          <p className="eyebrow accent-eyebrow">BLOOD BANK MANAGEMENT</p>
          <h2>
            Admin Panel
            <span className="count-pill">{allBanks.length} banks</span>
          </h2>
        </div>
        <div className="admin-header-actions">
          {view !== 'list' && (
            <button className="admin-back-btn" onClick={() => setView('list')}>
              <X size={15} /> Cancel
            </button>
          )}
          {view === 'list' && (
            <button className="admin-create-btn" onClick={() => setView('create')}>
              <Plus size={16} /> Add New Bank
            </button>
          )}
        </div>
      </div>

      {/* ── List View ── */}
      {view === 'list' && (
        <div className="admin-list">
          {allBanks.length === 0 ? (
            <div className="state-card">
              <DropMark />
              <h3>No blood banks found</h3>
              <p>Click "Add New Bank" to create your first entry.</p>
            </div>
          ) : allBanks.map((bank, idx) => (
            <div className="admin-bank-card" key={bank.bank_id || idx}>
              <div className="admin-bank-info">
                <div className="admin-bank-title">
                  <span className="admin-bank-id">{bank.bank_id}</span>
                  <h3>{bank.name}</h3>
                </div>
                <p className="admin-bank-addr"><MapPin size={13} />{bank.address}</p>
                <div className="admin-bank-inv">
                  {bank.inventory.slice(0, 5).map((item, i) => (
                    <span key={i} className="blood-chip admin-inv-chip">
                      {item.blood_type} <em>{item.units}u</em>
                    </span>
                  ))}
                  {bank.inventory.length > 5 && <span className="admin-inv-more">+{bank.inventory.length - 5} more</span>}
                </div>
              </div>
              <div className="admin-bank-actions">
                <button className="admin-edit-btn" onClick={() => openEdit(bank)} aria-label="Edit bank">
                  <Edit2 size={15} /> Edit
                </button>
                <button
                  className="admin-delete-btn"
                  onClick={() => handleDelete(bank.bank_id, bank.name)}
                  disabled={deleting === bank.bank_id}
                  aria-label="Delete bank"
                >
                  <Trash2 size={15} />
                  {deleting === bank.bank_id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create View ── */}
      {view === 'create' && (
        <form className="admin-form" onSubmit={handleCreate}>
          <div className="admin-form-card">
            <p className="admin-form-section-title">Bank Details</p>
            <div className="admin-form-grid">
              <label>Bank Name *
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Apollo Blood Bank" required />
              </label>
              <label>Address
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="e.g. Bannerghatta Road, Bengaluru" />
              </label>
              <label>Latitude *
                <input type="number" step="any" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="e.g. 12.9352" required />
              </label>
              <label>Longitude *
                <input type="number" step="any" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} placeholder="e.g. 77.6245" required />
              </label>
            </div>
          </div>

          <div className="admin-form-card">
            <p className="admin-form-section-title">Inventory</p>
            {commonInventoryEditor(inventory, updateInventoryRow, removeInventoryRow, addInventoryRow)}
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-save-btn" disabled={saving}>
              {saving ? 'Creating…' : <><Plus size={16} /> Create Bank</>}
            </button>
          </div>
        </form>
      )}

      {/* ── Edit View ── */}
      {view === 'edit' && editBank && (
        <form className="admin-form" onSubmit={handleUpdate}>
          <div className="admin-form-card">
            <p className="admin-form-section-title">Edit — {editBank.bank_id}</p>
            <div className="admin-form-grid">
              <label>Bank Name
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </label>
              <label>Address
                <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </label>
              <label>Latitude
                <input type="number" step="any" value={editForm.lat} onChange={e => setEditForm({ ...editForm, lat: e.target.value })} />
              </label>
              <label>Longitude
                <input type="number" step="any" value={editForm.lng} onChange={e => setEditForm({ ...editForm, lng: e.target.value })} />
              </label>
            </div>
          </div>

          <div className="admin-form-card">
            <p className="admin-form-section-title">Inventory</p>
            {commonInventoryEditor(
              editInventory,
              (i, f, v) => setEditInventory(editInventory.map((r, idx) => idx === i ? { ...r, [f]: v } : r)),
              (i) => setEditInventory(editInventory.filter((_, idx) => idx !== i)),
              () => setEditInventory([...editInventory, { blood_type: 'O-', units: '0', nearest_expiry: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] }])
            )}
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="admin-save-btn" disabled={saving}>
              {saving ? 'Saving…' : <><Check size={16} /> Save Changes</>}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function Page() {
  const [tab, setTab] = useState('Search')
  const [bloodType, setBloodType] = useState('O-')
  const [location, setLocation] = useState('Koramangala')
  const [radius, setRadius] = useState('15')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [visibleResults, setVisibleResults] = useState<SearchResult[]>([])

  const [allBanks, setAllBanks] = useState<BankItem[]>([])
  const [expiryList, setExpiryList] = useState<ExpiryItem[]>([])
  const [expiryLoading, setExpiryLoading] = useState(false)
  const [totalBankCount, setTotalBankCount] = useState(17)

  async function fetchBanks() {
    try {
      const res = await fetch(`${API_BASE}/banks`)
      if (res.ok) {
        const data = await res.json()
        setAllBanks(data.banks || [])
        setTotalBankCount(data.count || 17)
      }
    } catch (e) { console.error('Could not fetch banks:', e) }
  }

  useEffect(() => {
    fetchBanks()
    runSearch('O-', 'Koramangala', '15')
  }, [])

  useEffect(() => {
    if (tab === 'Expiry Watch') loadExpiring()
  }, [tab])

  const loadExpiring = async () => {
    setExpiryLoading(true)
    try {
      const res = await fetch(`${API_BASE}/alerts/expiring?days=7`)
      if (res.ok) { const data = await res.json(); setExpiryList(data.alerts || []) }
    } catch (e) { console.error('Failed to load expiring batches:', e) }
    finally { setExpiryLoading(false) }
  }

  const runSearch = async (targetType = bloodType, targetLoc = location, targetRadius = radius) => {
    setLoading(true); setSearched(false)
    const coords = LANDMARKS[targetLoc] || LANDMARKS['Koramangala']
    try {
      const url = `${API_BASE}/banks/nearest?lat=${coords.lat}&lng=${coords.lng}&blood_type=${encodeURIComponent(targetType)}&radius_km=${targetRadius}`
      const res = await fetch(url)
      if (res.ok) { const data = await res.json(); setVisibleResults(data.results || []) }
      else setVisibleResults([])
    } catch { setVisibleResults([]) }
    finally { setSearched(true); setLoading(false) }
  }

  const matchedNames = useMemo(() => new Set(visibleResults.map(b => b.name)), [visibleResults])

  const TABS = [
    { label: 'Search', icon: <Search size={16} /> },
    { label: 'Expiry Watch', icon: <Timer size={16} /> },
    { label: 'Map View', icon: <MapPin size={16} /> },
    { label: 'Admin', icon: <Settings size={16} /> },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="hero-shell">
        <div className="hero-pattern" aria-hidden="true"><Waves size={310} /><Activity size={190} /></div>
        <div className="page-container hero-content">
          <div className="topbar">
            <div className="brand">
              <div className="brand-mark"><DropMark /></div>
              <div>
                <p className="eyebrow">HEALTHCARE NETWORK</p>
                <p className="brand-name">PulseMatch<span>+</span></p>
              </div>
            </div>
            <div className="live-status">
              <span className="status-dot" />Live Atlas Network <span className="status-divider" /> Bengaluru
            </div>
          </div>
          <div className="hero-copy">
            <div>
              <p className="eyebrow hero-eyebrow"><Sparkles size={14} /> FAST, LOCAL, LIFE-SAVING</p>
              <h1>Find the right blood.<br /><em>Right when it matters.</em></h1>
              <p className="hero-subtitle">A live inventory matching network connecting hospitals, banks, and patients across Bengaluru using MongoDB geospatial queries.</p>
            </div>
            <div className="hero-metric">
              <p>NETWORK COVERAGE</p>
              <strong>{totalBankCount}<span>+</span></strong>
              <small>active blood banks</small>
            </div>
          </div>
        </div>
      </header>

      <div className="page-container content-wrap">
        <nav className="tabs" aria-label="Dashboard views">
          {TABS.map(({ label, icon }) => (
            <button key={label} className={tab === label ? 'tab-active' : ''} onClick={() => setTab(label)}>
              {icon}{label}<span className="tab-line" />
            </button>
          ))}
        </nav>

        <div className="tab-panel" key={tab}>
          {tab === 'Search' && (
            <>
              <section className="search-card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow accent-eyebrow">GEOSPATIAL INVENTORY MATCHER</p>
                    <h2>Find nearest stock</h2>
                  </div>
                </div>
                <div className="form-grid">
                  <label>Blood type
                    <select value={bloodType} onChange={e => setBloodType(e.target.value)}>
                      {BLOOD_TYPES.map(item => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label>Starting location
                    <select value={location} onChange={e => setLocation(e.target.value)}>
                      {Object.keys(LANDMARKS).map(item => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label>Radius <span className="label-muted">in kilometres</span>
                    <div className="radius-input">
                      <input type="number" min="1" max="50" value={radius} onChange={e => setRadius(e.target.value)} />
                      <span>km</span>
                    </div>
                  </label>
                  <button className="search-button" onClick={() => runSearch(bloodType, location, radius)} disabled={loading}>
                    {loading ? <><DropMark small />Searching network</> : <><LocateFixed size={18} />Find Nearest Stock</>}
                  </button>
                </div>
              </section>

              <section className="results-section">
                <div className="results-heading">
                  <div>
                    <p className="eyebrow accent-eyebrow">MATCH RESULTS</p>
                    <h2>Available nearby <span className="count-pill"><CountUp value={visibleResults.length} active={searched} /> matches</span></h2>
                  </div>
                  <p className="sort-note"><Navigation size={14} /> Ranked by distance</p>
                </div>
                {loading ? (
                  <div className="state-card"><DropMark /><h3>Scanning the network</h3><p>Executing geospatial search near {location}...</p></div>
                ) : !searched || visibleResults.length === 0 ? (
                  <div className="state-card"><DropMark /><h3>No stock found within {radius} km</h3><p>Try increasing your search radius or selecting another blood type.</p></div>
                ) : (
                  <div className="result-list">
                    {visibleResults.map((bank, index) => (
                      <article className={`result-card ${index === 0 ? 'nearest-card' : ''}`} style={{ '--delay': `${index * 80}ms` } as React.CSSProperties} key={`${bank.bank_id || bank.name}-${bank.blood_type || ''}-${index}`}>
                        <div className="result-top">
                          <div>
                            <div className="bank-title">
                              {index === 0 && <span className="nearest-badge">NEAREST</span>}
                              <h3>{bank.name}</h3>
                            </div>
                            <p><MapPin size={14} />{bank.address}</p>
                          </div>
                          <span className="blood-chip">{bank.blood_type || bloodType}</span>
                        </div>
                        <div className="result-stats">
                          <div><small>DISTANCE</small><strong>{bank.distance_km}<span> km</span></strong></div>
                          <div><small>UNITS AVAILABLE</small><strong>{bank.units}<span> units</span></strong></div>
                          <div><small>NEAREST EXPIRY</small><strong className="expiry-value">{bank.nearest_expiry}</strong></div>
                          <button aria-label={`View ${bank.name} location`}><Navigation size={17} /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {tab === 'Expiry Watch' && (
            <section className="expiry-section">
              <div className="results-heading">
                <div>
                  <p className="eyebrow accent-eyebrow">INVENTORY HEALTH AGGREGATION</p>
                  <h2>Expiry watch (Next 7 Days)</h2>
                </div>
                <p className="sort-note"><Timer size={14} /> MongoDB Aggregation Pipeline</p>
              </div>
              {expiryLoading ? (
                <div className="state-card"><DropMark /><h3>Calculating expiring stock...</h3></div>
              ) : expiryList.length === 0 ? (
                <div className="state-card"><DropMark /><h3>No critical expiries detected within 7 days</h3></div>
              ) : (
                <div className="table-card">
                  <div className="table-head"><span>Blood bank</span><span>Type</span><span>Units</span><span>Expiry date</span></div>
                  {expiryList.map((row, idx) => {
                    const isUrgent = new Date(row.nearest_expiry).getTime() - new Date().getTime() < 3 * 86400000
                    return (
                      <div className={`expiry-row ${isUrgent ? 'urgent-row' : ''}`} key={`${row.name}-${row.blood_type}-${idx}`}>
                        <div><strong>{row.name}</strong><small>{row.address}</small></div>
                        <span className="blood-chip">{row.blood_type}</span>
                        <strong>{row.units}</strong>
                        <strong className="date-value">{row.nearest_expiry}</strong>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {tab === 'Map View' && (
            <section className="map-section">
              <div className="results-heading">
                <div>
                  <p className="eyebrow accent-eyebrow">GEOSPATIAL DISTRIBUTION</p>
                  <h2>Blood banks in Bengaluru</h2>
                </div>
                <p className="sort-note"><span className="status-dot" /> {matchedNames.size} matched / {allBanks.length || totalBankCount} total banks</p>
              </div>
              <div className="map-card">
                <div className="map-label"><MapPin size={16} /> Bengaluru, Karnataka</div>
                <div className="map-roads" aria-hidden="true"><span /><span /><span /><span /></div>
                {allBanks.map((bank, index) => {
                  const [lng, lat] = bank.location.coordinates
                  const pos = coordsToPercent(lng, lat)
                  const isMatched = matchedNames.has(bank.name)
                  return (
                    <button key={`${bank.bank_id || bank.name}-${index}`} className={`map-marker ${isMatched ? 'matched-marker' : ''}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} aria-label={bank.name}>
                      <span />
                      <small>{bank.name.replace(' Blood Bank', '').replace(' Hospital', '')}</small>
                    </button>
                  )
                })}
                <div className="map-legend">
                  <span><i className="legend-dot matched-dot" />Matched in current search ({matchedNames.size})</span>
                  <span><i className="legend-dot" />Other active banks</span>
                </div>
              </div>
            </section>
          )}

          {tab === 'Admin' && (
            <AdminPanel allBanks={allBanks} onRefresh={fetchBanks} />
          )}
        </div>

        <footer>
          <span><DropMark small /> PulseMatch+ Network</span>
          <span>Powered by FastAPI &amp; MongoDB Atlas · Live 2dsphere Geospatial Indexing</span>
        </footer>
      </div>
    </main>
  )
}
