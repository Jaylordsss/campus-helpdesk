'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, MapPin, Navigation } from 'lucide-react'

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number
  longitude: number
  school: string
}

const emptyForm = {
  office_name: '',
  building: '',
  room: '',
  latitude: 0,
  longitude: 0,
  school: 'ISAP'
}

// Parse coordinate string like "17.64272° N" or "17.64272 N" or just "17.64272"
function parseCoordinate(value: string, type: 'lat' | 'lng'): number | null {
  const clean = value.trim().replace(/°/g, '').toUpperCase()
  const match = clean.match(/^(-?\d+\.?\d*)\s*([NSEW])?$/)
  if (!match) return null

  let num = parseFloat(match[1])
  const dir = match[2]

  if (type === 'lat') {
    if (dir === 'S') num = -Math.abs(num)
    if (dir === 'N') num = Math.abs(num)
    if (num < -90 || num > 90) return null
  }

  if (type === 'lng') {
    if (dir === 'W') num = -Math.abs(num)
    if (dir === 'E') num = Math.abs(num)
    if (num < -180 || num > 180) return null
  }

  return num
}

// Format stored decimal to display string
function formatCoord(value: number, type: 'lat' | 'lng'): string {
  if (!value) return ''
  const abs = Math.abs(value)
  const dir = type === 'lat'
    ? value >= 0 ? 'N' : 'S'
    : value >= 0 ? 'E' : 'W'
  return `${abs.toFixed(5)}° ${dir}`
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')
  const [latError, setLatError] = useState('')
  const [lngError, setLngError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')

  const fetchLocations = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('school')
      .order('office_name')
    setLocations(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchLocations() }, [])

  const validateAndSetLat = (value: string) => {
    setLatInput(value)
    if (!value.trim()) { setLatError(''); return }
    const parsed = parseCoordinate(value, 'lat')
    if (parsed === null) {
      setLatError('Invalid. Use format: 17.64272° N or 17.64272')
    } else {
      setLatError('')
      setForm(prev => ({ ...prev, latitude: parsed }))
    }
  }

  const validateAndSetLng = (value: string) => {
    setLngInput(value)
    if (!value.trim()) { setLngError(''); return }
    const parsed = parseCoordinate(value, 'lng')
    if (parsed === null) {
      setLngError('Invalid. Use format: 121.76166° E or 121.76166')
    } else {
      setLngError('')
      setForm(prev => ({ ...prev, longitude: parsed }))
    }
  }

  const openForm = (location?: Location) => {
    if (location) {
      setForm({
        office_name: location.office_name,
        building: location.building,
        room: location.room,
        latitude: location.latitude,
        longitude: location.longitude,
        school: location.school,
      })
      setLatInput(formatCoord(location.latitude, 'lat'))
      setLngInput(formatCoord(location.longitude, 'lng'))
      setEditId(location.id)
    } else {
      setForm(emptyForm)
      setLatInput('')
      setLngInput('')
      setEditId(null)
    }
    setLatError('')
    setLngError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
    setLatInput('')
    setLngInput('')
    setLatError('')
    setLngError('')
  }

  const handleSave = async () => {
    if (!form.office_name.trim()) return
    if (latError || lngError) return

    // Final parse before saving
    if (latInput) {
      const parsed = parseCoordinate(latInput, 'lat')
      if (parsed === null) { setLatError('Invalid latitude'); return }
      form.latitude = parsed
    }
    if (lngInput) {
      const parsed = parseCoordinate(lngInput, 'lng')
      if (parsed === null) { setLngError('Invalid longitude'); return }
      form.longitude = parsed
    }

    setSaving(true)
    const supabase = createClient()
    if (editId) {
      await supabase.from('locations').update(form).eq('id', editId)
    } else {
      await supabase.from('locations').insert(form)
    }
    await fetchLocations()
    closeForm()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('locations').delete().eq('id', id)
    await fetchLocations()
    setDeleteId(null)
  }

  const filtered = filterSchool === 'ALL'
    ? locations
    : locations.filter(l => l.school === filterSchool)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Locations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage campus offices and rooms with GPS coordinates</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
        >
          <Plus size={14} />
          Add Location
        </button>
      </div>
      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterSchool(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterSchool === s
                ? s === 'ISAP' ? 'bg-red-100 text-red-700'
                  : s === 'MCNP' ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-1">{filtered.length} locations</span>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {editId ? 'Edit Location' : 'Add New Location'}
            </h2>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Office name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Office / Room name
              </label>
              <input
                value={form.office_name}
                onChange={e => setForm({ ...form, office_name: e.target.value })}
                placeholder="e.g. Registrar Office"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Building */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Building</label>
              <input
                value={form.building}
                onChange={e => setForm({ ...form, building: e.target.value })}
                placeholder="e.g. Administration Building"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Room */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Room</label>
              <input
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
                placeholder="e.g. Room 101"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Latitude */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Latitude
              </label>
              <input
                value={latInput}
                onChange={e => validateAndSetLat(e.target.value)}
                placeholder="e.g. 17.64272° N"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono ${
                  latError
                    ? 'border-red-300 bg-red-50 focus:border-red-400'
                    : 'border-slate-200 focus:border-slate-400'
                }`}
              />
              {latError && (
                <p className="text-xs text-red-500 mt-1">{latError}</p>
              )}
              {!latError && form.latitude !== 0 && (
                <p className="text-xs text-emerald-600 mt-1 font-mono">
                  ✓ Stored as: {form.latitude.toFixed(5)}
                </p>
              )}
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Longitude
              </label>
              <input
                value={lngInput}
                onChange={e => validateAndSetLng(e.target.value)}
                placeholder="e.g. 121.76166° E"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono ${
                  lngError
                    ? 'border-red-300 bg-red-50 focus:border-red-400'
                    : 'border-slate-200 focus:border-slate-400'
                }`}
              />
              {lngError && (
                <p className="text-xs text-red-500 mt-1">{lngError}</p>
              )}
              {!lngError && form.longitude !== 0 && (
                <p className="text-xs text-emerald-600 mt-1 font-mono">
                  ✓ Stored as: {form.longitude.toFixed(5)}
                </p>
              )}
            </div>

            {/* How to get coordinates tip */}
            <div className="sm:col-span-2 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                <Navigation size={13} />
                How to get accurate coordinates
              </p>
              <div className="space-y-1.5 text-xs text-blue-600">
                <p><span className="font-semibold">iPhone Maps:</span> Long press location → tap the coordinates shown → copy them</p>
                <p><span className="font-semibold">Google Maps (phone):</span> Long press location → coordinates appear at top → tap to copy</p>
                <p><span className="font-semibold">Google Maps (web):</span> Right-click location → click the coordinates shown</p>
                <p className="mt-2 font-semibold text-blue-700">Accepted formats:</p>
                <div className="font-mono bg-white border border-blue-100 rounded-lg px-3 py-2 space-y-0.5">
                  <p>17.64272° N &nbsp;&nbsp; 121.76166° E</p>
                  <p>17.64272 N &nbsp;&nbsp;&nbsp; 121.76166 E</p>
                  <p>17.64272 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 121.76166</p>
                  <p>-17.64272 &nbsp;&nbsp;&nbsp;&nbsp; -121.76166 (for S/W)</p>
                </div>
              </div>
            </div>

            {/* School */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">School</label>
              <div className="grid grid-cols-2 gap-2 max-w-xs">
                {(['ISAP', 'MCNP'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, school: s })}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                      form.school === s
                        ? s === 'ISAP'
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.office_name.trim() || !!latError || !!lngError}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              <Check size={15} />
              {saving ? 'Saving...' : editId ? 'Update Location' : 'Add Location'}
            </button>
            <button
              onClick={closeForm}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Locations grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(loc => (
            <div key={loc.id} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  loc.school === 'ISAP' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <MapPin size={15} className={loc.school === 'ISAP' ? 'text-red-600' : 'text-blue-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{loc.office_name}</h3>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                      loc.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {loc.school}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{loc.building}</p>
                  {loc.room && <p className="text-xs text-slate-400">{loc.room}</p>}

                  {/* Coordinates display */}
                  {loc.latitude && loc.longitude ? (
                    <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                        GPS Coordinates
                      </p>
                      <p className="text-xs font-mono text-slate-600">
                        {formatCoord(loc.latitude, 'lat')} &nbsp; {formatCoord(loc.longitude, 'lng')}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 bg-amber-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-amber-500 font-semibold">
                        ⚠ No coordinates — directions unavailable
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                <button
                  onClick={() => openForm(loc)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                >
                  <Pencil size={13} /> Edit
                </button>
                {deleteId === loc.id ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-red-500 font-medium">Delete?</span>
                    <button
                      onClick={() => handleDelete(loc.id)}
                      className="text-xs font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="text-xs font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteId(loc.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all ml-auto"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="sm:col-span-2 bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <MapPin size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No locations found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}