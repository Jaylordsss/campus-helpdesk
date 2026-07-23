'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import dynamic from 'next/dynamic'
import {
  Search, MapPin, X, Share2, Maximize2,
  Minimize2, Navigation, Building2, StopCircle
} from 'lucide-react'

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false })

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number
  longitude: number
  school: string
  photo_url: string | null
  photo_url_logo: string | null
  photo_url_pov: string | null
  description: string | null
}

export default function MapPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState<{ school: string } | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<'pov' | 'logo'>('pov')
  const [tracking, setTracking] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [distance, setDistance] = useState<number | null>(null)

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase
          .from('profiles').select('school').eq('id', user.id).single()
        if (prof) setProfile(prof)
      }
      const { data } = await supabase
        .from('locations').select('*').order('school').order('office_name')
      setLocations(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const selected = locations.find(l => l.id === selectedId)

  const filtered = locations.filter(l =>
    !search ||
    l.office_name.toLowerCase().includes(search.toLowerCase()) ||
    l.building?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (loc: Location) => {
    setSelectedId(loc.id)
    setShowDetail(true)
    setDetailTab('pov')
    setDistance(null)
    // Auto scroll to top so map + detail panel are visible
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Also scroll the inner content div to top
      const contentDiv = document.getElementById('map-content')
      if (contentDiv) contentDiv.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }

  const handleDirections = async () => {
    if (!selectedId) return
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device')
      return
    }
    if (tracking) {
      setTracking(false)
      setDistance(null)
      return
    }
    const perm = await Notification.requestPermission().catch(() => 'default')
    setTracking(true)
    setGpsError('')
  }

  const handleShare = async (loc: Location) => {
    const text = `${loc.office_name}\n${loc.building}${loc.room ? `, ${loc.room}` : ''}`
    const url = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
    if (navigator.share) {
      await navigator.share({ title: loc.office_name, text, url })
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      alert('Location link copied!')
    }
  }

  const handleTrackingUpdate = (
    pos: { lat: number; lng: number } | null,
    dist: number | null
  ) => {
    setDistance(dist)
    if (!pos) setTracking(false)
  }

  const formatDistance = (m: number) => m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
  const formatWalk = (m: number) => {
    const min = Math.round(m / 80)
    return min < 1 ? 'Almost there!' : `~${min} min walk`
  }

  return (
    <>
      {/* ── FULLSCREEN ── */}
      {fullscreen && (
        <div className="fixed inset-0 z-50">
          <div className="relative w-full h-full">
            <MapComponent
              locations={locations}
              selectedId={selectedId}
              onSelect={handleSelect}
              trackingActive={tracking}
              onTrackingUpdate={handleTrackingUpdate}
            />
            <button
              onClick={() => setFullscreen(f => !f)}
              className="absolute bottom-3 left-3 z-[999] flex items-center gap-1.5 px-2.5 py-2 bg-white rounded-xl shadow-md text-xs font-bold text-slate-700"
            >
              <Minimize2 size={13} />Exit
            </button>
            {tracking && (
              <div className="absolute top-3 left-3 z-[999] flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 rounded-xl shadow">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-bold text-white">GPS Active</span>
              </div>
            )}
            {distance !== null && selected && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[999]">
                <div className="bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 border border-slate-100">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Distance</p>
                    <p className="text-xl font-black text-slate-900">{formatDistance(distance)}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-200" />
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Walk</p>
                    <p className="text-sm font-bold text-emerald-600">{formatWalk(distance)}</p>
                  </div>
                  {distance < 20 && (
                    <>
                      <div className="w-px h-10 bg-slate-200" />
                      <p className="text-sm font-bold text-emerald-500 animate-pulse">✅ Arrived!</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          {showDetail && selected && (
            <div className="absolute bottom-0 left-0 right-0 z-[1000]">
              <LocationDetailPanel
                loc={selected}
                tab={detailTab}
                setTab={setDetailTab}
                onClose={() => setShowDetail(false)}
                onShare={handleShare}
                onDirections={handleDirections}
                tracking={tracking}
                accentColor={accentColor}
              />
            </div>
          )}
        </div>
      )}

      {/* ── NORMAL ── */}
      {!fullscreen && (
        <div className="flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>

          {/* Map — top 45% */}
          <div className="relative shrink-0" style={{ height: showDetail ? '38vh' : '46vh' }}>
            <div className="relative shrink-0" style={{ height: showDetail ? '38vh' : '46vh' }}>
              <div className="relative w-full h-full">
                <MapComponent
                  locations={locations}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  trackingActive={tracking}
                  onTrackingUpdate={handleTrackingUpdate}
                />
                <button
                  onClick={() => setFullscreen(f => !f)}
                  className="absolute bottom-3 left-3 z-[999] flex items-center gap-1.5 px-2.5 py-2 bg-white rounded-xl shadow-md text-xs font-bold text-slate-700"
                >
                  <Maximize2 size={13} />Full
                </button>
                {tracking && (
                  <div className="absolute top-3 left-3 z-[999] flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 rounded-xl shadow">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-white">GPS Active</span>
                  </div>
                )}
                {gpsError && (
                  <div className="absolute top-14 left-3 z-[999] bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <p className="text-xs text-red-600 font-semibold">{gpsError}</p>
                  </div>
                )}
                {distance !== null && selected && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[999]">
                    <div className="bg-white rounded-2xl shadow-xl px-4 py-2.5 flex items-center gap-3 border border-slate-100">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Distance</p>
                        <p className="text-lg font-black text-slate-900">{formatDistance(distance)}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Walk</p>
                        <p className="text-xs font-bold text-emerald-600">{formatWalk(distance)}</p>
                      </div>
                      {distance < 20 && (
                        <p className="text-xs font-bold text-emerald-500 animate-pulse">✅ Arrived!</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom content */}
          <div id="map-content" className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg)' }}>

            {/* Detail panel */}
            {showDetail && selected && (
              <div className="px-4 pt-4">
                <LocationDetailPanel
                  loc={selected}
                  tab={detailTab}
                  setTab={setDetailTab}
                  onClose={() => { setShowDetail(false); setSelectedId(null); setTracking(false); setDistance(null) }}
                  onShare={handleShare}
                  onDirections={handleDirections}
                  tracking={tracking}
                  accentColor={accentColor}
                />
              </div>
            )}

            {/* Search */}
            <div className="px-4 pt-4 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search offices, buildings..."
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X size={14} style={{ color: 'var(--text-faint)' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Location list */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="px-4 pb-6">
                {(['ISAP', 'MCNP'] as const).map(school => {
                  const schoolLocs = filtered.filter(l => l.school === school)
                  if (schoolLocs.length === 0) return null
                  return (
                    <div key={school}>
                      <p className="text-[10px] font-bold uppercase tracking-widest py-2 mt-2"
                        style={{ color: school === 'ISAP' ? '#dc2626' : '#2563eb' }}>
                        {school}
                      </p>
                      {schoolLocs.map(loc => (
                        <button key={loc.id} onClick={() => handleSelect(loc)}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all mb-1"
                          style={{
                            backgroundColor: selectedId === loc.id
                              ? school === 'ISAP' ? '#fee2e2' : '#dbeafe'
                              : 'var(--bg-card)',
                            border: `1px solid ${selectedId === loc.id
                              ? school === 'ISAP' ? '#fecaca' : '#bfdbfe'
                              : 'var(--border)'}`,
                          }}>
                          {/* Thumbnail */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: school === 'ISAP' ? '#fee2e2' : '#dbeafe' }}>
                            {(loc.photo_url_logo || loc.photo_url_pov || loc.photo_url) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={loc.photo_url_logo || loc.photo_url_pov || loc.photo_url || ''}
                                alt={loc.office_name}
                                className="w-full h-full object-cover"
                                onError={e => { e.currentTarget.style.display = 'none' }}
                              />
                            ) : (
                              <MapPin size={16} style={{ color: school === 'ISAP' ? '#dc2626' : '#2563eb' }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate"
                              style={{ color: selectedId === loc.id ? (school === 'ISAP' ? '#b91c1c' : '#1d4ed8') : 'var(--text)' }}>
                              {loc.office_name}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              {loc.building}{loc.room ? ` · ${loc.room}` : ''}
                            </p>
                          </div>

                          <Navigation size={14} className="shrink-0"
                            style={{ color: selectedId === loc.id ? accentColor : 'var(--text-faint)' }} />
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Location Detail Panel ─────────────────────────────────────────────────
function LocationDetailPanel({
  loc, tab, setTab, onClose, onShare, onDirections, tracking, accentColor
}: {
  loc: Location
  tab: 'pov' | 'logo'
  setTab: (t: 'pov' | 'logo') => void
  onClose: () => void
  onShare: (loc: Location) => void
  onDirections: () => void
  tracking: boolean
  accentColor: string
}) {
  const hasPov = !!(loc.photo_url_pov || loc.photo_url)
  const hasLogo = !!loc.photo_url_logo
  const currentPhoto = tab === 'pov'
    ? (loc.photo_url_pov || loc.photo_url)
    : loc.photo_url_logo

  return (
    <div className="rounded-2xl border overflow-hidden shadow-sm"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

      {/* Photo */}
      {(hasPov || hasLogo) && (
        <div className="relative h-36 sm:h-44">
          {currentPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentPhoto} alt={loc.office_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: loc.school === 'ISAP' ? '#fee2e2' : '#dbeafe' }}>
              <Building2 size={36} style={{ color: loc.school === 'ISAP' ? '#fca5a5' : '#93c5fd' }} />
            </div>
          )}

          {/* Photo switcher */}
          {hasPov && hasLogo && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/50 rounded-full p-1">
              <button onClick={() => setTab('pov')}
                className="px-3 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: tab === 'pov' ? '#fff' : 'transparent', color: tab === 'pov' ? '#1e293b' : '#fff' }}>
                📷 Building
              </button>
              <button onClick={() => setTab('logo')}
                className="px-3 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: tab === 'logo' ? '#fff' : 'transparent', color: tab === 'logo' ? '#1e293b' : '#fff' }}>
                🪧 Sign
              </button>
            </div>
          )}

          <button onClick={onClose}
            className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
            <X size={13} className="text-white" />
          </button>
        </div>
      )}

      {!hasPov && !hasLogo && (
        <div className="flex justify-end px-3 pt-3">
          <button onClick={onClose} style={{ color: 'var(--text-faint)' }}><X size={18} /></button>
        </div>
      )}

      {/* Info + actions */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{loc.office_name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {loc.building}{loc.room ? ` · ${loc.room}` : ''}
            </p>
            {loc.description && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{loc.description}</p>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
            loc.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {loc.school}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Directions — starts GPS tracking */}
          <button
            onClick={onDirections}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
            style={{
              backgroundColor: tracking ? '#ef4444' : accentColor,
            }}
          >
            {tracking
              ? <StopCircle size={16} className="text-white" />
              : <Navigation size={16} className="text-white" />
            }
            <span className="text-[10px] font-bold text-white">
              {tracking ? 'Stop' : 'Directions'}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={() => onShare(loc)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <Share2 size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Share</span>
          </button>

          {/* Copy coordinates */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${loc.latitude},${loc.longitude}`)
              alert('Coordinates copied!')
            }}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Copy Pin</span>
          </button>
        </div>

        <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-faint)' }}>
          📍 {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
        </p>
      </div>
    </div>
  )
}