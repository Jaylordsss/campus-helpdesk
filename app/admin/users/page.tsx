'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, X, Check, Users, Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react'

type Profile = {
  id: string
  name: string
  email: string
  role: string
  school: string
  created_at: string
}

const emptyForm = { name: '', email: '', password: '', school: 'ISAP', role: 'student' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
      .from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const result = await res.json()

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(`Account created for ${form.name} (${form.email})`)
      setForm(emptyForm)
      setShowForm(false)
      await fetchUsers()
    }
    setSaving(false)
  }

  const filtered = users
    .filter(u => filterSchool === 'ALL' || u.school === filterSchool)
    .filter(u =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-400 mt-1">Create and manage student and admin accounts</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={16} />
          Create Account
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl">
          ✓ {success}
        </div>
      )}

      {/* Create account form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Create New Account</h2>
            <button onClick={() => { setShowForm(false); setError('') }}
              className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">

            {/* Role selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Account type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'student' })}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    form.role === 'student'
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <GraduationCap size={16} className="text-slate-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: 'admin' })}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    form.role === 'admin'
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <ShieldCheck size={16} className="text-slate-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700">Admin</span>
                </button>
              </div>
            </div>

            {/* School — students only */}
            {form.role === 'student' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">School</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['ISAP', 'MCNP'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, school: s })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.school === s
                          ? s === 'ISAP' ? 'border-red-400 bg-red-50' : 'border-blue-400 bg-blue-50'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <p className={`text-xs font-bold ${
                        form.school === s
                          ? s === 'ISAP' ? 'text-red-700' : 'text-blue-700'
                          : 'text-slate-700'
                      }`}>{s}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {s === 'ISAP' ? 'International School of Asia and the Pacific' : 'Medical Colleges of Northern Philippines'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Full name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Student's full name"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="student@email.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Password with eye toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-11 text-sm focus:border-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Share this password with the student securely.
              </p>
            </div>

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
                {saving ? 'Creating...' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError('') }}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <span className="text-xs text-slate-400 shrink-0">{filtered.length} users</span>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">School</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-slate-400 px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                          ${user.role === 'admin' ? 'bg-slate-100 text-slate-600' :
                            user.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{user.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        user.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
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
                        <span className="text-xs font-medium text-slate-600 capitalize">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
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