'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MessageSquare, Clock, CheckCircle, Send, Mail } from 'lucide-react'

type Inquiry = {
  id: string
  message: string
  response: string | null
  status: string
  created_at: string
  student_id: string
  profiles: { name: string; email: string; school: string }
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'pending' | 'resolved'>('ALL')
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
            adminName: adminName || 'Help Desk Admin',
          })
        })
        const result = await res.json()
        if (result.error) throw new Error(result.error)
      } else {
        const supabase = createClient()
        await supabase
          .from('inquiries')
          .update({ response: response.trim(), status: 'resolved' })
          .eq('id', inquiry.id)
      }

      setSuccessId(inquiry.id)
      setTimeout(() => setSuccessId(null), 4000)
      setResponse('')
      setActiveId(null)
      await fetchInquiries()

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send'
      setErrorMsg(msg)
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const handleMarkPending = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('inquiries')
      .update({ status: 'pending', response: null })
      .eq('id', id)
    await fetchInquiries()
  }

  const filtered = inquiries.filter(i =>
    filter === 'ALL' || i.status === filter
  )
  const pendingCount = inquiries.filter(i => i.status === 'pending').length
  const resolvedCount = inquiries.filter(i => i.status === 'resolved').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inquiries</h1>
        <p className="text-sm text-slate-400 mt-1">
          Respond to student concerns — email notification sent automatically
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-2xl font-bold text-slate-900">{inquiries.length}</p>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <p className="text-2xl font-bold text-emerald-500">{resolvedCount}</p>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Resolved</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['ALL', 'pending', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === f
                ? f === 'pending' ? 'bg-amber-100 text-amber-700'
                  : f === 'resolved' ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {f} {f === 'pending' && pendingCount > 0 && `(${pendingCount})`}
          </button>
        ))}
      </div>

      {/* Global error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Inquiry list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <MessageSquare size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No inquiries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inquiry => (
            <div key={inquiry.id} className="bg-white rounded-2xl border border-slate-100 p-5">

              {/* Success notification */}
              {successId === inquiry.id && (
                <div className="mb-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Mail size={14} className="text-emerald-600 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-700">
                    Response sent{sendEmail ? ` and email delivered to ${inquiry.profiles?.email}` : ''}
                  </p>
                </div>
              )}

              {/* Student info + status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    inquiry.profiles?.school === 'ISAP'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {inquiry.profiles?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {inquiry.profiles?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {inquiry.profiles?.email} ·{' '}
                      <span className={`font-semibold ${
                        inquiry.profiles?.school === 'ISAP' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {inquiry.profiles?.school}
                      </span>
                    </p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                  inquiry.status === 'resolved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {inquiry.status === 'resolved'
                    ? <><CheckCircle size={11} /> Resolved</>
                    : <><Clock size={11} /> Pending</>
                  }
                </span>
              </div>

              {/* Student message */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 mb-3">
                <p className="text-xs font-semibold text-slate-400 mb-1">Student message</p>
                <p className="text-sm text-slate-700">{inquiry.message}</p>
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
                    placeholder="Type your response to the student..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none resize-none"
                  />

                  {/* Email toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setSendEmail(!sendEmail)}
                      className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 cursor-pointer ${
                        sendEmail ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        sendEmail ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className={sendEmail ? 'text-emerald-600' : 'text-slate-400'} />
                      <span className="text-xs font-medium text-slate-600">
                        {sendEmail
                          ? `Send email to ${inquiry.profiles?.email}`
                          : 'No email notification'
                        }
                      </span>
                    </div>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRespond(inquiry)}
                      disabled={sending || !response.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-all"
                    >
                      {sending ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          {sendEmail ? 'Send Response + Email' : 'Send Response Only'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => { setActiveId(null); setResponse(''); setErrorMsg('') }}
                      className="px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Date + actions */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">
                  {new Date(inquiry.created_at).toLocaleDateString('en-PH', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                <div className="flex items-center gap-2">
                  {inquiry.status === 'resolved' && (
                    <button
                      onClick={() => handleMarkPending(inquiry.id)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                    >
                      Mark as pending
                    </button>
                  )}
                  {activeId !== inquiry.id && (
                    <button
                      onClick={() => {
                        setActiveId(inquiry.id)
                        setResponse(inquiry.response || '')
                        setSendEmail(true)
                        setErrorMsg('')
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                    >
                      <Send size={12} />
                      {inquiry.response ? 'Edit and Resend' : 'Respond'}
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