import { useState, useRef, useCallback, useMemo, useEffect } from 'react'

const B  = '2px solid #000'
const BT = '3px solid #000'

const unique = (arr) => [...new Set(arr.filter(Boolean))].sort()

// ── Video helpers ─────────────────────────────────────────────────────────────

function getYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|shorts\/))([^&?/\s]+)/)
  return m ? m[1] : null
}

function getVimeoId(url) {
  if (!url) return null
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}

function isDirectVideo(url) {
  if (!url) return false
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

// ── Pitch brush ───────────────────────────────────────────────────────────────

function PitchBrush({ events, onBrushChange }) {
  const svgRef  = useRef(null)
  const [drag, setDrag]   = useState(false)
  const [start, setStart] = useState(null)
  const [rect, setRect]   = useState(null)

  const pt = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return null
    const br = svg.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(120, (e.clientX - br.left) / br.width  * 120)),
      // y=0 is bottom in data coords → flip the screen y
      y: Math.max(0, Math.min(80,  80 - (e.clientY - br.top) / br.height * 80)),
    }
  }, [])

  const onDown = useCallback((e) => { const p = pt(e); if (p) { setDrag(true); setStart(p); setRect(null); onBrushChange(null) } }, [pt, onBrushChange])
  const onMove = useCallback((e) => {
    if (!drag || !start) return
    const p = pt(e); if (!p) return
    setRect({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) })
  }, [drag, start, pt])
  const onUp = useCallback((e) => {
    if (!drag) return; setDrag(false)
    const p = pt(e); if (!p || !start) return
    const r = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) }
    if (r.w < 2 && r.h < 2) { setRect(null); onBrushChange(null) } else { setRect(r); onBrushChange(r) }
  }, [drag, start, pt, onBrushChange])

  const clearBrush = () => { setRect(null); setStart(null); onBrushChange(null) }

  // cy flipped: y=0 is bottom in data, y=0 is top in SVG
  const dots = useMemo(() => events.map((ev, i) => ({ cx: ev.start_x, cy: 80 - ev.start_y, key: i })), [events])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font)', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, opacity: 0.5 }}>
          DRAG TO SELECT ZONE
        </span>
        {rect && (
          <button onClick={clearBrush} style={{ fontFamily: 'var(--font)', fontSize: 8, fontWeight: 700, background: '#000', color: '#FFD166', border: 'none', padding: '2px 8px', cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}>
            ✕ CLEAR
          </button>
        )}
      </div>
      <svg ref={svgRef} viewBox="-3 0 126 80"
        style={{ width: '100%', border: BT, display: 'block', cursor: 'crosshair', userSelect: 'none', background: '#F4F4F4', overflow: 'visible' }}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => drag && setDrag(false)}>
        <rect x={-3} y={0} width={126} height={80} fill="#F4F4F4" />
        <rect x={0} y={0} width={120} height={80} fill="#F4F4F4" stroke="#000" strokeWidth={0.6} />
        <line x1={60} y1={0} x2={60} y2={80} stroke="#000" strokeWidth={0.4} />
        <circle cx={60} cy={40} r={9.15} fill="none" stroke="#000" strokeWidth={0.4} />
        <circle cx={60} cy={40} r={0.5} fill="#000" />
        <rect x={0}     y={20} width={16.5} height={40} fill="none" stroke="#000" strokeWidth={0.4} />
        <rect x={0}     y={30} width={5.5}  height={20} fill="none" stroke="#000" strokeWidth={0.3} />
        <circle cx={11}  cy={40} r={0.4} fill="#000" />
        <rect x={103.5} y={20} width={16.5} height={40} fill="none" stroke="#000" strokeWidth={0.4} />
        <rect x={114.5} y={30} width={5.5}  height={20} fill="none" stroke="#000" strokeWidth={0.3} />
        <circle cx={109} cy={40} r={0.4} fill="#000" />
        <rect x={-2.5} y={36} width={2.5} height={8} fill="#ddd" stroke="#000" strokeWidth={0.4} />
        <rect x={120}  y={36} width={2.5} height={8} fill="#ddd" stroke="#000" strokeWidth={0.4} />
        {dots.map(d => <circle key={d.key} cx={d.cx} cy={d.cy} r={1.2} fill="#0277B6" opacity={0.45} />)}
        {rect && <rect x={rect.x} y={80 - rect.y - rect.h} width={rect.w} height={rect.h} fill="rgba(255,209,102,0.25)" stroke="#FFD166" strokeWidth={0.8} strokeDasharray="2 1" />}
      </svg>
    </div>
  )
}

// ── Video player ──────────────────────────────────────────────────────────────

function VideoPlayer({ videoUrl, seekTo }) {
  const videoRef = useRef(null)

  const ytId     = getYouTubeId(videoUrl)
  const vmId     = getVimeoId(videoUrl)
  const isDirect = isDirectVideo(videoUrl)

  // Seek direct video without reloading
  useEffect(() => {
    if (isDirect && videoRef.current && seekTo != null) {
      videoRef.current.currentTime = seekTo
      videoRef.current.play().catch(() => {})
    }
  }, [seekTo, isDirect])

  if (!videoUrl) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180, border: BT, background: '#111', color: '#555', fontFamily: 'var(--font)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>
      NO VIDEO URL FOR THIS MATCH
    </div>
  )

  const iframeStyle = { width: '100%', aspectRatio: '16/9', border: 'none', display: 'block' }

  // key changes only when URL or seekTo changes → iframe reloads at the right time
  if (ytId) {
    const src = seekTo != null
      ? `https://www.youtube.com/embed/${ytId}?start=${Math.floor(seekTo)}&autoplay=1&rel=0`
      : `https://www.youtube.com/embed/${ytId}?rel=0`
    return (
      <div style={{ border: BT, background: '#000' }}>
        <iframe key={src} src={src} style={iframeStyle} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title="Match video" />
      </div>
    )
  }

  if (vmId) {
    const src = seekTo != null
      ? `https://player.vimeo.com/video/${vmId}?autoplay=1#t=${Math.floor(seekTo)}s`
      : `https://player.vimeo.com/video/${vmId}`
    return (
      <div style={{ border: BT, background: '#000' }}>
        <iframe key={src} src={src} style={iframeStyle} allow="autoplay; fullscreen" allowFullScreen title="Match video" />
      </div>
    )
  }

  if (isDirect) return (
    <div style={{ border: BT, background: '#000' }}>
      <video ref={videoRef} key={videoUrl} src={videoUrl} controls style={{ width: '100%', display: 'block', aspectRatio: '16/9' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, border: BT, background: '#111', gap: 12, flexDirection: 'column' }}>
      <span style={{ fontFamily: 'var(--font)', fontSize: 9, color: '#888', letterSpacing: 2, textTransform: 'uppercase' }}>EXTERNAL VIDEO LINK</span>
      <a href={videoUrl} target="_blank" rel="noreferrer"
        style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, background: '#FFD166', color: '#000', padding: '8px 18px', textDecoration: 'none', letterSpacing: 2, textTransform: 'uppercase' }}>
        ▶ OPEN VIDEO
      </a>
    </div>
  )
}

// ── Util ──────────────────────────────────────────────────────────────────────

function fmtTime(sec) {
  if (sec == null) return '—'
  return `${Math.floor(sec / 60)}'${String(Math.floor(sec % 60)).padStart(2, '0')}`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HighlightTab({ events = [], playerName, videoUrl: initialVideoUrl, matches = [] }) {
  const [filters, setFilters] = useState({ action: '', outcome: '', type: '' })
  const [brush, setBrush]     = useState(null)
  const [selected, setSelected] = useState(null)
  const [currentVideoUrl, setCurrentVideoUrl] = useState(initialVideoUrl)
  const [seekTo, setSeekTo]   = useState(null)

  // Keep video URL in sync if prop changes
  useEffect(() => { setCurrentVideoUrl(initialVideoUrl); setSeekTo(null) }, [initialVideoUrl])

  const actions  = useMemo(() => unique(events.map(e => e.action)), [events])
  const outcomes = useMemo(() => unique(events.map(e => e.outcome)), [events])
  const types    = useMemo(() => unique(events.map(e => e.type)), [events])

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  const filtered = useMemo(() => events.filter(ev => {
    if (filters.action  && ev.action  !== filters.action)  return false
    if (filters.outcome && ev.outcome !== filters.outcome) return false
    if (filters.type    && ev.type    !== filters.type)    return false
    if (brush) {
      const inStart = ev.start_x >= brush.x && ev.start_x <= brush.x + brush.w && ev.start_y >= brush.y && ev.start_y <= brush.y + brush.h
      const inEnd   = ev.end_x != null && ev.end_y != null && ev.end_x >= brush.x && ev.end_x <= brush.x + brush.w && ev.end_y >= brush.y && ev.end_y <= brush.y + brush.h
      if (!inStart && !inEnd) return false
    }
    return true
  }), [events, filters, brush])

  const handleSelectEvent = (i) => {
    if (selected === i) { setSelected(null); return }
    setSelected(i)
    const ev = filtered[i]
    // In aggregate mode: switch to the correct match video first
    if (matches.length > 0) {
      const m = matches.find(m => m.match_id === ev?.match_id)
      if (m?.video_url) setCurrentVideoUrl(m.video_url)
    }
    // Then seek to the event timestamp
    if (ev?.match_time_seconds != null) setSeekTo(Math.max(0, ev.match_time_seconds - 3))
  }

  const Select = ({ label, value, options, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontFamily: 'var(--font)', fontSize: 8, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ fontFamily: 'var(--font)', fontSize: 10, fontWeight: 700, border: BT, background: value ? '#FFD166' : '#fff', color: '#000', padding: '4px 6px', cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        <option value="">ALL</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div>
      {/* ── Video player ──────────────────────────────────────── */}
      <div style={{ borderBottom: BT }}>
        <div style={{ background: '#000', color: '#FFD166', padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font)' }}>
          MATCH VIDEO
        </div>
        <VideoPlayer videoUrl={currentVideoUrl} seekTo={seekTo} />
      </div>

      {/* ── Filters ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, padding: '10px 12px', flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: B }}>
        <Select label="ACTION"  value={filters.action}  options={actions}  onChange={v => setFilter('action', v)} />
        <Select label="OUTCOME" value={filters.outcome} options={outcomes} onChange={v => setFilter('outcome', v)} />
        <Select label="TYPE"    value={filters.type}    options={types}    onChange={v => setFilter('type', v)} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button onClick={() => { setFilters({ action: '', outcome: '', type: '' }); setBrush(null) }}
            style={{ fontFamily: 'var(--font)', fontSize: 9, fontWeight: 700, background: '#000', color: '#FFD166', border: 'none', padding: '6px 12px', cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}>
            RESET ALL
          </button>
          <span style={{ fontFamily: 'var(--font)', fontSize: 10, fontWeight: 700, opacity: 0.5 }}>
            {filtered.length}/{events.length} EVENTS
          </span>
        </div>
      </div>

      {/* ── Pitch brush + event list ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <div style={{ borderRight: B, padding: 12 }}>
          <PitchBrush events={filtered} onBrushChange={setBrush} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 380, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 1fr 1fr', background: '#000', color: '#FFD166', padding: '5px 8px', fontFamily: 'var(--font)', fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', flexShrink: 0 }}>
            <span>MIN</span><span>ACTION</span><span>OUTCOME</span><span>TYPE</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font)', fontSize: 11, opacity: 0.4, letterSpacing: 2, textTransform: 'uppercase' }}>NO EVENTS MATCH FILTERS</div>
            )}
            {filtered.map((ev, i) => {
              const isSel = selected === i
              return (
                <div key={i} onClick={() => handleSelectEvent(i)}
                  style={{
                    display: 'grid', gridTemplateColumns: '44px 1fr 1fr 1fr',
                    padding: '5px 8px', borderBottom: B,
                    background: isSel ? '#FFD166' : i % 2 === 0 ? '#fff' : '#fafafa',
                    cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 9, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: 0.3, alignItems: 'center',
                  }}>
                  <span style={{ opacity: 0.6, fontSize: 8 }}>{fmtTime(ev.match_time_seconds)}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.action ?? '—'}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: ev.outcome === 'Goal' ? '#09D69F' : ev.outcome === 'Successful' ? '#0277B6' : ev.outcome === 'Unsuccessful' ? '#D90429' : 'inherit' }}>
                    {ev.outcome ?? '—'}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.6 }}>{ev.type ?? '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Expanded event detail ──────────────────────────────── */}
      {selected != null && filtered[selected] && (() => {
        const ev = filtered[selected]
        return (
          <div style={{ borderTop: BT, padding: 12, background: '#fff', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700, color: '#FFD166', background: '#000', padding: '2px 8px', alignSelf: 'flex-start' }}>EVENT DETAIL</div>
            {[
              ['TIME',     fmtTime(ev.match_time_seconds)],
              ['ACTION',   ev.action],
              ['OUTCOME',  ev.outcome],
              ['TYPE',     ev.type],
              ['BODY',     ev.body_part],
              ['START',    ev.start_x != null ? `(${ev.start_x.toFixed(1)}, ${ev.start_y.toFixed(1)})` : null],
              ['END',      ev.end_x   != null ? `(${ev.end_x.toFixed(1)}, ${ev.end_y.toFixed(1)})` : null],
              ['PRESSURE', ev.pressure_on ? 'YES' : 'NO'],
            ].filter(([, v]) => v != null).map(([label, val]) => (
              <div key={label} style={{ fontFamily: 'var(--font)', fontSize: 10 }}>
                <span style={{ fontWeight: 700, opacity: 0.5, letterSpacing: 1, fontSize: 8, textTransform: 'uppercase', display: 'block' }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{val}</span>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
