'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, Check, X, Megaphone, Eye, EyeOff } from 'lucide-react'

type Announcement = {
  id: string
  title: string
  content: string
  type: string
  school: string
  course_target: string
  is_active: boolean
  created_at: string
  expires_at: string | null
}

type Course = {
  id: string
  name: string
  school: string
}

const emptyForm = {
  title: '',
  content: '',
  type: 'general',
  school: 'BOTH',
  course_target: 'ALL',
  expires_at: '',
}

const ANNOUNCEMENT_TYPES = [
  { value: 'general', label: 'General', color: '#64748b', bg: '#f1f5f9' },
  { value: 'enrollment', label: 'Enrollment', color: '#2563eb', bg: '#dbeafe' },
  { value: 'event', label: 'Event', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'holiday', label: 'Holiday', color: '#d97706', bg: '#fef3c7' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626', bg: '#fee2e2' },
]

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Announcement | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [adminName, setAdminName] = useState('')

  const fetchAll = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])

    const { data: courseData } = await supabase
      .from('courses')
      .select('id, name, school')
      .order('school').order('name')
    setCourses(courseData || [])

    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('name').eq('id', user.id).single()
        if (profile) setAdminName(profile.name)
      }
      await fetchAll()
    }
    init()
  }, [])

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        school: form.school,
        course_target: form.course_target || 'ALL',
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }

      if (editItem) {
        const { error: err } = await supabase
          .from('announcements').update(payload).eq('id', editItem.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('announcements').insert({ ...payload, is_active: true })
        if (err) throw err
      }

      setSuccess(editItem ? 'Announcement updated!' : 'Announcement saved!')
      setTimeout(() => setSuccess(''), 3000)
      setShowForm(false)
      setEditItem(null)
      setForm(emptyForm)
      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSendNotify = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required')
      return
    }
    setSaving(true)
    setSending(true)
    setError('')
    try {
      const supabase = createClient()
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        school: form.school,
        course_target: form.course_target || 'ALL',
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: true,
      }

      let announcementId = editItem?.id
      if (editItem) {
        await supabase.from('announcements').update(payload).eq('id', editItem.id)
      } else {
        const { data } = await supabase
          .from('announcements').insert(payload).select().single()
        announcementId = data?.id
      }

      // Send notifications
      await fetch('/api/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementId,
          title: form.title.trim(),
          content: form.content.trim(),
          type: form.type,
          school: form.school,
          course_target: form.course_target || 'ALL',
          adminName: adminName || 'Admin',
        })
      })

      setSuccess('Announcement posted and students notified!')
      setTimeout(() => setSuccess(''), 4000)
      setShowForm(false)
      setEditItem(null)
      setForm(emptyForm)
      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSaving(false)
      setSending(false)
    }
  }

  const handleEdit = (a: Announcement) => {
    setEditItem(a)
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      school: a.school,
      course_target: (a as unknown as { course_target?: string }).course_target || 'ALL',
      expires_at: a.expires_at ? a.expires_at.substring(0, 10) : '',
    })
    setError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('announcements').delete().eq('id', id)
    setDeleteId(null)
    setSuccess('Deleted!')
    setTimeout(() => setSuccess(''), 3000)
    await fetchAll()
  }

  const toggleActive = async (a: Announcement) => {
    const supabase = createClient()
    await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id)
    await fetchAll()
  }

  const isapCourses = courses.filter(c => c.school === 'ISAP')
  const mcnpCourses = courses.filter(c => c.school === 'MCNP')

  const getTypeConfig = (type: string) => ANNOUNCEMENT_TYPES.find(t => t.value === type) || ANNOUNCEMENT_TYPES[0]

  const isExpired = (a: Announcement) =>
    a.expires_at ? new Date(a.expires_at) < new Date() : false

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Announcements</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Post announcements and notify students via push, email, and in-app
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setError('') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shrink-0"
        >
          <Plus size={14} />
          New Announcement
        </button>
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
              {editItem ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              style={{ color: 'var(--text-faint)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Title *</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Announcement title"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Content */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Content *</label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Write the announcement content..."
                rows={4}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Type */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Type</label>
              <div className="flex flex-wrap gap-2">
                {ANNOUNCEMENT_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm({ ...form, type: t.value })}
                    className="px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all"
                    style={{
                      borderColor: form.type === t.value ? t.color : 'var(--border)',
                      backgroundColor: form.type === t.value ? t.bg : 'var(--bg)',
                      color: form.type === t.value ? t.color : 'var(--text-muted)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Send to */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Send to</label>
              <div className="flex gap-2">
                {[
                  { value: 'BOTH', label: 'Both Schools', active: '#1e293b', activeBg: '#f1f5f9', activeText: '#1e293b' },
                  { value: 'ISAP', label: 'ISAP Only', active: '#dc2626', activeBg: '#fee2e2', activeText: '#b91c1c' },
                  { value: 'MCNP', label: 'MCNP Only', active: '#2563eb', activeBg: '#dbeafe', activeText: '#1d4ed8' },
                ].map(s => (
                  <button key={s.value} type="button"
                    onClick={() => setForm({ ...form, school: s.value, course_target: 'ALL' })}
                    className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all"
                    style={{
                      borderColor: form.school === s.value ? s.active : 'var(--border)',
                      backgroundColor: form.school === s.value ? s.activeBg : 'var(--bg)',
                      color: form.school === s.value ? s.activeText : 'var(--text-muted)',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Course */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Target Course
                <span className="font-normal ml-1" style={{ color: 'var(--text-faint)' }}>
                  (optional — leave All Students for everyone)
                </span>
              </label>
              <select
                value={form.course_target}
                onChange={e => setForm({ ...form, course_target: e.target.value })}
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <option value="ALL">All Students</option>
                {(form.school === 'ISAP' || form.school === 'BOTH') && isapCourses.length > 0 && (
                  <optgroup label="── ISAP Courses ──">
                    {isapCourses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
                {(form.school === 'MCNP' || form.school === 'BOTH') && mcnpCourses.length > 0 && (
                  <optgroup label="── MCNP Courses ──">
                    {mcnpCourses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Expiry date */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Expiry Date <span className="font-normal" style={{ color: 'var(--text-faint)' }}>(optional)</span>
              </label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm({ ...form, expires_at: e.target.value })}
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {/* Save only */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text)', backgroundColor: 'var(--bg)' }}
            >
              {saving && !sending
                ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                : <Check size={15} />
              }
              Save Only
            </button>

            {/* Save + Notify */}
            <button
              onClick={handleSendNotify}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              {saving && sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Megaphone size={15} />
              }
              {saving && sending ? 'Sending...' : 'Post + Notify Students'}
            </button>

            <button
              onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              className="px-4 py-2.5 rounded-xl border text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <Megaphone size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No announcements yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Create your first announcement above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const typeConfig = getTypeConfig(a.type)
            const expired = isExpired(a)
            return (
              <div key={a.id}
                className="rounded-2xl border p-5 transition-all"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  opacity: !a.is_active ? 0.6 : 1,
                }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: typeConfig.bg }}>
                      <Megaphone size={16} style={{ color: typeConfig.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: typeConfig.bg, color: typeConfig.color }}>
                          {typeConfig.label}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          a.school === 'ISAP' ? 'bg-red-100 text-red-700'
                          : a.school === 'MCNP' ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.school}
                        </span>
                        {a.course_target && a.course_target !== 'ALL' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 truncate max-w-[160px]">
                            {a.course_target}
                          </span>
                        )}
                        {expired && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-500">
                            Expired
                          </span>
                        )}
                        {!a.is_active && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{a.title}</p>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{a.content}</p>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--text-faint)' }}>
                        {new Date(a.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                        {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(a)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-black/5"
                      style={{ color: 'var(--text-muted)' }}>
                      {a.is_active ? <><EyeOff size={13} />Hide</> : <><Eye size={13} />Show</>}
                    </button>
                    <button onClick={() => handleEdit(a)}
                      className="p-1.5 rounded-lg hover:bg-black/5 transition-all"
                      style={{ color: 'var(--text-muted)' }}>
                      <Pencil size={14} />
                    </button>
                    {deleteId === a.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(a.id)}
                          className="text-[10px] font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
                          Yes
                        </button>
                        <button onClick={() => setDeleteId(null)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={{ color: 'var(--text-muted)' }}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(a.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all"
                        style={{ color: 'var(--text-faint)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}