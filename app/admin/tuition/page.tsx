'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, CreditCard } from 'lucide-react'

type Course = { id: string; name: string; school: string }
type Tuition = {
  id: string
  course_id: string
  year_level: string
  semester: string
  amount: number
  school: string
  courses: { name: string; school: string }
}

const semesterOptions = ['1st Semester', '2nd Semester', 'Intersession']
const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const emptyForm = {
  course_id: '',
  year_level: '1st Year',
  semester: '1st Semester',
  amount: 0,
  school: 'ISAP'
}

export default function AdminTuitionPage() {
  const [tuition, setTuition] = useState<Tuition[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')
  const [filterCourse, setFilterCourse] = useState<string>('ALL')

  const fetchData = async () => {
    const supabase = createClient()
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('tuition').select('*, courses(name, school)')
        .order('school').order('year_level').order('semester'),
      supabase.from('courses').select('id, name, school').order('school').order('name'),
    ])
    setTuition(t || [])
    setCourses(c || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!form.course_id || !form.amount) return
    setSaving(true)
    const supabase = createClient()
    if (editId) {
      await supabase.from('tuition').update(form).eq('id', editId)
    } else {
      await supabase.from('tuition').insert(form)
    }
    await fetchData()
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
    setSaving(false)
  }

  const handleEdit = (t: Tuition) => {
    setForm({
      course_id: t.course_id,
      year_level: t.year_level,
      semester: t.semester,
      amount: t.amount,
      school: t.school
    })
    setEditId(t.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('tuition').delete().eq('id', id)
    await fetchData()
    setDeleteId(null)
  }

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId)
    setForm({ ...form, course_id: courseId, school: course?.school || 'ISAP' })
  }

  const filteredTuition = tuition
    .filter(t => filterSchool === 'ALL' || t.school === filterSchool)
    .filter(t => filterCourse === 'ALL' || t.course_id === filterCourse)

  const grouped = filteredTuition.reduce((acc, item) => {
    const courseName = item.courses?.name || 'Unknown'
    if (!acc[courseName]) acc[courseName] = {}
    if (!acc[courseName][item.year_level]) acc[courseName][item.year_level] = []
    acc[courseName][item.year_level].push(item)
    return acc
  }, {} as Record<string, Record<string, Tuition[]>>)

  const semOrder = ['1st Semester', '2nd Semester', 'Intersession']
  const yearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year']
  const filteredCourses = filterSchool === 'ALL' ? courses : courses.filter(c => c.school === filterSchool)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Tuition Fees</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage fees per course, year level, and semester</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
        >
          <Plus size={14} />
          Add Fee
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setFilterSchool(s); setFilterCourse('ALL') }}
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
        </div>
        <select
          value={filterCourse}
          onChange={e => setFilterCourse(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 focus:border-slate-400 focus:outline-none"
        >
          <option value="ALL">All Courses</option>
          {filteredCourses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {editId ? 'Edit Tuition Fee' : 'Add Tuition Fee'}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Course */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Course</label>
              <select
                value={form.course_id}
                onChange={e => handleCourseChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">Select a course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>[{c.school}] {c.name}</option>
                ))}
              </select>
            </div>

            {/* Year level */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Year Level</label>
              <div className="flex flex-wrap gap-2">
                {yearOptions.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setForm({ ...form, year_level: y })}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      form.year_level === y
                        ? 'border-slate-600 bg-slate-800 text-white'
                        : 'border-slate-100 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Semester */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Semester</label>
              <div className="flex flex-wrap gap-2">
                {semesterOptions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, semester: s })}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      form.semester === s
                        ? s === 'Intersession'
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-slate-600 bg-slate-800 text-white'
                        : 'border-slate-100 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (₱)</label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                placeholder="e.g. 18000"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* School auto */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                School <span className="text-slate-300 font-normal">(auto from course)</span>
              </label>
              <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold border ${
                form.school === 'ISAP'
                  ? 'bg-red-50 border-red-100 text-red-700'
                  : form.school === 'MCNP'
                  ? 'bg-blue-50 border-blue-100 text-blue-700'
                  : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}>
                {form.school || 'Select a course first'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.course_id || !form.amount}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              <Check size={15} />
              {saving ? 'Saving...' : editId ? 'Update' : 'Add Fee'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tuition list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <CreditCard size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No tuition records found</p>
            </div>
          ) : (
            Object.entries(grouped).map(([courseName, byYear]) => {
              const school = Object.values(byYear)[0]?.[0]?.school
              return (
                <div key={courseName} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

                  {/* Course header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <CreditCard size={14} className="text-slate-500" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">{courseName}</h3>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {school}
                    </span>
                  </div>

                  {/* Year groups */}
                  {yearOrder.filter(y => byYear[y]).map(yearLevel => {
                    const records = [...(byYear[yearLevel] || [])]
                      .sort((a, b) => semOrder.indexOf(a.semester) - semOrder.indexOf(b.semester))
                    const yearTotal = records
                      .filter(r => r.semester !== 'Intersession')
                      .reduce((sum, r) => sum + r.amount, 0)

                    return (
                      <div key={yearLevel} className="border-b border-slate-50 last:border-0">

                        {/* Year label row */}
                        <div className="px-5 py-2.5 bg-slate-50 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                            {yearLevel}
                          </span>
                          <span className="text-xs text-slate-400">
                            Total: <span className="font-semibold text-slate-600">₱{yearTotal.toLocaleString()}</span>
                          </span>
                        </div>

                        {/* Semester rows */}
                        {records.map(record => (
                          <div key={record.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              record.semester === 'Intersession'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {record.semester}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-900">
                                ₱{record.amount.toLocaleString()}
                              </span>
                              <button
                                onClick={() => handleEdit(record)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                <Pencil size={13} />
                              </button>
                              {deleteId === record.id ? (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleDelete(record.id)}
                                    className="text-xs font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
                                    Yes
                                  </button>
                                  <button onClick={() => setDeleteId(null)}
                                    className="text-xs font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100">
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteId(record.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}