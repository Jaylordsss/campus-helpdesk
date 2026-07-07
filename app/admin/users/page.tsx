'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  Plus, Pencil, Trash2, Search, GraduationCap,
  ShieldCheck, ChevronDown, X, Check, Eye, EyeOff
} from 'lucide-react'

type User = {
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

const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year']

const emptyForm = {
  name: '', email: '', password: '', role: 'student',
  school: 'ISAP', student_id: '', course: '', year_level: '1st Year'
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')
  const [courseFilter, setCourseFilter] = useState('ALL')
  const [yearFilter, setYearFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'student' | 'admin'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)

  const fetchUsers = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const fetchCourses = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('courses')
      .select('id, name, school')
      .order('school').order('name')
    setCourses(data || [])
  }

  useEffect(() => {
    fetchUsers()
    fetchCourses()
  }, [])

  // Filtered courses based on selected school in form
  const formCourses = courses.filter(c => c.school === form.school)

  // Filtered courses for the course filter dropdown
  const filterCourses = schoolFilter === 'ALL'
    ? courses
    : courses.filter(c => c.school === schoolFilter)

  // Apply all filters
  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.student_id?.toLowerCase().includes(search.toLowerCase())
    const matchSchool = schoolFilter === 'ALL' || u.school === schoolFilter
    const matchCourse = courseFilter === 'ALL' || u.course === courseFilter
    const matchYear = yearFilter === 'ALL' || u.year_level === yearFilter
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter
    return matchSearch && matchSchool && matchCourse && matchYear && matchRole
  })

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required')
      return
    }
    if (!editUser && !form.password.trim()) {
      setError('Password is required for new accounts')
      return
    }
    setSaving(true)
    setError('')

    try {
      if (editUser) {
        // Update existing user
        const supabase = createClient()
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name: form.name.trim(),
            school: form.school,
            student_id: form.student_id.trim() || null,
            course: form.course.trim() || null,
            year_level: form.year_level,
            role: form.role,
          })
          .eq('id', editUser.id)

        if (updateError) throw updateError
        setSuccess('User updated successfully!')
      } else {
        // Create new user
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            school: form.school,
            student_id: form.student_id.trim() || null,
            course: form.course.trim() || null,
            year_level: form.year_level,
          })
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
        setSuccess('Account created successfully!')
      }

      setTimeout(() => setSuccess(''), 3000)
      setShowForm(false)
      setEditUser(null)
      setForm(emptyForm)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditUser(user)
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role,
      school: user.school,
      student_id: user.student_id || '',
      course: user.course || '',
      year_level: user.year_level || '1st Year',
    })
    setError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (userId: string) => {
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      setDeleteId(null)
      setSuccess('User deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setSchoolFilter('ALL')
    setCourseFilter('ALL')
    setYearFilter('ALL')
    setRoleFilter('ALL')
  }

  const hasFilters = search || schoolFilter !== 'ALL' || courseFilter !== 'ALL' || yearFilter !== 'ALL' || roleFilter !== 'ALL'

  const adminCount = users.filter(u => u.role === 'admin').length
  const studentCount = users.filter(u => u.role === 'student').length
  const isapCount = users.filter(u => u.school === 'ISAP').length
  const mcnpCount = users.filter(u => u.school === 'MCNP').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Users</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage student and admin accounts
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditUser(null); setForm(emptyForm); setError('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={16} />
          Create Account
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: users.length, color: 'text-slate-700' },
          { label: 'Students', value: studentCount, color: 'text-slate-700' },
          { label: 'ISAP', value: isapCount, color: 'text-red-600' },
          { label: 'MCNP', value: mcnpCount, color: 'text-blue-600' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Success / Error */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <Check size={15} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{success}</p>
        </div>
      )}
      {error && !showForm && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {editUser ? 'Edit User' : 'Create New Account'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditUser(null); setError('') }}
              style={{ color: 'var(--text-faint)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Email *</label>
              <input
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email address"
                disabled={!!editUser}
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Password — only for create */}
            {!editUser && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Password"
                    className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Role</label>
              <div className="flex gap-2">
                {(['student', 'admin'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                    className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold capitalize transition-all"
                    style={{
                      borderColor: form.role === r ? '#1e293b' : 'var(--border)',
                      backgroundColor: form.role === r ? '#1e293b' : 'var(--bg)',
                      color: form.role === r ? '#ffffff' : 'var(--text-muted)',
                    }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* School */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>School</label>
              <div className="flex gap-2">
                {(['ISAP', 'MCNP'] as const).map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm({ ...form, school: s, course: '' })}
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

            {/* Student ID */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Student ID</label>
              <input
                value={form.student_id}
                onChange={e => setForm({ ...form, student_id: e.target.value })}
                placeholder="e.g. 2024-0001"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Course */}
            <div className="relative">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Course</label>
              <button
                type="button"
                onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                className="w-full rounded-xl border px-4 py-2.5 text-sm text-left flex items-center justify-between focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: form.course ? 'var(--text)' : 'var(--text-faint)' }}
              >
                <span className="truncate">{form.course || 'Select course...'}</span>
                <ChevronDown size={15} style={{ color: 'var(--text-faint)' }} />
              </button>
              {showCourseDropdown && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setForm({ ...form, course: '' }); setShowCourseDropdown(false) }}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      — None —
                    </button>
                    {formCourses.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setForm({ ...form, course: c.name }); setShowCourseDropdown(false) }}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-black/5 dark:hover:bg-white/5"
                        style={{
                          color: 'var(--text)',
                          backgroundColor: form.course === c.name ? 'rgba(0,0,0,0.05)' : undefined,
                          fontWeight: form.course === c.name ? 600 : undefined,
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                    {formCourses.length === 0 && (
                      <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-faint)' }}>No courses for {form.school}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Year Level */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Year Level</label>
              <div className="grid grid-cols-4 gap-1.5">
                {yearOptions.map(y => (
                  <button key={y} type="button" onClick={() => setForm({ ...form, year_level: y })}
                    className="py-2 rounded-xl border-2 text-xs font-semibold transition-all"
                    style={{
                      borderColor: form.year_level === y ? '#1e293b' : 'var(--border)',
                      backgroundColor: form.year_level === y ? '#1e293b' : 'var(--bg)',
                      color: form.year_level === y ? '#ffffff' : 'var(--text-muted)',
                    }}>
                    {y.replace(' Year', '')}
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
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={15} />}
              {saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create Account'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditUser(null); setError('') }}
              className="px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or student ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">

          {/* Role filter */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['ALL', 'student', 'admin'] as const).map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className="px-3 py-1.5 text-xs font-semibold capitalize transition-all"
                style={{
                  backgroundColor: roleFilter === r ? '#1e293b' : 'var(--bg)',
                  color: roleFilter === r ? '#ffffff' : 'var(--text-muted)',
                }}>
                {r === 'ALL' ? 'All Roles' : r === 'admin' ? '🛡 Admin' : '👤 Student'}
              </button>
            ))}
          </div>

          {/* School filter */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
              <button key={s} onClick={() => { setSchoolFilter(s); setCourseFilter('ALL') }}
                className="px-3 py-1.5 text-xs font-bold transition-all"
                style={{
                  backgroundColor: schoolFilter === s
                    ? s === 'ISAP' ? '#b91c1c' : s === 'MCNP' ? '#1d4ed8' : '#1e293b'
                    : 'var(--bg)',
                  color: schoolFilter === s ? '#ffffff' : 'var(--text-muted)',
                }}>
                {s === 'ALL' ? 'All Schools' : s}
              </button>
            ))}
          </div>

          {/* Course filter */}
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <option value="ALL">All Courses</option>
            {filterCourses.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Year filter */}
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <option value="ALL">All Year Levels</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Reset */}
          {hasFilters && (
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              <X size={12} />
              Reset
            </button>
          )}
        </div>

        {/* Result count */}
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Showing <span className="font-bold" style={{ color: 'var(--text)' }}>{filtered.length}</span> of {users.length} users
          {hasFilters && ' (filtered)'}
        </p>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No users found</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* ── MOBILE: Card layout ── */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map(user => (
              <div
                key={user.id}
                className="rounded-2xl border p-4"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                {/* Top row — avatar + name + badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                      user.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>
                          {user.name}
                        </p>
                        {user.role === 'admin' && (
                          <ShieldCheck size={13} className="text-slate-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* School badge */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    user.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.school}
                  </span>
                </div>

                {/* Info row */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.student_id && (
                    <span
                      className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                    >
                      {user.student_id}
                    </span>
                  )}
                  {user.year_level && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                    >
                      {user.year_level}
                    </span>
                  )}
                  {user.role === 'admin' && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                      Admin
                    </span>
                  )}
                </div>

                {/* Course */}
                {user.course && (
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {user.course}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => handleEdit(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                  >
                    <Pencil size={13} />
                    Edit
                  </button>

                  {deleteId === user.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deleting}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 text-white disabled:opacity-50"
                      >
                        {deleting ? '...' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold border"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(user.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-red-50 hover:text-red-600"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-faint)' }}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── DESKTOP: Table layout ── */}
          <div className="hidden sm:block rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-bold uppercase tracking-widest"
              style={{ backgroundColor: 'var(--bg)', color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>
              <div className="col-span-4">Name</div>
              <div className="col-span-2">Student ID</div>
              <div className="col-span-3">Course</div>
              <div className="col-span-1">Year</div>
              <div className="col-span-1">School</div>
              <div className="col-span-1">Actions</div>
            </div>

            {filtered.map((user, i) => (
              <div
                key={user.id}
                className="grid grid-cols-12 gap-3 px-5 py-4 items-center transition-all hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                {/* Name + email */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    user.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{user.name}</p>
                      {user.role === 'admin' && <ShieldCheck size={12} className="text-slate-400 shrink-0" />}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-faint)' }}>{user.email}</p>
                  </div>
                </div>

                {/* Student ID */}
                <div className="col-span-2">
                  {user.student_id ? (
                    <span className="text-xs font-mono font-semibold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
                      {user.student_id}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
                  )}
                </div>

                {/* Course */}
                <div className="col-span-3">
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {user.course || '—'}
                  </p>
                </div>

                {/* Year */}
                <div className="col-span-1">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {user.year_level?.replace(' Year', '') || '—'}
                  </p>
                </div>

                {/* School */}
                <div className="col-span-1">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    user.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.school}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-1.5 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil size={14} />
                  </button>

                  {deleteId === user.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deleting}
                        className="text-[10px] font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                      >
                        {deleting ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(user.id)}
                      className="p-1.5 rounded-lg transition-all hover:bg-red-50 hover:text-red-500"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}