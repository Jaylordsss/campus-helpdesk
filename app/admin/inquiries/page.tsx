'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MessageSquare, Clock, CheckCircle, Send } from 'lucide-react'

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

  const fetchInquiries = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('inquiries')
      .select('*, profiles(name, email, school)')
      .order('created_at', { ascending: false })
    setInquiries(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchInquiries() }, [])

  const handleRespond = async (id: string) => {
    if (!response.trim()) return
    setSending(true)
    const supabase = createClient()
    await supabase
      .from('inquiries')
      .update({ response: response.trim(), status: 'resolved' })
      .eq('id', id)
    setResponse('')
    setActiveId(null)
    await fetchInquiries()
    setSending(false)
  }

  const handleMarkPending = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('inquiries')
      .update({ status: 'pending', response: null })
      .eq('id', id)
    await fetchInquiries()
  }

  const filtered = inquiries.filter(i => filter === 'ALL' || i.status === filter)
  const pendingCount = inquiries.filter(i => i.status === 'pending').length
  const resolvedCount = inquiries.filter(i => i.status === 'resolved').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inquiries</h1>
        <p className="text-sm text-slate-400 mt-1">
          Respond to student concerns and questions
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
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
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
              </div>

              {/* Message */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 mb-3">
                <p className="text-xs font-semibold text-slate-400 mb-1">Student message</p>
                <p className="text-sm text-slate-700">{inquiry.message}</p>
              </div>

              {/* Existing response */}
              {inquiry.response && activeId !== inquiry.id && (
                <div className="bg-emerald-50 rounded-xl px-4 py-3 mb-3">
                  <p className="text-xs font-semibold text-emerald-600 mb-1">Your response</p>
                  <p className="text-sm text-slate-700">{inquiry.response}</p>
                </div>
              )}

              {/* Response input */}
              {activeId === inquiry.id && (
                <div className="space-y-2 mb-3">
                  <textarea
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRespond(inquiry.id)}
                      disabled={sending || !response.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-all"
                    >
                      <Send size={13} />
                      {sending ? 'Sending...' : 'Send Response'}
                    </button>
                    <button
                      onClick={() => { setActiveId(null); setResponse('') }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
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
                      }}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                    >
                      {inquiry.response ? 'Edit response' : 'Respond'}
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