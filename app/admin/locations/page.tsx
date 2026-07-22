'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, MapPin, Upload, Image, Loader2 } from 'lucide-react'

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number | null
  longitude: number | null
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
  const [uploading, setUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const uploadPhoto = async (locationId: string): Promise<string | null> => {
    if (!photoFile) return null
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = photoFile.name.split('.').pop() || 'jpg'
      const path = `${locationId}/photo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('locations')
        .upload(path, photoFile, { upsert: true, contentType: photoFile.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('locations').getPublicUrl(path)
      return publicUrl
    } catch (err) {
      console.error('Photo upload failed:', err)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.office_name.trim()) { setError('Office name is required'); return }
    setSaving(true)
    setError('')

    try {
      const supabase = createClient()
      const payload = {
        office_name: form.office_name.trim(),
        building: form.building.trim(),
        room: form.room.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        school: form.school,
        description: form.description.trim() || null,
      }

      if (editItem) {
        const { error: err } = await supabase
          .from('locations').update(payload).eq('id', editItem.id)
        if (err) throw err

        if (photoFile) {
          const url = await uploadPhoto(editItem.id)
          if (url) await supabase.from('locations').update({ photo_url: url }).eq('id', editItem.id)
        }
      } else {
        const { data, error: err } = await supabase
          .from('locations').insert(payload).select().single()
        if (err) throw err

        if (photoFile && data) {
          const url = await uploadPhoto(data.id)
          if (url) await supabase.from('locations').update({ photo_url: url }).eq('id', data.id)
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
      office_name: loc.office_name || '',
      building: loc.building || '',
      room: loc.room || '',
      latitude: loc.latitude?.toString() || '',
      longitude: loc.longitude?.toString() || '',
      school: loc.school || 'ISAP',
      description: loc.description || '',
    })
    setPhotoPreview(loc.photo_url || null)
    setPhotoFile(null)
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

  const removePhoto = async (id: string) => {
    const supabase = createClient()
    await supabase.from('locations').update({ photo_url: null }).eq('id', id)
    setPhotoPreview(null)
    await fetchLocations()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Locations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage campus offices with photos and GPS coordinates
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setPhotoPreview(null); setPhotoFile(null); setError('') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shrink-0"
        >
          <Plus size={14} />
          Add Location
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              backgroundColor: filter === s
                ? s === 'ISAP' ? '#b91c1c' : s === 'MCNP' ? '#1d4ed8' : '#1e293b'
                : 'var(--bg-card)',
              color: filter === s ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${filter === s ? 'transparent' : 'var(--border)'}`,
            }}>
            {s === 'ALL' ? `All (${locations.length})` : `${s} (${locations.filter(l => l.school === s).length})`}
          </button>
        ))}
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
            <button onClick={() => { setShowForm(false); setEditItem(null) }}
              style={{ color: 'var(--text-faint)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Photo upload */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Building / Office Photo
              </label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div
                  className="w-32 h-24 rounded-xl border-2 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                  onClick={() => fileRef.current?.click()}
                >
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Image size={24} style={{ color: 'var(--text-faint)', margin: '0 auto 4px' }} />
                      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Click to upload</p>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all mb-2"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg)' }}
                  >
                    <Upload size={13} />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoPreview(null)
                        setPhotoFile(null)
                        if (editItem) removePhoto(editItem.id)
                      }}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
                    >
                      <X size={12} />
                      Remove photo
                    </button>
                  )}
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-faint)' }}>
                    JPG, PNG. Max 5MB. Students will see this when they tap the location.
                  </p>
                </div>
              </div>
            </div>

            {/* Office name */}
            <div>
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

            {/* School */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>School</label>
              <div className="flex gap-2">
                {(['ISAP', 'MCNP'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setForm({ ...form, school: s })}
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

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this office and its services..."
                rows={2}
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none resize-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* GPS Coordinates */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Latitude
              </label>
              <input
                value={form.latitude}
                onChange={e => setForm({ ...form, latitude: e.target.value })}
                placeholder="e.g. 17.6135"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Longitude
              </label>
              <input
                value={form.longitude}
                onChange={e => setForm({ ...form, longitude: e.target.value })}
                placeholder="e.g. 121.7290"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                💡 Open Google Maps, long press the location, copy the coordinates
              </p>
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
              {saving || uploading
                ? <Loader2 size={15} className="animate-spin" />
                : <Check size={15} />
              }
              {uploading ? 'Uploading photo...' : saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Location'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditItem(null); setPhotoPreview(null); setPhotoFile(null) }}
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
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No locations yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(loc => (
            <div key={loc.id} className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

              {/* Photo */}
              {loc.photo_url ? (
                <div className="h-36 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={loc.photo_url} alt={loc.office_name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center"
                  style={{ backgroundColor: loc.school === 'ISAP' ? '#fee2e2' : '#dbeafe' }}>
                  <div className="text-center">
                    <Image size={24} style={{ color: loc.school === 'ISAP' ? '#dc2626' : '#2563eb', opacity: 0.4, margin: '0 auto 2px' }} />
                    <p className="text-[10px]" style={{ color: loc.school === 'ISAP' ? '#dc2626' : '#2563eb', opacity: 0.5 }}>No photo</p>
                  </div>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{loc.office_name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{loc.building}</p>
                    {loc.room && <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{loc.room}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                    loc.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {loc.school}
                  </span>
                </div>

                {loc.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    {loc.description}
                  </p>
                )}

                {loc.latitude && loc.longitude && (
                  <div className="flex items-center gap-1 mb-3">
                    <MapPin size={10} style={{ color: 'var(--text-faint)' }} />
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                      {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(loc)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                  >
                    <Pencil size={12} />
                    Edit
                  </button>

                  {deleteId === loc.id ? (
                    <div className="flex gap-1.5">
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
                    <button
                      onClick={() => setDeleteId(loc.id)}
                      className="p-2 rounded-xl transition-all hover:bg-red-50 hover:text-red-500"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      <Trash2 size={14} />
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