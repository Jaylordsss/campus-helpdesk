'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  Plus, X, Check, Megaphone, Trash2,
  Pencil, AlertCircle, Calendar, BookOpen, Star, Bell
} from 'lucide-react'

type Announcement = {
  id: string
  title: string
  content: string
  type: string
  school: string
  is_active: boolean
  created_at: string
  expires_at: string | null
}

const typeOptions = [
  { value: 'general', label: 'General', icon: Bell, color: 'bg-slate-100 text-slate-600' },
  { value: 'enrollment', label: 'Enrollment', icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
  { value: 'event', label: 'Event', icon: Star, color: 'bg-violet-100 text-violet-600' },
  { value: 'holiday', label: 'Holiday', icon: Calendar, color: 'bg-amber-100 text-amber-700' },
  { value: 'urgent', label: 'Urgent', icon: AlertCircle, color: 'bg-red-100 text-red-600' },
]

const emptyForm = {
  title: '',
  content: '',
  type: 'general',
  school: 'BOTH',
  expires_at: '',
  course_target: 'ALL',
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [adminName, setAdminName] = useState('')

  const fetchAnnouncements = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
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
    }
    init()
    fetchAnnouncements()
  }, [])

  const handleSave = async (notify: boolean) => {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    if (notify) setSending(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      school: form.school,
      expires_at: form.expires_at || null,
      created_by: user?.id,
      is_active: true,
      course_target: form.course_target || 'ALL',
    }

    let announcementId = editId

    if (editId) {
      await supabase.from('announcements').update(payload).eq('id', editId)
    } else {
      const { data } = await supabase.from('announcements').insert(payload).select().single()
      announcementId = data?.id
    }

    // Send email + notifications to students
    if (notify && announcementId) {
      const res = await fetch('/api/announce', {
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
      const result = await res.json()
      if (result.sent) {
        setSuccessMsg(`Announcement posted and sent to ${result.sent} student${result.sent !== 1 ? 's' : ''} via email and notification!`)
      } else {
        setSuccessMsg('Announcement saved successfully!')
      }
    } else {
      setSuccessMsg('Announcement saved without notifications.')
    }

    setTimeout(() => setSuccessMsg(''), 5000)
    await fetchAnnouncements()
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
    setSaving(false)
    setSending(false)
  }

  const handleEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      school: a.school,
      expires_at: a.expires_at ? a.expires_at.substring(0, 10) : '',
      course_target: (a as unknown as { course_target?: string }).course_target || 'ALL',
    })
    setEditId(a.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('announcements').delete().eq('id', id)
    await fetchAnnouncements()
    setDeleteId(null)
  }

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id)
    await fetchAnnouncements()
  }

  const getTypeOption = (type: string) => typeOptions.find(t => t.value === type) || typeOptions[0]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-400 mt-1">
            Post announcements — students get notified by email and in-app
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <Check size={15} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{successMsg}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {editId ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Title</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Enrollment for 2nd Semester is now open"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Content</label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="Write the full announcement here..."
                rows={5}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
                <div className="flex flex-wrap gap-2">
                  {typeOptions.map(t => {
                    const Icon = t.icon
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm({ ...form, type: t.value })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                          form.type === t.value
                            ? 'border-slate-600 bg-slate-800 text-white'
                            : 'border-slate-100 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={12} />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* School */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Send to</label>
                <div className="flex gap-2">
                  {(['BOTH', 'ISAP', 'MCNP'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, school: s })}
                      className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                        form.school === s
                          ? s === 'ISAP' ? 'border-red-400 bg-red-50 text-red-700'
                            : s === 'MCNP' ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-slate-600 bg-slate-800 text-white'
                          : 'border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Expires on <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2">
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              {sending ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Megaphone size={15} />
                  Post + Notify Students
                </>
              )}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <Check size={15} />
              Save without notifying
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
              className="px-5 py-2.5 text-slate-400 text-sm font-semibold hover:text-slate-600 transition-all"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-400">
            "Post + Notify Students" will send an email and in-app notification to all students in the selected school.
          </p>
        </div>
      )}

      {/* Announcements list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <Megaphone size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No announcements yet</p>
          <p className="text-xs text-slate-300 mt-1">Click "New Announcement" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => {
            const typeOpt = getTypeOption(a.type)
            const Icon = typeOpt.icon
            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border p-5 transition-all ${
                  a.is_active ? 'border-slate-100' : 'border-slate-100 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeOpt.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${typeOpt.color}`}>
                          {typeOpt.label}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          a.school === 'ISAP' ? 'bg-red-100 text-red-700'
                            : a.school === 'MCNP' ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.school}
                        </span>
                        {!a.is_active && (
                          <span className="text-xs font-semibold bg-slate-100 text-slate-400 px-2.5 py-0.5 rounded-full">
                            Hidden
                          </span>
                        )}
                        {a.expires_at && new Date(a.expires_at) < new Date() && (
                          <span className="text-xs font-semibold bg-red-100 text-red-500 px-2.5 py-0.5 rounded-full">
                            Expired
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {a.content}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-2">
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
                    <button
                      onClick={() => toggleActive(a.id, a.is_active)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        a.is_active
                          ? 'text-slate-400 hover:bg-slate-100'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {a.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleEdit(a)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                    {deleteId === a.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(a.id)}
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
                        onClick={() => setDeleteId(a.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
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
      {/* Course Target */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Target Course <span className="font-normal text-slate-400">(optional — leave ALL for everyone)</span>
                </label>
                <select
                  value={form.course_target}
                  onChange={e => setForm({ ...form, course_target: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="ALL">All Students</option>
                  <optgroup label="ISAP Courses">
                    <option value="Bachelor of Science in Information Technology">BS Information Technology</option>
                    <option value="Bachelor of Science in Computer Engineering">BS Computer Engineering</option>
                    <option value="Bachelor of Science in Social Work">BS Social Work</option>
                    <option value="Bachelor of Science in Criminology">BS Criminology</option>
                    <option value="Bachelor of Science in Business Administration">BS Business Administration</option>
                    <option value="Bachelor of Science in Accountancy">BS Accountancy</option>
                  </optgroup>
                  <optgroup label="MCNP Courses">
                    <option value="Bachelor of Science in Nursing">BS Nursing</option>
                    <option value="Bachelor of Science in Medical Technology">BS Medical Technology</option>
                    <option value="Bachelor of Science in Pharmacy">BS Pharmacy</option>
                    <option value="Bachelor of Science in Physical Therapy">BS Physical Therapy</option>
                  </optgroup>
                </select>
              </div>
    </div>
    
  )
}