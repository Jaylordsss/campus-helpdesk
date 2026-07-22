'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MapPin, Search, X, Navigation, Building2, Image } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <div className="text-center">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading map...</p>
      </div>
    </div>
  )
})

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number
  longitude: number
  school: string
  photo_url?: string | null
  description?: string | null
}

export default function MapPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedLoc, setSelectedLoc] = useState<Location | null>(null)
  const [profile, setProfile] = useState<{ school: string } | null>(null)
  const [showPhoto, setShowPhoto] = useState(false)

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
        .from('locations')
        .select('*')
        .order('school').order('office_name')
      setLocations(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleSelect = (loc: Location) => {
    setSelectedId(loc.id)
    setSelectedLoc(loc)
    setShowPhoto(false)
  }

  const filtered = locations.filter(l =>
    !search ||
    l.office_name.toLowerCase().includes(search.toLowerCase()) ||
    l.building?.toLowerCase().includes(search.toLowerCase())
  )

  const isapLocations = filtered.filter(l => l.school === 'ISAP')
  const mcnpLocations = filtered.filter(l => l.school === 'MCNP')

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-4 sm:flex-row">

      {/* Sidebar */}
      <div className="w-full sm:w-72 flex flex-col gap-3 shrink-0 overflow-hidden">

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search offices..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-slate-400" />
            </button>
          )}
        </div>

        {/* Selected location detail card */}
        {selectedLoc && (
          <div className="rounded-2xl border overflow-hidden shrink-0"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

            {/* Photo */}
            {selectedLoc.photo_url ? (
              <div className="relative h-36 bg-slate-100 cursor-pointer" onClick={() => setShowPhoto(true)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedLoc.photo_url}
                  alt={selectedLoc.office_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 right-2 bg-white/90 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                  <Image size={10} />
                  Tap to enlarge
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    selectedLoc.school === 'ISAP' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {selectedLoc.school}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center"
                style={{ backgroundColor: isISAP ? '#fee2e2' : '#dbeafe' }}>
                <Building2 size={32} style={{ color: accentColor, opacity: 0.5 }} />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                    {selectedLoc.office_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {selectedLoc.building}
                  </p>
                  {selectedLoc.room && (
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {selectedLoc.room}
                    </p>
                  )}
                  {selectedLoc.description && (
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {selectedLoc.description}
                    </p>
                  )}
                </div>
                <button onClick={() => { setSelectedId(null); setSelectedLoc(null) }}
                  className="shrink-0 p-1 rounded-lg hover:bg-black/5"
                  style={{ color: 'var(--text-faint)' }}>
                  <X size={14} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Navigation size={11} style={{ color: accentColor }} />
                  <p className="text-[10px] font-semibold" style={{ color: accentColor }}>
                    Enable GPS to get distance
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Location list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {isapLocations.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-red-600">ISAP</p>
                  <div className="space-y-1">
                    {isapLocations.map(loc => (
                      <button
                        key={loc.id}
                        onClick={() => handleSelect(loc)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: selectedId === loc.id ? '#fee2e2' : 'transparent',
                          border: `1px solid ${selectedId === loc.id ? '#fecaca' : 'transparent'}`,
                        }}
                      >
                        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin size={13} className="text-red-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {loc.office_name}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>
                            {loc.building}
                          </p>
                        </div>
                        {loc.photo_url && (
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={loc.photo_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mcnpLocations.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-blue-600">MCNP</p>
                  <div className="space-y-1">
                    {mcnpLocations.map(loc => (
                      <button
                        key={loc.id}
                        onClick={() => handleSelect(loc)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          backgroundColor: selectedId === loc.id ? '#dbeafe' : 'transparent',
                          border: `1px solid ${selectedId === loc.id ? '#bfdbfe' : 'transparent'}`,
                        }}
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin size={13} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                            {loc.office_name}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>
                            {loc.building}
                          </p>
                        </div>
                        {loc.photo_url && (
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={loc.photo_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filtered.length === 0 && (
                <div className="text-center py-8">
                  <MapPin size={24} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-slate-400">No offices found</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-64 rounded-2xl overflow-hidden border"
        style={{ borderColor: 'var(--border)' }}>
        {!loading && (
          <MapComponent
            locations={locations}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* Photo fullscreen modal */}
      {showPhoto && selectedLoc?.photo_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPhoto(false)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowPhoto(false)}
              className="absolute -top-10 right-0 text-white text-sm font-bold flex items-center gap-2"
            >
              <X size={16} /> Close
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedLoc.photo_url}
              alt={selectedLoc.office_name}
              className="w-full rounded-2xl object-cover max-h-[70vh]"
            />
            <div className="mt-3 bg-white rounded-xl p-4">
              <p className="text-sm font-bold text-slate-900">{selectedLoc.office_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedLoc.building} {selectedLoc.room && `· ${selectedLoc.room}`}</p>
              {selectedLoc.description && (
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{selectedLoc.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}