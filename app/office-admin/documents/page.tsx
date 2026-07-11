'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { FileText, ChevronDown, ChevronUp, Check } from 'lucide-react'
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

const DOCUMENT_STEPS: Record<string, string[]> = {
  'Certificate of Enrollment': ['Registrar'],
  'Transcript of Records': ['Library', 'Dean', 'Finance', 'Registrar'],
  'Good Moral Certificate': ['Guidance', 'Registrar'],
  'Diploma': ['Library', 'Dean', 'Finance', 'Registrar'],
  'Honorable Dismissal': ['Library', 'Guidance', 'Dean', 'Finance', 'Registrar'],
  'Authentication': ['Registrar'],
}

const STEP_TO_OFFICE: Record<string, string> = {
  'Library': 'Library',
  'Guidance': 'Office of Guidance Services',
  'Dean': 'Office of the Dean',
  'Finance': 'Finance / Cashier',
  'Registrar': 'Registrar',
}

const STEP_TO_STATUS: Record<string, string> = {
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
  const [adminName, setAdminName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  const fetchRequests = async (officeStep: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('document_requests')
      .select('*, profiles(name, email)')
      .eq('current_step', officeStep)
      .not('status', 'in', '("Claimed","Rejected","Being Prepared","Ready for Pickup","Payment Confirmed")')
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles').select('office, name').eq('id', user.id).single()
      if (!prof?.office) return
      setOffice(prof.office)
      setAdminName(prof.name || '')
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

      const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
      const currentIdx = steps.indexOf(step)
      const nextStep = steps[currentIdx + 1] || null
      const isLastStep = currentIdx === steps.length - 1

      // Determine new status
      let newStatus = ''
      if (step === 'Finance') {
        newStatus = 'Payment Required'
      } else if (isLastStep) {
        newStatus = 'Being Prepared'
      } else {
        newStatus = STEP_TO_STATUS[step] || 'In Progress'
      }

      // Update document request
      await supabase.from('document_requests').update({
        status: newStatus,
        current_step: nextStep || step,
        remarks: remarks[req.id] || null,
        updated_at: new Date().toISOString(),
      }).eq('id', req.id)

      // Save approval record
      await supabase.from('request_approvals').insert({
        request_id: req.id,
        step,
        status: 'approved',
        remarks: remarks[req.id] || null,
        approved_at: new Date().toISOString(),
      })

      // Notify student
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.student_id,
          title: step === 'Finance'
            ? '💰 Payment Required'
            : `✅ ${step} Approved`,
          message: step === 'Finance'
            ? `Please visit the Finance/Cashier office to pay for your ${req.document_type} (${req.reference_no}).`
            : nextStep
              ? `Your ${req.document_type} (${req.reference_no}) has been approved by ${step}. Next step: ${nextStep}.`
              : `Your ${req.document_type} (${req.reference_no}) is being prepared. You will be notified when ready for pickup.`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      // Notify NEXT office admin in the chain
      if (nextStep && step !== 'Finance') {
        const nextOffice = STEP_TO_OFFICE[nextStep]
        if (nextOffice) {
          const { data: nextAdmins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .eq('office', nextOffice)

          for (const nextAdmin of (nextAdmins || [])) {
            await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: nextAdmin.id,
                title: `📋 Document Needs Your Clearance`,
                message: `${req.profiles?.name} needs ${nextStep} clearance for ${req.document_type} (${req.reference_no}). Approved by ${step}.`,
                type: 'general',
                link: '/office-admin/documents',
              })
            })
          }
        }
      }

      // Notify main admin of progress
      const { data: allAdmins } = await supabase
        .from('profiles')
        .select('id, office')
        .eq('role', 'admin')

      const mainAdmins = (allAdmins || []).filter((a: { office: string | null }) =>
        !a.office || a.office === 'General Administration'
      )

      for (const mainAdmin of mainAdmins) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: mainAdmin.id,
            title: `✅ ${step} approved — ${req.document_type}`,
            message: `${adminName} (${step}) approved ${req.profiles?.name}'s ${req.document_type} (${req.reference_no}).${nextStep ? ` Next: ${nextStep}.` : ' Now being prepared.'}`,
            type: 'general',
            link: '/admin/documents',
          })
        })
      }

      setSuccessId(req.id)
      setTimeout(() => setSuccessId(null), 4000)
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
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Document Requests</h1>
        <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Your office does not process document requests directly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Document Requests</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Requests awaiting <span className="font-bold">{step}</span> clearance · {requests.length} pending
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No pending requests</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            All document requests needing {step} clearance have been processed
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const isExpanded = expandedId === req.id
            const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
            const currentIdx = steps.indexOf(step)
            const nextStep = steps[currentIdx + 1] || null

            return (
              <div key={req.id} className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                {/* Success bar */}
                {successId === req.id && (
                  <div className="bg-emerald-500 px-5 py-2.5 flex items-center gap-2">
                    <Check size={14} className="text-white shrink-0" />
                    <p className="text-xs font-semibold text-white">
                      ✅ Approved! {nextStep ? `Notified ${nextStep} office.` : 'Document is now being prepared.'}
                    </p>
                  </div>
                )}

                <div className="p-5">

                  {/* Student info */}
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

                  {/* Document info */}
                  <div className="rounded-xl px-4 py-3 mb-3"
                    style={{ backgroundColor: 'var(--bg)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{req.document_type}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {req.purpose} · {req.copies} {req.copies === 1 ? 'copy' : 'copies'}
                    </p>
                    <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-faint)' }}>{req.reference_no}</p>
                  </div>

                  {/* Approval chain preview */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {steps.map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={{
                            backgroundColor: i < currentIdx ? '#d1fae5' : s === step ? '#1e293b' : 'var(--bg)',
                            color: i < currentIdx ? '#065f46' : s === step ? '#ffffff' : 'var(--text-faint)',
                          }}
                        >
                          {i < currentIdx ? '✓ ' : ''}{s}
                        </span>
                        {i < steps.length - 1 && (
                          <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>→</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {new Date(req.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </p>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Collapse' : 'Approve'}
                    </button>
                  </div>

                  {/* Expanded approve form */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>

                      {/* What happens next */}
                      <div className="rounded-xl px-4 py-3"
                        style={{ backgroundColor: step === 'Finance' ? '#fef3c7' : '#f0fdf4', border: `1px solid ${step === 'Finance' ? '#fde68a' : '#bbf7d0'}` }}>
                        <p className="text-xs font-semibold" style={{ color: step === 'Finance' ? '#92400e' : '#065f46' }}>
                          {step === 'Finance'
                            ? '⚠️ Clicking approve will notify the student to pay at the Cashier office.'
                            : nextStep
                              ? `✅ Clicking approve will notify the ${nextStep} office to process this request.`
                              : '✅ Clicking approve will mark this document as Being Prepared.'
                          }
                        </p>
                      </div>

                      {/* Remarks */}
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          Remarks (optional)
                        </label>
                        <input
                          value={remarks[req.id] || ''}
                          onChange={e => setRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Add a note for the student or next office..."
                          className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveStep(req)}
                          disabled={updating === req.id}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all"
                        >
                          {updating === req.id
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Check size={13} />
                          }
                          {updating === req.id
                            ? 'Processing...'
                            : step === 'Finance'
                              ? '⚠️ Require Payment'
                              : `✅ Approve ${step} Clearance`
                          }
                        </button>
                        <button
                          onClick={() => setExpandedId(null)}
                          className="px-4 py-2.5 rounded-xl border text-xs font-semibold"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                        >
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