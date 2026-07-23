'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, MapPin, Check, X, Loader2 } from 'lucide-react'

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

const emptyForm = {
  office_name: '',
  building: '',
  room: '',
  latitude: '',
  longitude: '',
  school: 'ISAP',
  description: '',
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Location | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [povFile, setPovFile] = useState<File | null>(null)
  const [povPreview, setPovPreview] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const povRef = useRef<HTMLInputElement>(null)

  const fetchLocations = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('school').order('office_name')
    setLocations(data || [])
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    const supabase = createClient()
    supabase
      .from('locations')
      .select('*')
      .order('school').order('office_name')
      .then(({ data }) => {
        if (mounted) {
          setLocations(data || [])
          setLoading(false)
        }
      })
    return () => { mounted = false }
  }, [])

  const filtered = locations.filter(l => filter === 'ALL' || l.school === filter)



  const uploadPhoto = async (locationId: string, file: File, photoType: 'logo' | 'pov'): Promise<void> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('locationId', locationId)
    formData.append('photoType', photoType)
    const res = await fetch('/api/upload-location-photo', {
      method: 'POST',
      body: formData,
    })
    const result = await res.json()
    if (result.error) setError(`Photo upload failed: ${result.error}`)
  }

  const handleSave = async () => {
    if (!form.office_name.trim()) { setError('Office name is required'); return }
    if (!form.latitude || !form.longitude) { setError('GPS coordinates are required'); return }
    setSaving(true)
    setError('')

    try {
      const supabase = createClient()
      const payload = {
        office_name: form.office_name.trim(),
        building: form.building.trim(),
        room: form.room.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        school: form.school,
        description: form.description.trim() || null,
      }

      if (editItem) {
        const { error: updateErr } = await supabase
          .from('locations').update(payload).eq('id', editItem.id)
        if (updateErr) throw updateErr
        setUploading(true)
        if (logoFile) await uploadPhoto(editItem.id, logoFile, 'logo')
        if (povFile) await uploadPhoto(editItem.id, povFile, 'pov')
        setUploading(false)
      } else {
        const { data: newLoc, error: insertErr } = await supabase
          .from('locations').insert(payload).select().single()
        if (insertErr) throw insertErr
        setUploading(true)
        if (logoFile && newLoc) await uploadPhoto(newLoc.id, logoFile, 'logo')
        if (povFile && newLoc) await uploadPhoto(newLoc.id, povFile, 'pov')
        setUploading(false)
      }

      setSuccess(editItem ? 'Location updated!' : 'Location added!')
      setTimeout(() => setSuccess(''), 3000)
      setShowForm(false)
      setEditItem(null)
      setForm(emptyForm)
      setLogoFile(null)
      setLogoPreview(null)
      setPovFile(null)
      setPovPreview(null)
      await fetchLocations()
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : JSON.stringify(err))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (loc: Location) => {
    setEditItem(loc)
    setForm({
      office_name: loc.office_name,
      building: loc.building || '',
      room: loc.room || '',
      latitude: loc.latitude?.toString() || '',
      longitude: loc.longitude?.toString() || '',
      school: loc.school,
      description: loc.description || '',
    })
    setLogoFile(null)
    setLogoPreview(loc.photo_url_logo || null)
    setPovFile(null)
    setPovPreview(loc.photo_url_pov || null)
    setError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('locations').delete().eq('id', id)
    setDeleteId(null)
    setSuccess('Location deleted!')
    setTimeout(() => setSuccess(''), 3000)
    await fetchLocations()
    setDeleting(false)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Locations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage campus offices with GPS coordinates and photos
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditItem(null)
            setForm(emptyForm)
            setError('')
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shrink-0"
        >
          <Plus size={14} />
          Add Location
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', 'ISAP', 'MCNP'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all border"
            style={{
              backgroundColor: filter === f
                ? f === 'ISAP' ? '#b91c1c' : f === 'MCNP' ? '#1d4ed8' : '#1e293b'
                : 'var(--bg-card)',
              color: filter === f ? '#fff' : 'var(--text-muted)',
              borderColor: 'var(--border)',
            }}>
            {f === 'ALL' ? 'All' : f}
          </button>
        ))}
        <span className="text-xs ml-2" style={{ color: 'var(--text-faint)' }}>
          {filtered.length} locations
        </span>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <Check size={14} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{success}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {editItem ? 'Edit Location' : 'Add New Location'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              style={{ color: 'var(--text-faint)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Photo uploads — Logo + POV */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Logo / Room Sign */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                📌 Logo / Room Sign Photo
              </label>
              <p className="text-[10px] mb-2" style={{ color: 'var(--text-faint)' }}>
                Close-up of the office sign, door, or logo
              </p>
              <div
                className="relative w-full h-32 rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                onClick={() => logoRef.current?.click()}
              >
                {logoPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                      <p className="text-white text-[10px] font-bold">Change</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                    <span className="text-2xl">🪧</span>
                    <p className="text-[10px] font-semibold">Upload sign photo</p>
                  </div>
                )}
              </div>
              <input ref={logoRef} type="file" accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setLogoFile(f)
                  const r = new FileReader()
                  r.onload = () => setLogoPreview(r.result as string)
                  r.readAsDataURL(f)
                }}
                style={{ display: 'none' }} />
              {logoFile && <p className="text-[10px] mt-1 text-emerald-600 font-semibold">✓ {logoFile.name}</p>}
            </div>

            {/* POV / Building Photo */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                📷 Building / POV Photo
              </label>
              <p className="text-[10px] mb-2" style={{ color: 'var(--text-faint)' }}>
                Street-view or building exterior photo
              </p>
              <div
                className="relative w-full h-32 rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                onClick={() => povRef.current?.click()}
              >
                {povPreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={povPreview} alt="POV" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                      <p className="text-white text-[10px] font-bold">Change</p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                    <span className="text-2xl">🏛️</span>
                    <p className="text-[10px] font-semibold">Upload building photo</p>
                  </div>
                )}
              </div>
              <input ref={povRef} type="file" accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  setPovFile(f)
                  const r = new FileReader()
                  r.onload = () => setPovPreview(r.result as string)
                  r.readAsDataURL(f)
                }}
                style={{ display: 'none' }} />
              {povFile && <p className="text-[10px] mt-1 text-emerald-600 font-semibold">✓ {povFile.name}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Office Name *</label>
              <input value={form.office_name} onChange={e => setForm({ ...form, office_name: e.target.value })}
                placeholder="e.g. Registrar Office"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Building</label>
              <input value={form.building} onChange={e => setForm({ ...form, building: e.target.value })}
                placeholder="e.g. Administration Building"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Room</label>
              <input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}
                placeholder="e.g. Room 101"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Handles enrollment, records, and documents"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Latitude *</label>
              <input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })}
                placeholder="e.g. 17.64272" type="number" step="any"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Longitude *</label>
              <input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })}
                placeholder="e.g. 121.76166" type="number" step="any"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>School</label>
              <div className="flex gap-2">
                {(['ISAP', 'MCNP'] as const).map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm({ ...form, school: s })}
                    className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all"
                    style={{
                      borderColor: form.school === s ? (s === 'ISAP' ? '#dc2626' : '#2563eb') : 'var(--border)',
                      backgroundColor: form.school === s ? (s === 'ISAP' ? '#fee2e2' : '#dbeafe') : 'var(--bg)',
                      color: form.school === s ? (s === 'ISAP' ? '#b91c1c' : '#1d4ed8') : 'var(--text-muted)',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving || uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {(saving || uploading)
                ? <Loader2 size={15} className="animate-spin" />
                : <Check size={15} />
              }
              {uploading ? 'Uploading...' : saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Location'}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              className="px-5 py-2.5 rounded-xl border text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
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
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <MapPin size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No locations found</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add your first location above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(loc => (
            <div key={loc.id} className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

              {/* Photo */}
              <div className="h-40 w-full relative overflow-hidden"
                style={{ backgroundColor: loc.school === 'ISAP' ? '#fee2e2' : '#dbeafe' }}>
                {loc.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={loc.photo_url}
                    alt={loc.office_name}
                    className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2"
                    style={{ color: loc.school === 'ISAP' ? '#fca5a5' : '#93c5fd' }}>
                    <span className="text-3xl">🖼️</span>
                    <p className="text-xs font-semibold">No photo</p>
                  </div>
                )}
                <span className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full ${
                  loc.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {loc.school}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{loc.office_name}</p>
                {loc.building && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{loc.building}</p>}
                {loc.room && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{loc.room}</p>}
                {loc.description && (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-faint)' }}>{loc.description}</p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <MapPin size={10} style={{ color: 'var(--text-faint)' }} />
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                    {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => handleEdit(loc)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold hover:bg-black/5"
                    style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={13} />Edit
                  </button>

                  {deleteId === loc.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <button onClick={() => handleDelete(loc.id)} disabled={deleting}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 text-white disabled:opacity-50">
                        {deleting ? '...' : 'Yes'}
                      </button>
                      <button onClick={() => setDeleteId(null)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(loc.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold hover:bg-red-50 hover:text-red-600"
                      style={{ color: 'var(--text-faint)' }}>
                      <Trash2 size={13} />Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}