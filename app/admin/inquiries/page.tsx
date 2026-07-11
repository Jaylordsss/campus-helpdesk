'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  MessageSquare, Clock, CheckCircle, Send, Mail, Filter,
  Plus, Pencil, Trash2, Check, X, Settings
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
type Inquiry = {
  id: string
  message: string
  response: string | null
  status: string
  category: string | null
  created_at: string
  student_id: string
  profiles: { name: string; email: string; school: string }
}

type Category = {
  id: string
  label: string
  icon: string
  description: string
  office_key: string | null
  is_active: boolean
  sort_order: number
}

// ── Constants ──────────────────────────────────────────────────────────────
const QUICK_ICONS = ['💬', '📋', '💰', '👤', '🎓', '🤝', '💻', '📚', '🏛️', '📖', '🖥️', '⚙️', '🏥', '📝', '🔧', '📞']

const emptyCatForm = {
  label: '', icon: '💬', description: '', office_key: '', is_active: true,
}

export default function AdminInquiriesPage() {
  const [tab, setTab] = useState<'inquiries' | 'categories'>('inquiries')

  // ── Inquiries state ──────────────────────────────────────────────────────
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [inqLoading, setInqLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'resolved'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [schoolFilter, setSchoolFilter] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [sending, setSending] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [successId, setSuccessId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // ── Categories state ─────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState(emptyCatForm)
  const [savingCat, setSavingCat] = useState(false)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)
  const [deletingCat, setDeletingCat] = useState(false)
  const [catSuccess, setCatSuccess] = useState('')
  const [catError, setCatError] = useState('')

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchInquiries = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('inquiries')
      .select('*, profiles(name, email, school)')
      .order('created_at', { ascending: false })
    setInquiries(data || [])
    setInqLoading(false)
  }

  const fetchCategories = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('inquiry_categories')
      .select('*')
      .order('sort_order')
    setCategories(data || [])
    setCatLoading(false)
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
    fetchInquiries()
    fetchCategories()
  }, [])

  // ── Inquiries logic ──────────────────────────────────────────────────────
  const filteredInquiries = inquiries.filter(i => {
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter
    const matchCategory = categoryFilter === 'ALL' || i.category === categoryFilter
    const matchSchool = schoolFilter === 'ALL' || i.profiles?.school === schoolFilter
    return matchStatus && matchCategory && matchSchool
  })

  const pendingCount = inquiries.filter(i => i.status === 'pending').length
  const resolvedCount = inquiries.filter(i => i.status === 'resolved').length

  const handleRespond = async (inquiry: Inquiry) => {
    if (!response.trim()) return
    setSending(true)
    setErrorMsg('')
    try {
      if (sendEmail) {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiryId: inquiry.id,
            response: response.trim(),
            studentEmail: inquiry.profiles?.email,
            studentName: inquiry.profiles?.name,
            studentId: inquiry.student_id,
            adminName: adminName || 'Help Desk Admin',
          })
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
      } else {
        const supabase = createClient()
        await supabase.from('inquiries').update({ response: response.trim(), status: 'resolved' }).eq('id', inquiry.id)
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: inquiry.student_id,
            title: 'Your inquiry has been answered',
            message: response.trim().length > 80 ? response.trim().substring(0, 80) + '...' : response.trim(),
            type: 'response',
            link: '/dashboard/notifications',
          })
        })
      }
      setSuccessId(inquiry.id)
      setTimeout(() => setSuccessId(null), 4000)
      setResponse('')
      setActiveId(null)
      await fetchInquiries()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleMarkPending = async (id: string) => {
    const supabase = createClient()
    await supabase.from('inquiries').update({ status: 'pending', response: null }).eq('id', id)
    await fetchInquiries()
  }

  // ── Categories logic ─────────────────────────────────────────────────────
  const handleSaveCat = async () => {
    if (!catForm.label.trim()) { setCatError('Label is required'); return }
    setSavingCat(true)
    setCatError('')
    const supabase = createClient()
    if (editCat) {
      const { error } = await supabase.from('inquiry_categories').update({
        label: catForm.label.trim(),
        icon: catForm.icon.trim(),
        description: catForm.description.trim(),
        office_key: catForm.office_key.trim() || null,
        is_active: catForm.is_active,
      }).eq('id', editCat.id)
      if (error) { setCatError(error.message); setSavingCat(false); return }
    } else {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0
      const { error } = await supabase.from('inquiry_categories').insert({
        label: catForm.label.trim(),
        icon: catForm.icon.trim(),
        description: catForm.description.trim(),
        office_key: catForm.office_key.trim() || null,
        is_active: catForm.is_active,
        sort_order: maxOrder + 1,
      })
      if (error) { setCatError(error.message); setSavingCat(false); return }
    }
    setCatSuccess(editCat ? 'Category updated!' : 'Category added!')
    setTimeout(() => setCatSuccess(''), 3000)
    setShowCatForm(false)
    setEditCat(null)
    setCatForm(emptyCatForm)
    await fetchCategories()
    setSavingCat(false)
  }

  const handleEditCat = (cat: Category) => {
    setEditCat(cat)
    setCatForm({
      label: cat.label, icon: cat.icon,
      description: cat.description || '',
      office_key: cat.office_key || '',
      is_active: cat.is_active,
    })
    setCatError('')
    setShowCatForm(true)
  }

  const handleDeleteCat = async (id: string) => {
    setDeletingCat(true)
    const supabase = createClient()
    await supabase.from('inquiry_categories').delete().eq('id', id)
    setDeleteCatId(null)
    setCatSuccess('Category deleted!')
    setTimeout(() => setCatSuccess(''), 3000)
    await fetchCategories()
    setDeletingCat(false)
  }

  const toggleCatActive = async (cat: Category) => {
    const supabase = createClient()
    await supabase.from('inquiry_categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    await fetchCategories()
  }

  const allCategories = [...new Set(inquiries.map(i => i.category).filter(Boolean))]

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header + Tabs */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inquiries</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage student concerns and inquiry categories
        </p>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-4 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg)' }}>
          <button
            onClick={() => setTab('inquiries')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: tab === 'inquiries' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'inquiries' ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === 'inquiries' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <MessageSquare size={14} />
            Inquiries
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('categories')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: tab === 'categories' ? 'var(--bg-card)' : 'transparent',
              color: tab === 'categories' ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === 'categories' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Settings size={14} />
            Categories
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--border)', color: 'var(--text-muted)' }}>
              {categories.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── INQUIRIES TAB ─────────────────────────────────────────────────── */}
      {tab === 'inquiries' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: inquiries.length, color: 'var(--text)' },
              { label: 'Pending', value: pendingCount, color: '#f59e0b' },
              { label: 'Resolved', value: resolvedCount, color: '#10b981' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: 'var(--text-faint)' }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Filters</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Status */}
              <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                {(['ALL', 'pending', 'resolved'] as const).map(f => (
                  <button key={f} onClick={() => setStatusFilter(f)}
                    className="px-3 py-1.5 text-xs font-semibold capitalize transition-all"
                    style={{
                      backgroundColor: statusFilter === f
                        ? f === 'pending' ? '#f59e0b' : f === 'resolved' ? '#10b981' : '#1e293b'
                        : 'var(--bg)',
                      color: statusFilter === f ? '#fff' : 'var(--text-muted)',
                    }}>
                    {f === 'ALL' ? 'All Status' : f}
                    {f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                  </button>
                ))}
              </div>

              {/* School */}
              <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
                  <button key={s} onClick={() => setSchoolFilter(s)}
                    className="px-3 py-1.5 text-xs font-bold transition-all"
                    style={{
                      backgroundColor: schoolFilter === s
                        ? s === 'ISAP' ? '#b91c1c' : s === 'MCNP' ? '#1d4ed8' : '#1e293b'
                        : 'var(--bg)',
                      color: schoolFilter === s ? '#fff' : 'var(--text-muted)',
                    }}>
                    {s === 'ALL' ? 'All Schools' : s}
                  </button>
                ))}
              </div>

              {/* Category */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <option value="ALL">All Categories</option>
                {allCategories.map(c => <option key={c!} value={c!}>{c}</option>)}
              </select>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Showing <span className="font-bold" style={{ color: 'var(--text)' }}>{filteredInquiries.length}</span> of {inquiries.length} inquiries
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600">{errorMsg}</p>
            </div>
          )}

          {/* Inquiry list */}
          {inqLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <MessageSquare size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No inquiries found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInquiries.map(inquiry => (
                <div key={inquiry.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                  {successId === inquiry.id && (
                    <div className="mb-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <Mail size={14} className="text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700">Response sent{sendEmail ? ` to ${inquiry.profiles?.email}` : ''}</p>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        inquiry.profiles?.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {inquiry.profiles?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{inquiry.profiles?.name || 'Unknown'}</p>
                        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                          {inquiry.profiles?.email} · <span className={inquiry.profiles?.school === 'ISAP' ? 'text-red-500 font-semibold' : 'text-blue-500 font-semibold'}>{inquiry.profiles?.school}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {inquiry.category && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                          {categories.find(c => c.label === inquiry.category)?.icon || '💬'} {inquiry.category}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        inquiry.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {inquiry.status === 'resolved' ? <><CheckCircle size={11} />Resolved</> : <><Clock size={11} />Pending</>}
                      </span>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="rounded-xl px-4 py-3 mb-3" style={{ backgroundColor: 'var(--bg)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Student message</p>
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{inquiry.message}</p>
                  </div>

                  {/* Previous response */}
                  {inquiry.response && activeId !== inquiry.id && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-3">
                      <p className="text-xs font-semibold text-emerald-600 mb-1">Your response</p>
                      <p className="text-sm text-slate-700">{inquiry.response}</p>
                    </div>
                  )}

                  {/* Response form */}
                  {activeId === inquiry.id && (
                    <div className="space-y-3 mb-3">
                      <textarea
                        value={response}
                        onChange={e => setResponse(e.target.value)}
                        placeholder="Type your response..."
                        rows={3}
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-none"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div onClick={() => setSendEmail(!sendEmail)}
                          className={`w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-all ${sendEmail ? 'bg-emerald-400' : 'bg-slate-200'}`}>
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${sendEmail ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className={sendEmail ? 'text-emerald-600' : 'text-slate-400'} />
                          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            {sendEmail ? `Send email to ${inquiry.profiles?.email}` : 'No email'}
                          </span>
                        </div>
                      </label>
                      <div className="flex gap-2">
                        <button onClick={() => handleRespond(inquiry)} disabled={sending || !response.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50">
                          {sending ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
                          {sending ? 'Sending...' : sendEmail ? 'Send + Email' : 'Send'}
                        </button>
                        <button onClick={() => { setActiveId(null); setResponse(''); setErrorMsg('') }}
                          className="px-4 py-2.5 rounded-xl border text-xs font-semibold"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {new Date(inquiry.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center gap-2">
                      {inquiry.status === 'resolved' && (
                        <button onClick={() => handleMarkPending(inquiry.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ color: 'var(--text-faint)' }}>
                          Mark pending
                        </button>
                      )}
                      {activeId !== inquiry.id && (
                        <button
                          onClick={() => { setActiveId(inquiry.id); setResponse(inquiry.response || ''); setSendEmail(true); setErrorMsg('') }}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                          style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                        >
                          <Send size={12} />
                          {inquiry.response ? 'Edit & Resend' : 'Respond'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CATEGORIES TAB ────────────────────────────────────────────────── */}
      {tab === 'categories' && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage offices and departments students can send inquiries to
            </p>
            <button
              onClick={() => { setShowCatForm(true); setEditCat(null); setCatForm(emptyCatForm); setCatError('') }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shrink-0"
            >
              <Plus size={14} />
              Add Category
            </button>
          </div>

          {/* Success */}
          {catSuccess && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">{catSuccess}</p>
            </div>
          )}

          {/* Category Form */}
          {showCatForm && (
            <div className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                  {editCat ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button onClick={() => { setShowCatForm(false); setEditCat(null); setCatError('') }}
                  style={{ color: 'var(--text-faint)' }}>
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Icon picker */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Icon</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {QUICK_ICONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setCatForm({ ...catForm, icon: ic })}
                        className="w-9 h-9 rounded-xl border-2 text-lg flex items-center justify-center transition-all"
                        style={{
                          borderColor: catForm.icon === ic ? '#1e293b' : 'var(--border)',
                          backgroundColor: catForm.icon === ic ? '#1e293b' : 'var(--bg)',
                        }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={catForm.icon}
                      onChange={e => setCatForm({ ...catForm, icon: e.target.value })}
                      placeholder="Or paste any emoji"
                      className="w-32 rounded-xl border px-3 py-2 text-sm focus:outline-none text-center"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                    <span className="text-2xl">{catForm.icon}</span>
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Label / Name *</label>
                  <input
                    value={catForm.label}
                    onChange={e => setCatForm({ ...catForm, label: e.target.value })}
                    placeholder="e.g. Library, Clinic, NSTP Office"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Description</label>
                  <input
                    value={catForm.description}
                    onChange={e => setCatForm({ ...catForm, description: e.target.value })}
                    placeholder="e.g. Book borrowing, library concerns"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>

                {/* Office key */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Linked Office Account
                    <span className="font-normal ml-1" style={{ color: 'var(--text-faint)' }}>
                      (must match the Office field of the admin account exactly)
                    </span>
                  </label>
                  <input
                    value={catForm.office_key}
                    onChange={e => setCatForm({ ...catForm, office_key: e.target.value })}
                    placeholder="e.g. Library, Registrar, CITE - College of Information Technology"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                    Leave blank to send to main admin only
                  </p>
                </div>

                {/* Active toggle */}
                <div className="sm:col-span-2 flex items-center gap-3">
                  <button type="button" onClick={() => setCatForm({ ...catForm, is_active: !catForm.is_active })}
                    className="relative w-11 h-6 rounded-full transition-all"
                    style={{ backgroundColor: catForm.is_active ? '#10b981' : '#e2e8f0' }}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${catForm.is_active ? 'left-[22px]' : 'left-[2px]'}`} />
                  </button>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {catForm.is_active ? 'Active — students can see this' : 'Hidden from students'}
                  </span>
                </div>
              </div>

              {catError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-red-600">{catError}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={handleSaveCat} disabled={savingCat}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                  {savingCat ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={15} />}
                  {savingCat ? 'Saving...' : editCat ? 'Save Changes' : 'Add Category'}
                </button>
                <button onClick={() => { setShowCatForm(false); setEditCat(null); setCatError('') }}
                  className="px-5 py-2.5 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Categories list */}
          {catLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No categories yet</p>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-bold uppercase tracking-widest"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>
                <div className="col-span-1"></div>
                <div className="col-span-3">Label</div>
                <div className="col-span-4 hidden sm:block">Description</div>
                <div className="col-span-2 hidden sm:block">Linked Office</div>
                <div className="col-span-1">Active</div>
                <div className="col-span-1">Actions</div>
              </div>

              {categories.map((cat, i) => (
                <div key={cat.id}
                  className="grid grid-cols-12 gap-3 px-5 py-4 items-center transition-all hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ borderBottom: i < categories.length - 1 ? '1px solid var(--border)' : 'none' }}>

                  <div className="col-span-1 text-xl">{cat.icon}</div>

                  <div className="col-span-3">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{cat.label}</p>
                  </div>

                  <div className="col-span-4 hidden sm:block">
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{cat.description || '—'}</p>
                  </div>

                  <div className="col-span-2 hidden sm:block">
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{cat.office_key || '—'}</p>
                  </div>

                  <div className="col-span-1">
                    <button onClick={() => toggleCatActive(cat)}
                      className="relative w-9 h-5 rounded-full transition-all"
                      style={{ backgroundColor: cat.is_active ? '#10b981' : '#e2e8f0' }}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${cat.is_active ? 'left-[18px]' : 'left-[2px]'}`} />
                    </button>
                  </div>

                  <div className="col-span-1 flex items-center gap-1">
                    <button onClick={() => handleEditCat(cat)}
                      className="p-1.5 rounded-lg transition-all hover:bg-black/5"
                      style={{ color: 'var(--text-muted)' }}>
                      <Pencil size={14} />
                    </button>

                    {deleteCatId === cat.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteCat(cat.id)} disabled={deletingCat}
                          className="text-[10px] font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
                          {deletingCat ? '...' : 'Yes'}
                        </button>
                        <button onClick={() => setDeleteCatId(null)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={{ color: 'var(--text-muted)' }}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteCatId(cat.id)}
                        className="p-1.5 rounded-lg transition-all hover:bg-red-50 hover:text-red-500"
                        style={{ color: 'var(--text-faint)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}