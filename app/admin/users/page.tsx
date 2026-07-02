'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, X, Check, Users, Eye, EyeOff, GraduationCap, ShieldCheck, Pencil } from 'lucide-react'

type Profile = {
  id: string
  name: string
  email: string
  role: string
  school: string
  student_id: string | null
  course: string | null
  year_level: string | null
  created_at: string
}

type Course = {
  id: string
  name: string
  school: string
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  school: 'ISAP',
  role: 'student',
  student_id: '',
  course: '',
  year_level: '1st Year',
}

const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')
  const [search, setSearch] = useState('')

  const supabase = createClient()

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, name, school')
      .order('school')
      .order('name')
    setCourses(data || [])
  }

  useEffect(() => {
    fetchUsers()
    fetchCourses()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        school: form.school,
        role: form.role,
        student_id: form.student_id || null,
        course: form.course || null,
        year_level: form.year_level || null,
      }),
    })

    const result = await res.json()
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(`Account created for ${form.name}`)
      setForm(emptyForm)
      setShowForm(false)
      await fetchUsers()
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editUserId) return
    setSaving(true)
    setError('')

    await supabase
      .from('profiles')
      .update({
        name: form.name,
        student_id: form.student_id || null,
        course: form.course || null,
        year_level: form.year_level || null,
        school: form.school,
      })
      .eq('id', editUserId)

    setSuccess(`Profile updated for ${form.name}`)
    setEditUserId(null)
    setShowForm(false)
    setForm(emptyForm)
    await fetchUsers()
    setSaving(false)
  }

  const openEditUser = (user: Profile) => {
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      school: user.school || 'ISAP',
      role: user.role || 'student',
      student_id: user.student_id || '',
      course: user.course || '',
      year_level: user.year_level || '1st Year',
    })
    setEditUserId(user.id)
    setShowForm(true)
    setError('')
  }

  const filteredCourses = courses.filter(c => c.school === form.school)

  const filtered = users
    .filter(u => filterSchool === 'ALL' || u.school === filterSchool)
    .filter(u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.student_id?.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create and manage student accounts with ID numbers
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true)
            setEditUserId(null)
            setForm(emptyForm)
            setError('')
            setSuccess('')
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={16} />
          Create Account
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl">
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {editUserId ? 'Edit Student Info' : 'Create New Account'}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditUserId(null); setError('') }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={editUserId ? e => { e.preventDefault(); handleUpdate() } : handleCreate} className="space-y-4">

            {/* Role — only for create */}
            {!editUserId && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Account type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['student', 'admin'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        form.role === r
                          ? 'border-slate-400 bg-slate-50 dark:bg-slate-700'
                          : 'border-slate-100 dark:border-slate-600 hover:border-slate-200'
                      }`}
                    >
                      {r === 'admin'
                        ? <ShieldCheck size={16} className="text-slate-500" />
                        : <GraduationCap size={16} className="text-slate-500" />
                      }
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{r}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* School */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">School</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ISAP', 'MCNP'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, school: s, course: '' })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.school === s
                        ? s === 'ISAP'
                          ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
                          : 'border-blue-400 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-slate-100 dark:border-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <p className={`text-xs font-bold ${
                      form.school === s
                        ? s === 'ISAP' ? 'text-red-700' : 'text-blue-700'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>{s}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Full name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Student full name"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Student ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Student ID Number
              </label>
              <input
                type="text"
                value={form.student_id}
                onChange={e => setForm({ ...form, student_id: e.target.value })}
                placeholder="e.g. 2024-0001"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-400 focus:outline-none font-mono"
              />
            </div>

            {/* Course */}
            {form.role === 'student' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Course</label>
                <select
                  value={form.course}
                  onChange={e => setForm({ ...form, course: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-400 focus:outline-none"
                >
                  <option value="">Select course</option>
                  {filteredCourses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Year level */}
            {form.role === 'student' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Year Level</label>
                <div className="flex gap-2 flex-wrap">
                  {yearOptions.map(y => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setForm({ ...form, year_level: y })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                        form.year_level === y
                          ? 'border-slate-600 bg-slate-800 text-white'
                          : 'border-slate-100 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email — only for create */}
            {!editUserId && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="student@email.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-400 focus:outline-none"
                />
              </div>
            )}

            {/* Password — only for create */}
            {!editUserId && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 pr-11 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
              >
                <Check size={15} />
                {saving
                  ? 'Saving...'
                  : editUserId ? 'Update Student' : 'Create Account'
                }
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditUserId(null); setError('') }}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or student ID..."
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-400 focus:outline-none"
        />
        <span className="text-xs text-slate-400 shrink-0">{filtered.length} users</span>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Student ID</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Course</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Year</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">School</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          user.role === 'admin' ? 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-200'
                            : user.school === 'ISAP' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                        }`}>
                          {user.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                        {user.student_id || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-32 truncate">
                        {user.course || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {user.year_level || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        user.school === 'ISAP'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                      }`}>
                        {user.school}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {user.role === 'admin'
                          ? <ShieldCheck size={13} className="text-slate-500" />
                          : <GraduationCap size={13} className="text-slate-400" />
                        }
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => openEditUser(user)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Users size={28} className="text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No users found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}