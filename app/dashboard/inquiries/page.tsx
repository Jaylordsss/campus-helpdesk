'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MessageSquare, Send, Clock, CheckCircle } from 'lucide-react'

type Inquiry = {
  id: string
  message: string
  response: string | null
  status: string
  created_at: string
}

export default function InquiriesPage() {
  const supabase = createClient()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState('')

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('inquiries')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
      setInquiries(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('inquiries')
      .insert({ student_id: userId, message: message.trim() })
      .select()
      .single()
    if (!error && data) {
      setInquiries([data, ...inquiries])
      setMessage('')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a concern and track its status</p>
      </div>

      {/* Submit form */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Submit new inquiry</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your concern or question..."
            rows={4}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-300 hover:bg-blue-400 text-gray-900 text-sm font-medium rounded-xl disabled:opacity-50 transition-all"
          >
            <Send size={15} />
            {submitting ? 'Submitting...' : 'Submit inquiry'}
          </button>
        </form>
      </div>

      {/* Inquiry list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Your inquiries ({inquiries.length})
        </h2>
        {inquiries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No inquiries yet</p>
          </div>
        ) : (
          inquiries.map((inquiry) => (
            <div key={inquiry.id} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm text-gray-800">{inquiry.message}</p>
                <span className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  inquiry.status === 'resolved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {inquiry.status === 'resolved'
                    ? <><CheckCircle size={11} /> Resolved</>
                    : <><Clock size={11} /> Pending</>
                  }
                </span>
              </div>
              {inquiry.response && (
                <div className="mt-3 bg-blue-50 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Admin response:</p>
                  <p className="text-sm text-gray-700">{inquiry.response}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(inquiry.created_at).toLocaleDateString('en-PH', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
