'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MessageSquare, Clock, CheckCircle, Send, Mail } from 'lucide-react'
import { OFFICE_TO_CATEGORY } from '../layout'

type Inquiry = {
  id: string
  message: string
  response: string | null
  status: string
  category: string
  created_at: string
  student_id: string
  profiles: { name: string; email: string; school: string }
}

export default function OfficeInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [office, setOffice] = useState('')
  const [adminName, setAdminName] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [sending, setSending] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'resolved'>('ALL')

  const fetchInquiries = async (officeVal: string) => {
    const supabase = createClient()
    const category = OFFICE_TO_CATEGORY[officeVal] || 'General'
    let query = supabase
      .from('inquiries')
      .select('*, profiles(name, email, school)')
      .order('created_at', { ascending: false })
    if (category !== 'General') query = query.eq('category', category)
    const { data } = await query
    setInquiries(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles').select('name, office').eq('id', user.id).single()
      if (!prof) return
      setOffice(prof.office)
      setAdminName(prof.name)
      await fetchInquiries(prof.office)
      setLoading(false)
    }
    init()
  }, [])

  const handleRespond = async (inq: Inquiry) => {
    if (!response.trim()) return
    setSending(true)
    try {
      if (sendEmail) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiryId: inq.id,
            response: response.trim(),
            studentEmail: inq.profiles?.email,
            studentName: inq.profiles?.name,
            studentId: inq.student_id,
            adminName: adminName || office,
          })
        })
      } else {
        const supabase = createClient()
        await supabase.from('inquiries')
          .update({ response: response.trim(), status: 'resolved' })
          .eq('id', inq.id)
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: inq.student_id,
            title: 'Your inquiry has been answered',
            message: response.trim().substring(0, 80),
            type: 'response',
            link: '/dashboard/notifications',
          })
        })
      }
      setResponse('')
      setActiveId(null)
      await fetchInquiries(office)
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const filtered = inquiries.filter(i =>
    statusFilter === 'ALL' || i.status === statusFilter
  )

  const pending = inquiries.filter(i => i.status === 'pending').length

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inquiries</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {OFFICE_TO_CATEGORY[office] !== 'General' ? `Category: ${OFFICE_TO_CATEGORY[office]}` : 'All inquiries'}
          {pending > 0 && ` · ${pending} pending`}
        </p>
      </div>

      {/* Filter */}
      <div className="flex rounded-xl overflow-hidden border w-fit" style={{ borderColor: 'var(--border)' }}>
        {(['ALL', 'pending', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className="px-4 py-2 text-xs font-semibold capitalize transition-all"
            style={{
              backgroundColor: statusFilter === f
                ? f === 'pending' ? '#f59e0b' : f === 'resolved' ? '#10b981' : '#1e293b'
                : 'var(--bg)',
              color: statusFilter === f ? '#fff' : 'var(--text-muted)',
            }}>
            {f === 'ALL' ? 'All' : f}
            {f === 'pending' && pending > 0 ? ` (${pending})` : ''}
          </button>
        ))}
      </div>

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
          {filtered.map(inq => (
            <div key={inq.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    inq.profiles?.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {inq.profiles?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{inq.profiles?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{inq.profiles?.email}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  inq.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {inq.status === 'resolved' ? <><CheckCircle size={11} />Resolved</> : <><Clock size={11} />Pending</>}
                </span>
              </div>

              <div className="rounded-xl px-4 py-3 mb-3" style={{ backgroundColor: 'var(--bg)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Student message</p>
                <p className="text-sm" style={{ color: 'var(--text)' }}>{inq.message}</p>
              </div>

              {inq.response && activeId !== inq.id && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-3">
                  <p className="text-xs font-semibold text-emerald-600 mb-1">Your response</p>
                  <p className="text-sm text-slate-700">{inq.response}</p>
                </div>
              )}

              {activeId === inq.id && (
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
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {sendEmail ? `Email ${inq.profiles?.email}` : 'No email'}
                      </span>
                    </div>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => handleRespond(inq)} disabled={sending || !response.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50">
                      {sending ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
                      {sending ? 'Sending...' : 'Send Response'}
                    </button>
                    <button onClick={() => { setActiveId(null); setResponse('') }}
                      className="px-4 py-2.5 rounded-xl border text-xs font-semibold"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {new Date(inq.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                {activeId !== inq.id && (
                  <button
                    onClick={() => { setActiveId(inq.id); setResponse(inq.response || '') }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                  >
                    <Send size={12} />
                    {inq.response ? 'Edit & Resend' : 'Respond'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}