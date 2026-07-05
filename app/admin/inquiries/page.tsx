'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MessageSquare, Clock, CheckCircle, Send, Mail, Filter } from 'lucide-react'

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

const CATEGORIES = [
  'Registrar',
  'Finance',
  'Account',
  'Office of Student Services',
  'Office of Guidance Services',
  'CITE',
  'CASTE',
  'General',
]

const CATEGORY_ICONS: Record<string, string> = {
  'Registrar': '📋',
  'Finance': '💰',
  'Account': '👤',
  'Office of Student Services': '🎓',
  'Office of Guidance Services': '🤝',
  'CITE': '💻',
  'CASTE': '📚',
  'General': '💬',
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
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

  const fetchInquiries = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('inquiries')
      .select('*, profiles(name, email, school)')
      .order('created_at', { ascending: false })
    setInquiries(data || [])
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
    fetchInquiries()
  }, [])

  const filtered = inquiries.filter(i => {
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

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inquiries</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Respond to student concerns by office and department
        </p>
      </div>

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
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
            ))}
          </select>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Showing <span className="font-bold" style={{ color: 'var(--text)' }}>{filtered.length}</span> of {inquiries.length} inquiries
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-xs text-red-600">{errorMsg}</p>
        </div>
      )}

      {/* Inquiry list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <MessageSquare size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No inquiries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inquiry => (
            <div key={inquiry.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

              {successId === inquiry.id && (
                <div className="mb-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Mail size={14} className="text-emerald-600 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-700">
                    Response sent{sendEmail ? ` to ${inquiry.profiles?.email}` : ''}
                  </p>
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
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {inquiry.profiles?.name || 'Unknown'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {inquiry.profiles?.email} ·{' '}
                      <span className={inquiry.profiles?.school === 'ISAP' ? 'text-red-500 font-semibold' : 'text-blue-500 font-semibold'}>
                        {inquiry.profiles?.school}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Category badge */}
                  <span className="hidden sm:flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                    {CATEGORY_ICONS[inquiry.category || 'General']}
                    {inquiry.category || 'General'}
                  </span>
                  {/* Status badge */}
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    inquiry.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {inquiry.status === 'resolved' ? <><CheckCircle size={11} />Resolved</> : <><Clock size={11} />Pending</>}
                  </span>
                </div>
              </div>

              {/* Category on mobile */}
              <div className="flex sm:hidden mb-2">
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}>
                  {CATEGORY_ICONS[inquiry.category || 'General']}
                  {inquiry.category || 'General'}
                </span>
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
                    <button
                      onClick={() => handleRespond(inquiry)}
                      disabled={sending || !response.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-all"
                    >
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

              {/* Footer actions */}
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {new Date(inquiry.created_at).toLocaleDateString('en-PH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                <div className="flex items-center gap-2">
                  {inquiry.status === 'resolved' && (
                    <button onClick={() => handleMarkPending(inquiry.id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ color: 'var(--text-faint)' }}>
                      Mark pending
                    </button>
                  )}
                  {activeId !== inquiry.id && (
                    <button
                      onClick={() => { setActiveId(inquiry.id); setResponse(inquiry.response || ''); setSendEmail(true); setErrorMsg('') }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
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
    </div>
  )
}