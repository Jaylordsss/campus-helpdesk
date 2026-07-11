'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { FileText, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { OFFICE_TO_STEP } from '../layout'

type DocumentRequest = {
  id: string
  document_type: string
  purpose: string
  copies: number
  reference_no: string
  status: string
  current_step: string
  pickup_date: string | null
  remarks: string | null
  school: string
  created_at: string
  student_id: string
  profiles: { name: string; email: string }
}

const STATUS_COLOR: Record<string, string> = {
  'Submitted': 'bg-blue-100 text-blue-700',
  'Library Clearance': 'bg-violet-100 text-violet-700',
  'Guidance Clearance': 'bg-teal-100 text-teal-700',
  'Dean Approval': 'bg-orange-100 text-orange-700',
  'Payment Required': 'bg-red-100 text-red-700',
  'Payment Confirmed': 'bg-emerald-100 text-emerald-700',
  'Being Prepared': 'bg-amber-100 text-amber-700',
  'Ready for Pickup': 'bg-emerald-100 text-emerald-700',
  'Claimed': 'bg-slate-100 text-slate-600',
  'Rejected': 'bg-red-100 text-red-700',
}

const STEP_TO_NEXT_STATUS: Record<string, string> = {
  'Library': 'Library Clearance',
  'Guidance': 'Guidance Clearance',
  'Dean': 'Dean Approval',
  'Finance': 'Payment Required',
  'Registrar': 'Being Prepared',
}

export default function OfficeDocumentsPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [office, setOffice] = useState('')
  const [step, setStep] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchRequests = async (officeStep: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('document_requests')
      .select('*, profiles(name, email)')
      .eq('current_step', officeStep)
      .not('status', 'in', '("Claimed","Rejected")')
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles').select('office').eq('id', user.id).single()
      if (!prof?.office) return
      setOffice(prof.office)
      const officeStep = OFFICE_TO_STEP[prof.office]
      if (officeStep) {
        setStep(officeStep)
        await fetchRequests(officeStep)
      }
      setLoading(false)
    }
    init()
  }, [])

  const approveStep = async (req: DocumentRequest) => {
    setUpdating(req.id)
    try {
      const supabase = createClient()
      const newStatus = STEP_TO_NEXT_STATUS[step] || 'Being Prepared'

      // Determine next step
      const DOCUMENT_STEPS: Record<string, string[]> = {
        'Certificate of Enrollment': ['Registrar'],
        'Transcript of Records': ['Library', 'Dean', 'Finance', 'Registrar'],
        'Good Moral Certificate': ['Guidance', 'Registrar'],
        'Diploma': ['Library', 'Dean', 'Finance', 'Registrar'],
        'Honorable Dismissal': ['Library', 'Guidance', 'Dean', 'Finance', 'Registrar'],
        'Authentication': ['Registrar'],
      }

      const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
      const currentIdx = steps.indexOf(step)
      const nextStep = steps[currentIdx + 1] || 'Registrar'

      await supabase.from('document_requests').update({
        status: newStatus,
        current_step: nextStep,
        remarks: remarks[req.id] || null,
        updated_at: new Date().toISOString(),
      }).eq('id', req.id)

      await supabase.from('request_approvals').insert({
        request_id: req.id,
        step,
        status: 'approved',
        remarks: remarks[req.id] || null,
        approved_at: new Date().toISOString(),
      })

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.student_id,
          title: `✅ ${step} Approved`,
          message: `Your ${req.document_type} (${req.reference_no}) has been approved by ${step}. Next: ${nextStep}.`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      setRemarks(prev => { const n = { ...prev }; delete n[req.id]; return n })
      setExpandedId(null)
      await fetchRequests(step)
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  if (!step) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Document Requests</h1>
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">
          Your office does not process document requests directly.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Document Requests</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Requests awaiting <span className="font-bold">{step}</span> clearance · {requests.length} pending
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No pending requests</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            All document requests have been processed
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const isExpanded = expandedId === req.id
            return (
              <div key={req.id} className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        req.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.profiles?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{req.profiles?.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{req.profiles?.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLOR[req.status] || 'bg-slate-100 text-slate-600'}`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="rounded-xl px-4 py-3 mb-3 flex items-start justify-between gap-3"
                    style={{ backgroundColor: 'var(--bg)' }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{req.document_type}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {req.purpose} · {req.copies} {req.copies === 1 ? 'copy' : 'copies'}
                      </p>
                      <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-faint)' }}>{req.reference_no}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {new Date(req.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Collapse' : 'Approve'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          Remarks (optional)
                        </label>
                        <input
                          value={remarks[req.id] || ''}
                          onChange={e => setRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Add a note..."
                          className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveStep(req)}
                          disabled={updating === req.id}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                        >
                          {updating === req.id
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Send size={13} />
                          }
                          ✅ Approve {step} Clearance
                        </button>
                        <button onClick={() => setExpandedId(null)}
                          className="px-4 py-2.5 rounded-xl border text-xs font-semibold"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}