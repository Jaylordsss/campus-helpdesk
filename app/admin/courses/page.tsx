'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, BookOpen } from 'lucide-react'

type Course = {
  id: string
  name: string
  description: string
  duration: string
  school: string
  has_intersession: boolean
}

const empty = { name: '', description: '', duration: '4 years', school: 'ISAP', has_intersession: false }

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')

  const supabase = createClient()

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('*').order('school').order('name')
    setCourses(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCourses() }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (editId) {
      await supabase.from('courses').update(form).eq('id', editId)
    } else {
      await supabase.from('courses').insert(form)
    }
    await fetchCourses()
    setShowForm(false)
    setEditId(null)
    setForm(empty)
    setSaving(false)
  }

  const handleEdit = (course: Course) => {
    setForm({
      name: course.name,
      description: course.description,
      duration: course.duration,
      school: course.school,
      has_intersession: course.has_intersession,
    })
    setEditId(course.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('courses').delete().eq('id', id)
    await fetchCourses()
    setDeleteId(null)
  }

  const filtered = filterSchool === 'ALL' ? courses : courses.filter(c => c.school === filterSchool)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
          <p className="text-sm text-slate-400 mt-1">Manage programs for ISAP and MCNP</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(empty) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={16} />
          Add Course
        </button>
      </div>

      {/* Filter tabs */}
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
        <span className="text-xs text-slate-400 ml-2">{filtered.length} courses</span>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {editId ? 'Edit Course' : 'Add New Course'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(empty) }}
              className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Course name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Bachelor of Science in Nursing"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Brief course description"
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duration</label>
              <select
                value={form.duration}
                onChange={e => setForm({ ...form, duration: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option>2 years</option>
                <option>3 years</option>
                <option>4 years</option>
                <option>5 years</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">School</label>
              <div className="grid grid-cols-2 gap-2">
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
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, has_intersession: !form.has_intersession })}
                  className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${
                    form.has_intersession ? 'bg-amber-400' : 'bg-slate-200'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    form.has_intersession ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Has Intersession / Summer class</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              <Check size={15} />
              {saving ? 'Saving...' : editId ? 'Update Course' : 'Add Course'}
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

      {/* Courses list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => (
            <div key={course.id} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{course.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{course.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        course.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {course.school}
                      </span>
                      {course.has_intersession && (
                        <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                          Intersession
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-slate-400">{course.duration}</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => handleEdit(course)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      {deleteId === course.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-500 font-medium">Confirm delete?</span>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
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
                          onClick={() => setDeleteId(course.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <BookOpen size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No courses found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}