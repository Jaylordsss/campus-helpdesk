'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, MapPin, Check, X, Image, Loader2 } from 'lucide-react'

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number
  longitude: number
  school: string
  photo_url: string | null
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('locations')
        .select('*')
        .order('school').order('office_name')
      if (mounted) {
        setLocations(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = locations.filter(l => filter === 'ALL' || l.school === filter)

  const fetchLocations = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('school').order('office_name')
    setLocations(data || [])
    setLoading(false)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadPhoto = async (locationId: string): Promise<string | null> => {
    if (!photoFile) return null
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', photoFile)
      formData.append('locationId', locationId)

      const res = await fetch('/api/upload-location-photo', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (result.error) {
        console.error('Upload failed:', result.error)
        setError(`Photo upload failed: ${result.error}`)
        return null
      }

      return result.photo_url
    } catch (err) {
      console.error('Photo upload failed:', err)
      return null
    } finally {
      setUploading(false)
    }
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
        // Update existing
        const { error: updateErr } = await supabase
          .from('locations')
          .update(payload)
          .eq('id', editItem.id)

        if (updateErr) throw updateErr

        // Upload photo if new one selected
        if (photoFile) {
          await uploadPhoto(editItem.id)
          // photo_url is saved inside uploadPhoto via API route
        }
      } else {
        // Insert new
        const { data: newLoc, error: insertErr } = await supabase
          .from('locations')
          .insert(payload)
          .select()
          .single()

        if (insertErr) throw insertErr

        // Upload photo for new location
        if (photoFile && newLoc) {
          await uploadPhoto(newLoc.id)
          // photo_url is saved inside uploadPhoto via API route
        }
      }

      setSuccess(editItem ? 'Location updated!' : 'Location added!')
      setTimeout(() => setSuccess(''), 3000)
      setShowForm(false)
      setEditItem(null)
      setForm(emptyForm)
      setPhotoFile(null)
      setPhotoPreview(null)
      await fetchLocations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
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
    setPhotoFile(null)
    setPhotoPreview(loc.photo_url || null)
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

  const isISAP = (school: string) => school === 'ISAP'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Locations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage campus offices and rooms with GPS coordinates and photos
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditItem(null)
            setForm(emptyForm)
            setPhotoFile(null)
            setPhotoPreview(null)
            setError('')
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shrink-0"
        >
          <Plus size={14} />
          Add Location
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
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
            {f === 'ALL' ? 'All' : f} {f !== 'ALL' && `(${locations.filter(l => l.school === f).length})`}
          </button>
        ))}
        <span className="ml-auto text-xs self-center" style={{ color: 'var(--text-faint)' }}>
          {filtered.length} locations
        </span>
      </div>

      {/* Success / Error */}
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

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              Location Photo
            </label>
            <div
              className="relative w-full h-40 rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:border-slate-400"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              onClick={() => fileRef.current?.click()}
            >
              {photoPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                    <p className="text-white text-xs font-bold">Click to change photo</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2" style={{ color: 'var(--text-faint)' }}>
                  <Image size={28} />
                  <p className="text-xs font-semibold">Click to upload photo</p>
                  <p className="text-[10px]">JPG, PNG up to 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            {photoFile && (
              <p className="text-xs mt-1 text-emerald-600 font-semibold">
                ✓ {photoFile.name} selected
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Office Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Office Name *</label>
              <input
                value={form.office_name}
                onChange={e => setForm({ ...form, office_name: e.target.value })}
                placeholder="e.g. Registrar Office"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Building */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Building</label>
              <input
                value={form.building}
                onChange={e => setForm({ ...form, building: e.target.value })}
                placeholder="e.g. Administration Building"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Room */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Room</label>
              <input
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
                placeholder="e.g. Room 101"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
              <input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Handles enrollment, records, and document requests"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Latitude */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Latitude *</label>
              <input
                value={form.latitude}
                onChange={e => setForm({ ...form, latitude: e.target.value })}
                placeholder="e.g. 17.64272"
                type="number"
                step="any"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Longitude */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Longitude *</label>
              <input
                value={form.longitude}
                onChange={e => setForm({ ...form, longitude: e.target.value })}
                placeholder="e.g. 121.76166"
                type="number"
                step="any"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* School */}
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
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              {(saving || uploading)
                ? <Loader2 size={15} className="animate-spin" />
                : <Check size={15} />
              }
              {uploading ? 'Uploading photo...' : saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Location'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              className="px-5 py-2.5 rounded-xl border text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
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
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <MapPin size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No locations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(loc => (
            <div key={loc.id} className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

              {/* Photo */}
              <div className="h-40 w-full relative overflow-hidden"
                style={{ backgroundColor: isISAP(loc.school) ? '#fee2e2' : '#dbeafe' }}>
                {loc.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${loc.photo_url}?t=${new Date().getTime()}`}
                    alt={loc.office_name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2"
                    style={{ color: isISAP(loc.school) ? '#fca5a5' : '#93c5fd' }}>
                    <Image size={28} />
                    <p className="text-xs font-semibold">No photo</p>
                  </div>
                )}

                {/* School badge */}
                <span className={`absolute top-2 right-2 text-xs font-bold px-2.5 py-1 rounded-full ${
                  isISAP(loc.school) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {loc.school}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{loc.office_name}</p>
                {loc.building && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{loc.building}</p>
                )}
                {loc.room && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{loc.room}</p>
                )}
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
                  <button
                    onClick={() => handleEdit(loc)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-black/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil size={13} />
                    Edit
                  </button>

                  {deleteId === loc.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(loc.id)}
                        disabled={deleting}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 text-white disabled:opacity-50"
                      >
                        {deleting ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(loc.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-red-50 hover:text-red-600"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      <Trash2 size={13} />
                      Delete
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
}}