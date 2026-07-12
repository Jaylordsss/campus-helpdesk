-'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { FileText, ChevronDown, ChevronUp, Check, Package, History, Inbox, Clock } from 'lucide-react'
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
  updated_at: string
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

// Full approval chain per document type
const DOCUMENT_STEPS: Record<string, string[]> = {
  'Certificate of Enrollment': ['Registrar'],
  'Transcript of Records': ['Library', 'Dean', 'Finance', 'Registrar'],
  'Good Moral Certificate': ['Guidance', 'Registrar'],
  'Diploma': ['Library', 'Dean', 'Finance', 'Registrar'],
  'Honorable Dismissal': ['Library', 'Guidance', 'Dean', 'Finance', 'Registrar'],
  'Authentication': ['Registrar'],
}

// Step name → office field in profiles table
const STEP_TO_OFFICE: Record<string, string> = {
  'Library': 'Library',
  'Guidance': 'Office of Guidance Services',
  'Dean': 'Office of the Dean',
  'Finance': 'Finance / Cashier',
  'Registrar': 'Registrar',
}

// Step name → status label after approval
const STEP_TO_STATUS: Record<string, string> = {
  'Library': 'Library Clearance',
  'Guidance': 'Guidance Clearance',
  'Dean': 'Dean Approval',
  'Finance': 'Payment Required',
  'Registrar': 'Being Prepared',
}

// All terminal statuses (no more action needed from any office)
const DONE_STATUSES = ['Claimed', 'Rejected']
// Statuses where the Registrar is the only one who can act
const REGISTRAR_ONLY_STATUSES = ['Being Prepared', 'Ready for Pickup', 'Payment Confirmed']

export default function OfficeDocumentsPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [allRequests, setAllRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [office, setOffice] = useState('')
  const [step, setStep] = useState('')
  const [adminName, setAdminName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const isRegistrar = step === 'Registrar'

  const fetchAll = async (officeStep: string) => {
    const supabase = createClient()
    // Fetch ALL non-claimed/rejected requests where this step appears in the chain
    const { data } = await supabase
      .from('document_requests')
      .select('*, profiles(name, email)')
      .not('status', 'in', '("Claimed","Rejected")')
      .order('created_at', { ascending: false })

    const all = (data || []) as DocumentRequest[]

    // Filter: only show requests where this office's step is in the chain
    const relevant = all.filter(req => {
      const steps = DOCUMENT_STEPS[req.document_type] || []
      return steps.includes(officeStep)
    })

    setAllRequests(relevant)
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
        await fetchAll(officeStep)
      }
      setLoading(false)
    }
    init()
  }, [])

  // Pending: requests where current_step === this office's step AND not done
  const pendingRequests = allRequests.filter(req => {
    if (DONE_STATUSES.includes(req.status)) return false
    if (isRegistrar) {
      // Registrar sees: submitted (for single-step docs), being prepared, ready for pickup, payment confirmed
      return req.current_step === 'Registrar'
    }
    // Other offices see requests where current_step === their step
    return req.current_step === step && !REGISTRAR_ONLY_STATUSES.includes(req.status)
  })

  // History: requests this office has already processed
  const historyRequests = allRequests.filter(req => {
    const steps = DOCUMENT_STEPS[req.document_type] || []
    const myIdx = steps.indexOf(step)
    const currentIdx = steps.indexOf(req.current_step)
    if (isRegistrar) {
      return ['Being Prepared', 'Ready for Pickup'].includes(req.status)
    }
    // Past my step
    return myIdx >= 0 && (currentIdx > myIdx || REGISTRAR_ONLY_STATUSES.includes(req.status))
  })

  const showSuccess = (msg: string, id: string) => {
    setSuccessId(id)
    setSuccessMsg(msg)
    setTimeout(() => { setSuccessId(null); setSuccessMsg('') }, 4000)
  }

  const approveStep = async (req: DocumentRequest) => {
    setUpdating(req.id)
    try {
      const supabase = createClient()
      const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
      const myIdx = steps.indexOf(step)
      const nextStep = myIdx >= 0 ? steps[myIdx + 1] : null
      const isLastStep = myIdx === steps.length - 1

      // Determine new status and next current_step
      let newStatus: string
      let newCurrentStep: string

      if (step === 'Finance') {
        newStatus = 'Payment Required'
        newCurrentStep = 'Finance' // stays at Finance until payment confirmed
      } else if (isLastStep) {
        // Registrar is last — mark being prepared, stays at Registrar
        newStatus = 'Being Prepared'
        newCurrentStep = 'Registrar'
      } else {
        newStatus = STEP_TO_STATUS[step] || 'In Progress'
        newCurrentStep = nextStep! // move to next step
      }

      // Update the document request
      await supabase.from('document_requests').update({
        status: newStatus,
        current_step: newCurrentStep,
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
            : nextStep && !isLastStep
              ? `Your ${req.document_type} (${req.reference_no}) was approved by ${step}. Now being processed by ${nextStep}.`
              : `Your ${req.document_type} (${req.reference_no}) has been fully approved and is being prepared at the Registrar. You will be notified when ready for pickup.`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      // Notify the NEXT office admin in the chain
      if (nextStep && step !== 'Finance') {
        const nextOffice = STEP_TO_OFFICE[nextStep]
        if (nextOffice) {
          const { data: nextAdmins } = await supabase
            .from('profiles').select('id')
            .eq('role', 'admin')
            .eq('office', nextOffice)

          for (const nextAdmin of (nextAdmins || [])) {
            await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: nextAdmin.id,
                title: `📋 Needs ${nextStep} Clearance`,
                message: `${req.profiles?.name}'s ${req.document_type} (${req.reference_no}) was approved by ${step}. Waiting for your clearance.`,
                type: 'general',
                link: '/office-admin/documents',
              })
            })
          }
        }
      }

      // Notify main admins
      const { data: allAdmins } = await supabase
        .from('profiles').select('id, office').eq('role', 'admin')
      for (const a of (allAdmins || []).filter((a: { office: string | null }) => !a.office || a.office === 'General Administration')) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: a.id,
            title: `✅ ${step} approved`,
            message: `${adminName} approved ${req.profiles?.name}'s ${req.document_type} (${req.reference_no}).${nextStep ? ` Next: ${nextStep}.` : ' Being prepared.'}`,
            type: 'general',
            link: '/admin/documents',
          })
        })
      }

      showSuccess(
        nextStep && !isLastStep
          ? `✅ Approved! ${nextStep} office has been notified.`
          : '✅ Approved! Document is now being prepared.',
        req.id
      )
      setRemarks(prev => { const n = { ...prev }; delete n[req.id]; return n })
      setExpandedId(null)
      await fetchAll(step)
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  const markReadyForPickup = async (req: DocumentRequest) => {
    if (!pickupDates[req.id]) return
    setUpdating(req.id)
    try {
      const supabase = createClient()
      const pickupDate = pickupDates[req.id]
      const pickupFormatted = new Date(pickupDate).toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })

      await supabase.from('document_requests').update({
        status: 'Ready for Pickup',
        current_step: 'Registrar',
        pickup_date: new Date(pickupDate).toISOString(),
        remarks: remarks[req.id] || null,
        updated_at: new Date().toISOString(),
      }).eq('id', req.id)

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.student_id,
          title: '📦 Your Document is Ready for Pickup!',
          message: `Your ${req.document_type} (${req.reference_no}) is ready at the Registrar Office on ${pickupFormatted}. Bring your valid ID and reference number.`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: req.id,
          response: `Your ${req.document_type} (Ref: ${req.reference_no}) is now ready for pickup at the Registrar Office.\n\nPickup Date: ${pickupFormatted}\n\nPlease bring:\n• A valid ID\n• Reference number: ${req.reference_no}\n\nOffice Hours: Monday to Friday, 8:00 AM – 5:00 PM`,
          studentEmail: req.profiles?.email,
          studentName: req.profiles?.name,
          studentId: req.student_id,
          adminName: 'Registrar Office',
        })
      })

      showSuccess('📦 Marked Ready for Pickup! Student notified via push + email.', req.id)
      setPickupDates(prev => { const n = { ...prev }; delete n[req.id]; return n })
      setRemarks(prev => { const n = { ...prev }; delete n[req.id]; return n })
      setExpandedId(null)
      await fetchAll(step)
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  const markClaimed = async (req: DocumentRequest) => {
    setUpdating(req.id)
    try {
      const supabase = createClient()
      await supabase.from('document_requests').update({
        status: 'Claimed',
        updated_at: new Date().toISOString(),
      }).eq('id', req.id)

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.student_id,
          title: '✅ Document Successfully Claimed',
          message: `Your ${req.document_type} (${req.reference_no}) has been claimed. Thank you!`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      showSuccess('✅ Marked as Claimed! Request is now complete.', req.id)
      setExpandedId(null)
      await fetchAll(step)
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  const getProgress = (req: DocumentRequest) => {
    if (req.status === 'Claimed') return 100
    if (req.status === 'Ready for Pickup') return 92
    if (req.status === 'Being Prepared') return 80
    if (req.status === 'Payment Confirmed') return 70
    if (req.status === 'Payment Required') return 60
    const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
    const totalSteps = steps.length
    const currentStepIdx = steps.indexOf(req.current_step)
    if (currentStepIdx <= 0) return 10
    return Math.round((currentStepIdx / totalSteps) * 60)
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

  const RequestCard = ({ req, isHistory = false }: { req: DocumentRequest; isHistory?: boolean }) => {
    const isExpanded = expandedId === req.id
    const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
    const myIdx = steps.indexOf(step)
    const nextStep = myIdx >= 0 ? steps[myIdx + 1] : null
    const progress = getProgress(req)
    const isBeingPrepared = req.status === 'Being Prepared'
    const isReadyForPickup = req.status === 'Ready for Pickup'
    const isPaymentConfirmed = req.status === 'Payment Confirmed'
    const isClaimed = req.status === 'Claimed'

    // What action can this office take?
    const canApprove = !isHistory && !isClaimed && req.current_step === step
      && !REGISTRAR_ONLY_STATUSES.includes(req.status)
    const canSetPickup = isRegistrar && !isHistory && isBeingPrepared
    const canMarkReady = isRegistrar && !isHistory && isPaymentConfirmed
    const canMarkClaimed = isRegistrar && !isHistory && isReadyForPickup
    const hasAction = canApprove || canSetPickup || canMarkReady || canMarkClaimed

    return (
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Success message */}
        {successId === req.id && (
          <div className="bg-emerald-500 px-5 py-2.5 flex items-center gap-2">
            <Check size={14} className="text-white shrink-0" />
            <p className="text-xs font-semibold text-white">{successMsg}</p>
          </div>
        )}

        {/* Top color bar */}
        <div className="h-1 w-full" style={{
          backgroundColor:
            isClaimed ? '#10b981'
            : isReadyForPickup ? '#10b981'
            : isBeingPrepared ? '#f59e0b'
            : req.status === 'Payment Required' ? '#ef4444'
            : '#3b82f6'
        }} />

        <div className="p-5">

          {/* Student header */}
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
          <div className="rounded-xl px-4 py-3 mb-3" style={{ backgroundColor: 'var(--bg)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{req.document_type}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {req.purpose} · {req.copies} {req.copies === 1 ? 'copy' : 'copies'}
            </p>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-faint)' }}>{req.reference_no}</p>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Approval Progress</p>
              <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{progress}%</p>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? '#10b981' : progress > 70 ? '#f59e0b' : '#3b82f6'
                }} />
            </div>
          </div>

          {/* Approval chain steps */}
          <div className="flex items-center gap-1 flex-wrap mb-3">
            {steps.map((s, i) => {
              const sStatus = STEP_TO_STATUS[s]
              const statusOrderMap: Record<string, number> = {
                'Submitted': 0, 'Library Clearance': 1, 'Guidance Clearance': 2,
                'Dean Approval': 3, 'Payment Required': 4, 'Payment Confirmed': 5,
                'Being Prepared': 6, 'Ready for Pickup': 7, 'Claimed': 8
              }
              const currentStatusRank = statusOrderMap[req.status] ?? 0
              const thisStatusRank = statusOrderMap[sStatus] ?? 0
              const isDone = currentStatusRank > thisStatusRank
              const isCurrent = req.current_step === s && !isDone && !isClaimed

              return (
                <div key={s} className="flex items-center gap-1">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{
                    backgroundColor: isDone ? '#d1fae5' : isCurrent ? '#1e293b' : 'var(--bg)',
                    color: isDone ? '#065f46' : isCurrent ? '#ffffff' : 'var(--text-faint)',
                  }}>
                    {isDone ? '✓ ' : ''}{s}
                  </span>
                  {i < steps.length - 1 && (
                    <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>→</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pickup date badge */}
          {req.pickup_date && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <Clock size={12} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">
                Pickup: {new Date(req.pickup_date).toLocaleDateString('en-PH', {
                  weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {new Date(req.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
            {hasAction && (
              <button
                onClick={() => setExpandedId(isExpanded ? null : req.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {isExpanded ? 'Collapse'
                  : canMarkClaimed ? 'Mark Claimed'
                  : canSetPickup || canMarkReady ? 'Set Pickup'
                  : 'Approve'}
              </button>
            )}
            {isClaimed && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check size={12} />Completed
              </span>
            )}
          </div>

          {/* ── Action Panel ── */}
          {isExpanded && hasAction && (
            <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>

              {/* MARK CLAIMED */}
              {canMarkClaimed && (
                <>
                  <div className="rounded-xl px-4 py-3 bg-emerald-50 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-700">
                      📦 Document is ready. Mark as claimed once the student picks it up.
                    </p>
                  </div>
                  <button
                    onClick={() => markClaimed(req)}
                    disabled={updating === req.id}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                  >
                    {updating === req.id
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Check size={13} />}
                    ✅ Mark as Claimed — Student Received Document
                  </button>
                </>
              )}

              {/* SET PICKUP DATE (Being Prepared or Payment Confirmed) */}
              {(canSetPickup || canMarkReady) && !canMarkClaimed && (
                <>
                  <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700">
                      Set the pickup date. Student will be notified via push notification and email.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Pickup Date *
                    </label>
                    <input
                      type="date"
                      value={pickupDates[req.id] || ''}
                      onChange={e => setPickupDates(prev => ({ ...prev, [req.id]: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Remarks (optional)</label>
                    <input
                      value={remarks[req.id] || ''}
                      onChange={e => setRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Additional instructions for student..."
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => markReadyForPickup(req)}
                      disabled={updating === req.id || !pickupDates[req.id]}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                    >
                      {updating === req.id
                        ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Package size={13} />}
                      📦 Mark Ready for Pickup
                    </button>
                    <button onClick={() => setExpandedId(null)}
                      className="px-4 py-2.5 rounded-xl border text-xs font-semibold"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* NORMAL APPROVAL */}
              {canApprove && !canMarkClaimed && !canSetPickup && !canMarkReady && (
                <>
                  <div className="rounded-xl px-4 py-3" style={{
                    backgroundColor: step === 'Finance' ? '#fef3c7' : '#f0fdf4',
                    border: `1px solid ${step === 'Finance' ? '#fde68a' : '#bbf7d0'}`
                  }}>
                    <p className="text-xs font-semibold" style={{ color: step === 'Finance' ? '#92400e' : '#065f46' }}>
                      {step === 'Finance'
                        ? '⚠️ Approving will notify the student to pay at the Cashier office.'
                        : nextStep
                          ? `✅ Approving will notify the ${nextStep} office to process this next.`
                          : '✅ Approving will mark this as Being Prepared at Registrar.'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Remarks (optional)</label>
                    <input
                      value={remarks[req.id] || ''}
                      onChange={e => setRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Add a note for the student or next office..."
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
                        : <Check size={13} />}
                      {step === 'Finance' ? '⚠️ Require Payment' : `✅ Approve ${step} Clearance`}
                    </button>
                    <button onClick={() => setExpandedId(null)}
                      className="px-4 py-2.5 rounded-xl border text-xs font-semibold"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const displayPending = pendingRequests
  const displayHistory = historyRequests

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Document Requests</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {isRegistrar
            ? 'Set pickup dates, mark ready, and confirm claimed documents'
            : `Requests needing ${step} clearance`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg)' }}>
        {([
          { id: 'pending', label: 'Pending', icon: Inbox, count: displayPending.length, accent: true },
          { id: 'history', label: 'History', icon: History, count: displayHistory.length, accent: false },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              backgroundColor: tab === t.id ? 'var(--bg-card)' : 'transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            <t.icon size={14} />
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                t.accent && tab === 'pending' ? 'bg-amber-400 text-white' : ''
              }`}
                style={!t.accent || tab !== 'pending' ? { backgroundColor: 'var(--border)', color: 'var(--text-muted)' } : {}}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : tab === 'pending' ? (
        displayPending.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No pending requests</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              All requests needing {step} clearance have been processed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayPending.map(req => <RequestCard key={req.id} req={req} />)}
          </div>
        )
      ) : (
        displayHistory.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <History size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No history yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Processed requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayHistory.map(req => <RequestCard key={req.id} req={req} isHistory />)}
          </div>
        )
      )}
    </div>
  )
}