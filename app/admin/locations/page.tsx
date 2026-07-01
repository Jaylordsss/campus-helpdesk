'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, MapPin } from 'lucide-react'

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number
  longitude: number
  school: string
}

const empty = {
  office_name: '', building: '', room: '',
  latitude: 0, longitude: 0, school: 'ISAP'
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')

  const supabase = createClient()

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('school').order('office_name')
    setLocations(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchLocations() }, [])

  const handleSave = async () => {
    if (!form.office_name.trim()) return
    setSaving(true)
    if (editId) {
      await supabase.from('locations').update(form).eq('id', editId)
    } else {
      await supabase.from('locations').insert(form)
    }
    await fetchLocations()
    setShowForm(false)
    setEditId(null)
    setForm(empty)
    setSaving(false)
  }

  const handleEdit = (loc: Location) => {
    setForm({
      office_name: loc.office_name,
      building: loc.building,
      room: loc.room,
      latitude: loc.latitude,
      longitude: loc.longitude,
      school: loc.school,
    })
    setEditId(loc.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('locations').delete().eq('id', id)
    await fetchLocations()
    setDeleteId(null)
  }

  const filtered = filterSchool === 'ALL' ? locations : locations.filter(l => l.school === filterSchool)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locations</h1>
          <p className="text-sm text-slate-400 mt-1">Manage offices and rooms on campus</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(empty) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={16} />
          Add Location
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['ALL', 'ISAP', 'MCNP'] as const).map((s) => (
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
        <span className="text-xs text-slate-400 ml-2">{filtered.length} locations</span>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {editId ? 'Edit Location' : 'Add New Location'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(empty) }}
              className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Office / Room name</label>
              <input
                value={form.office_name}
                onChange={e => setForm({ ...form, office_name: e.target.value })}
                placeholder="e.g. Registrar Office"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Building</label>
              <input
                value={form.building}
                onChange={e => setForm({ ...form, building: e.target.value })}
                placeholder="e.g. Administration Building"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Room</label>
              <input
                value={form.room}
                onChange={e => setForm({ ...form, room: e.target.value })}
                placeholder="e.g. Room 101"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Latitude</label>
              <input
                type="number"
                step="any"
                value={form.latitude || ''}
                onChange={e => setForm({ ...form, latitude: Number(e.target.value) })}
                placeholder="e.g. 14.5995"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Longitude</label>
              <input
                type="number"
                step="any"
                value={form.longitude || ''}
                onChange={e => setForm({ ...form, longitude: Number(e.target.value) })}
                placeholder="e.g. 120.9842"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

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
                        ? s === 'ISAP' ? 'border-red-400 bg-red-50 text-red-700' : 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Tip: Get coordinates from Google Maps — right-click a location and click the coordinates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.office_name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              <Check size={15} />
              {saving ? 'Saving...' : editId ? 'Update Location' : 'Add Location'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(empty) }}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Locations list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((loc) => (
            <div key={loc.id} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={15} className="text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{loc.office_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{loc.building}</p>
                    {loc.room && <p className="text-xs text-slate-400">{loc.room}</p>}
                    {loc.latitude && loc.longitude ? (
                      <p className="text-[10px] text-slate-300 mt-1 font-mono">
                        {loc.latitude}, {loc.longitude}
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-400 mt-1">No coordinates set</p>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                  loc.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {loc.school}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                <button
                  onClick={() => handleEdit(loc)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                >
                  <Pencil size={13} /> Edit
                </button>
                {deleteId === loc.id ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-red-500 font-medium">Delete?</span>
                    <button onClick={() => handleDelete(loc.id)}
                      className="text-xs font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">Yes</button>
                    <button onClick={() => setDeleteId(null)}
                      className="text-xs font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100">No</button>
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