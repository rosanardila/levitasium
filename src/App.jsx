import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from './supabase'
import './App.css'

const CAT_COLORS = {
  music: '#534AB7',
  sport: '#1D9E75',
  art: '#D85A30',
  food: '#BA7517',
  community: '#185FA5',
}
const CAT_LABELS = { music: 'Music', sport: 'Sport', art: 'Art', food: 'Food', community: 'Community' }
const ALL_CATS = Object.keys(CAT_COLORS)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function makeIcon(cat) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${CAT_COLORS[cat]};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

function MapClickHandler({ picking, onPick }) {
  useMapEvents({ click: (e) => { if (picking) onPick(e.latlng) } })
  return null
}

function formatDate(d) {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const MOCK_EVENTS = [
  { id: 1, title: 'Jazz in the Park', date: '2026-06-07', cat: 'music', lat: 48.860, lng: 2.337, desc: 'Free open-air jazz festival near the Seine.' },
  { id: 2, title: '5K Run — Canal Saint-Martin', date: '2026-06-14', cat: 'sport', lat: 48.872, lng: 2.364, desc: 'Community fun run along the canal. All levels welcome.' },
  { id: 3, title: 'Street Art Tour — Belleville', date: '2026-06-10', cat: 'art', lat: 48.871, lng: 2.383, desc: "Guided walking tour of Belleville's murals." },
  { id: 4, title: 'Marché des Producteurs', date: '2026-06-08', cat: 'food', lat: 48.853, lng: 2.351, desc: 'Local farmers market with tasting sessions.' },
  { id: 5, title: 'Repair Café Montmartre', date: '2026-06-21', cat: 'community', lat: 48.887, lng: 2.341, desc: 'Bring anything broken — volunteers help you fix it.' },
]

export default function App() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('map')
  const [search, setSearch] = useState('')
  const [selectedCats, setSelectedCats] = useState(new Set(ALL_CATS))
  const [selectedId, setSelectedId] = useState(null)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [picking, setPicking] = useState(false)
  const [mapRef, setMapRef] = useState(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', cat: 'music', desc: '', lat: '48.8566', lng: '2.3522' })
  const [saving, setSaving] = useState(false)

  const useSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://your-project.supabase.co')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    if (useSupabase) {
      const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true })
      if (!error && data) setEvents(data)
      else { console.warn('Supabase error, falling back to mock data', error); setEvents(MOCK_EVENTS) }
    } else {
      setEvents(MOCK_EVENTS)
    }
    setLoading(false)
  }, [useSupabase])

  useEffect(() => { loadEvents() }, [loadEvents])

  const filtered = events.filter(e =>
    selectedCats.has(e.cat) &&
    (!search || e.title.toLowerCase().includes(search.toLowerCase()) || e.desc?.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => a.date.localeCompare(b.date))

  const selectedEvent = events.find(e => e.id === selectedId)

  function toggleCat(cat) {
    setSelectedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) { if (next.size > 1) next.delete(cat) }
      else next.add(cat)
      return next
    })
  }

  function selectEvent(id) {
    setSelectedId(id)
    const ev = events.find(e => e.id === id)
    if (ev && mapRef && tab === 'map') mapRef.setView([ev.lat, ev.lng], 15)
  }

  async function saveEvent() {
    if (!form.title || !form.date) return alert('Please fill in a title and date.')
    setSaving(true)
    const payload = { title: form.title, date: form.date, cat: form.cat, desc: form.desc, lat: parseFloat(form.lat) || 48.8566, lng: parseFloat(form.lng) || 2.3522 }
    if (useSupabase) {
      const { error } = await supabase.from('events').insert([payload])
      if (error) { alert('Error saving: ' + error.message); setSaving(false); return }
      await loadEvents()
    } else {
      setEvents(prev => [...prev, { ...payload, id: Date.now() }])
    }
    setSaving(false)
    setModalOpen(false)
  }

  function handleMapPick(latlng) {
    setForm(f => ({ ...f, lat: latlng.lat.toFixed(5), lng: latlng.lng.toFixed(5) }))
    setPicking(false)
  }

  // Calendar helpers
  const calDays = (() => {
    const first = new Date(calYear, calMonth, 1)
    const startDow = (first.getDay() + 6) % 7
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const prevDays = new Date(calYear, calMonth, 0).getDate()
    const today = new Date()
    const cells = []
    for (let i = 0; i < startDow; i++) cells.push({ day: prevDays - startDow + 1 + i, cur: false })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d
      const dayEvs = filtered.filter(e => e.date === dateStr)
      cells.push({ day: d, cur: true, isToday, dateStr, evs: dayEvs })
    }
    const used = startDow + daysInMonth
    const rem = (7 - used % 7) % 7
    for (let i = 1; i <= rem; i++) cells.push({ day: i, cur: false })
    return cells
  })()

  return (
    <div className="app">
      {/* Top bar */}
      <div className="topbar">
        <h1 className="logo">Eventful</h1>
        {!useSupabase && <span className="mock-badge">mock data — add Supabase env vars to go live</span>}
        <div className="tab-group">
          <button className={`tab-btn${tab === 'map' ? ' active' : ''}`} onClick={() => setTab('map')}>🗺 Map</button>
          <button className={`tab-btn${tab === 'cal' ? ' active' : ''}`} onClick={() => setTab('cal')}>📅 Calendar</button>
        </div>
        <button className="add-btn" onClick={() => { setForm({ title: '', date: new Date().toISOString().slice(0,10), cat: 'music', desc: '', lat: '48.8566', lng: '2.3522' }); setModalOpen(true) }}>+ Add event</button>
      </div>

      <div className="main">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="search-wrap">
            <input className="search-input" placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="cat-filters">
            {ALL_CATS.map(cat => (
              <button key={cat} className={`cat-chip${selectedCats.has(cat) ? ' on' : ''}`}
                style={selectedCats.has(cat) ? { background: CAT_COLORS[cat], borderColor: CAT_COLORS[cat], color: '#fff' } : {}}
                onClick={() => toggleCat(cat)}>{CAT_LABELS[cat]}</button>
            ))}
          </div>
          <div className="event-list">
            {loading ? <div className="no-events">Loading…</div>
              : filtered.length === 0 ? <div className="no-events">No events found</div>
              : filtered.map(ev => (
                <div key={ev.id} className={`ev-item${ev.id === selectedId ? ' selected' : ''}`} onClick={() => selectEvent(ev.id)}>
                  <div className="ev-title">
                    <span className="ev-dot" style={{ background: CAT_COLORS[ev.cat] }} />
                    {ev.title}
                  </div>
                  <div className="ev-meta">{formatDate(ev.date)}</div>
                </div>
              ))}
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {/* Map */}
          <div className="map-wrap" style={{ display: tab === 'map' ? 'block' : 'none' }}>
            <MapContainer center={[48.866, 2.355]} zoom={13} style={{ height: '100%', width: '100%' }}
              ref={setMapRef}
              whenReady={e => setMapRef(e.target)}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              <MapClickHandler picking={picking} onPick={handleMapPick} />
              {filtered.map(ev => (
                <Marker key={ev.id} position={[ev.lat, ev.lng]} icon={makeIcon(ev.cat)}
                  eventHandlers={{ click: () => setSelectedId(ev.id) }} />
              ))}
            </MapContainer>

            {/* Map overlay */}
            {selectedEvent && tab === 'map' && (
              <div className="map-overlay">
                <button className="ov-close" onClick={() => setSelectedId(null)}>×</button>
                <h3 className="ov-title">{selectedEvent.title}</h3>
                <div className="ov-meta">
                  <span className="ev-dot" style={{ background: CAT_COLORS[selectedEvent.cat] }} />
                  {CAT_LABELS[selectedEvent.cat]} · {formatDate(selectedEvent.date)}
                </div>
                {selectedEvent.desc && <p className="ov-desc">{selectedEvent.desc}</p>}
              </div>
            )}
          </div>

          {/* Calendar */}
          {tab === 'cal' && (
            <div className="calendar-view">
              <div className="cal-nav">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}>←</button>
                <span className="cal-title">{MONTHS[calMonth]} {calYear}</span>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}>→</button>
              </div>
              <div className="cal-grid">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
                {calDays.map((cell, i) => (
                  <div key={i} className={`cal-cell${!cell.cur ? ' other-month' : ''}${cell.isToday ? ' today' : ''}`}>
                    <div className="cal-num">{cell.day}</div>
                    {cell.evs?.slice(0, 3).map(ev => (
                      <div key={ev.id} className="cal-ev-pill" style={{ background: CAT_COLORS[ev.cat] }}
                        title={ev.title} onClick={() => selectEvent(ev.id)}>{ev.title}</div>
                    ))}
                    {cell.evs?.length > 3 && <div className="cal-more">+{cell.evs.length - 3} more</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add event modal */}
      {modalOpen && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h2>New event</h2>
            <div className="field"><label>Title</label><input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="What's happening?" /></div>
            <div className="field"><label>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} /></div>
            <div className="field"><label>Category</label>
              <select value={form.cat} onChange={e => setForm(f => ({...f, cat: e.target.value}))}>
                {ALL_CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="field"><label>Description</label><textarea value={form.desc} onChange={e => setForm(f => ({...f, desc: e.target.value}))} placeholder="Tell us more…" /></div>
            <div className="field">
              <label>Location</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ flex: 1 }} value={form.lat} onChange={e => setForm(f => ({...f, lat: e.target.value}))} placeholder="Lat" />
                <input style={{ flex: 1 }} value={form.lng} onChange={e => setForm(f => ({...f, lng: e.target.value}))} placeholder="Lng" />
                <button className="pick-btn" onClick={() => { setModalOpen(false); setPicking(true) }} title="Pick on map">📍</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-txt2)', marginTop: 4 }}>Or close this and click the map to pick a location</div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-save" onClick={saveEvent} disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
