'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { FileText, ChevronDown, ChevronUp, Check, Clock, Package, History, Inbox } from 'lucide-react'
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

const STATUS_ORDER = [
  'Submitted', 'Library Clearance', 'Guidance Clearance', 'Dean Approval',
  'Payment Required', 'Payment Confirmed', 'Being Prepared', 'Ready for Pickup', 'Claimed'
]

export default function OfficeDocumentsPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [historyRequests, setHistoryRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [office, setOffice] = useState('')
  const [step, setStep] = useState('')
  const [adminName, setAdminName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<string | null>(null)

  const isRegistrar = step === 'Registrar'

  const fetchRequests = async (officeStep: string) => {
    const supabase = createClient()

    // Pending — needs this office's action
    const { data: pending } = await supabase
      .from('document_requests')
      .select('*, profiles(name, email)')
      .eq('current_step', officeStep)
      .not('status', 'in', '("Claimed","Rejected","Ready for Pickup")')
      .order('created_at', { ascending: false })
    setRequests(pending || [])

    // History — all requests this office has touched or that are done
    let historyQuery = supabase
      .from('document_requests')
      .select('*, profiles(name, email)')
      .order('updated_at', { ascending: false })

    if (officeStep === 'Registrar') {
      // Registrar sees all requests (they are the final step)
      const { data: hist } = await historyQuery
        .in('status', ['Ready for Pickup', 'Claimed', 'Rejected', 'Being Prepared'])
      setHistoryRequests(hist || [])
    } else {
      // Other offices see requests they've approved (past their step)
      const { data: hist } = await historyQuery
        .not('status', 'in', '("Submitted")')
        .neq('current_step', officeStep)
      setHistoryRequests((hist || []).filter(r => {
        const steps = DOCUMENT_STEPS[r.document_type] || []
        const stepIdx = steps.indexOf(officeStep)
        const currentIdx = steps.indexOf(r.current_step)
        return stepIdx >= 0 && currentIdx > stepIdx
      }))
    }
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

  const getProgress = (req: DocumentRequest) => {
    const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
    // Add virtual steps for full flow
    const allStatuses = ['Submitted', ...steps.map(s => STEP_TO_STATUS[s] || s), 'Ready for Pickup', 'Claimed']
    const currentStatusIdx = STATUS_ORDER.indexOf(req.status)
    const totalSteps = steps.length + 2 // +submitted +claimed
    const completedSteps = steps.filter(s => {
      const sStatus = STEP_TO_STATUS[s]
      return STATUS_ORDER.indexOf(sStatus) <= currentStatusIdx
    }).length
    const pct = req.status === 'Claimed' ? 100
      : req.status === 'Ready for Pickup' ? 90
      : req.status === 'Being Prepared' ? 75
      : Math.round(((completedSteps) / totalSteps) * 100)
    return Math.min(pct, 95)
  }

  const approveStep = async (req: DocumentRequest) => {
    setUpdating(req.id)
    try {
      const supabase = createClient()
      const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
      const currentIdx = steps.indexOf(step)
      const nextStep = steps[currentIdx + 1] || null
      const isLastStep = currentIdx === steps.length - 1

      let newStatus = ''
      let newCurrentStep = nextStep || step

      if (step === 'Finance') {
        newStatus = 'Payment Required'
        newCurrentStep = 'Finance'
      } else if (isLastStep && step === 'Registrar') {
        newStatus = 'Being Prepared'
        newCurrentStep = 'Registrar'
      } else {
        newStatus = STEP_TO_STATUS[step] || 'In Progress'
      }

      await supabase.from('document_requests').update({
        status: newStatus,
        current_step: newCurrentStep,
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

      // Notify student
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.student_id,
          title: step === 'Finance' ? '💰 Payment Required' : `✅ ${step} Approved`,
          message: step === 'Finance'
            ? `Please visit the Finance/Cashier office to pay for your ${req.document_type} (${req.reference_no}).`
            : nextStep
              ? `Your ${req.document_type} (${req.reference_no}) approved by ${step}. Next: ${nextStep}.`
              : `Your ${req.document_type} (${req.reference_no}) is being prepared. You will be notified when ready for pickup.`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      // Notify next office admin
      if (nextStep && step !== 'Finance') {
        const nextOffice = STEP_TO_OFFICE[nextStep]
        if (nextOffice) {
          const { data: nextAdmins } = await supabase
            .from('profiles').select('id').eq('role', 'admin').eq('office', nextOffice)
          for (const nextAdmin of (nextAdmins || [])) {
            await fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: nextAdmin.id,
                title: `📋 Document Needs ${nextStep} Clearance`,
                message: `${req.profiles?.name} needs ${nextStep} clearance for ${req.document_type} (${req.reference_no}). Approved by ${step}.`,
                type: 'general',
                link: '/office-admin/documents',
              })
            })
          }
        }
      }

      // Notify main admin
      const { data: allAdmins } = await supabase.from('profiles').select('id, office').eq('role', 'admin')
      for (const a of (allAdmins || []).filter((a: { office: string | null }) => !a.office || a.office === 'General Administration')) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: a.id,
            title: `✅ ${step} approved — ${req.document_type}`,
            message: `${adminName} (${step}) approved ${req.profiles?.name}'s request (${req.reference_no}).${nextStep ? ` Next: ${nextStep}.` : ''}`,
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

  const markReadyForPickup = async (req: DocumentRequest) => {
    setUpdating(req.id)
    try {
      const supabase = createClient()
      const pickupDate = pickupDates[req.id]

      await supabase.from('document_requests').update({
        status: 'Ready for Pickup',
        current_step: 'Registrar',
        pickup_date: pickupDate ? new Date(pickupDate).toISOString() : null,
        remarks: remarks[req.id] || null,
        updated_at: new Date().toISOString(),
      }).eq('id', req.id)

      const pickupFormatted = pickupDate
        ? new Date(pickupDate).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'as soon as possible'

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.student_id,
          title: '📦 Your Document is Ready for Pickup!',
          message: `Your ${req.document_type} (${req.reference_no}) is ready. Please pick it up at the Registrar Office${pickupDate ? ` on ${pickupFormatted}` : ''}.`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      // Send email
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: req.id,
          response: `Your ${req.document_type} (Ref: ${req.reference_no}) is now ready for pickup at the Registrar Office.\n\n${pickupDate ? `Pickup Date: ${pickupFormatted}\n\n` : ''}Please bring a valid ID and your reference number: ${req.reference_no}\n\nOffice Hours: Monday to Friday, 8:00 AM – 5:00 PM`,
          studentEmail: req.profiles?.email,
          studentName: req.profiles?.name,
          studentId: req.student_id,
          adminName: 'Registrar Office',
        })
      })

      setSuccessId(req.id)
      setTimeout(() => setSuccessId(null), 4000)
      setPickupDates(prev => { const n = { ...prev }; delete n[req.id]; return n })
      setRemarks(prev => { const n = { ...prev }; delete n[req.id]; return n })
      setExpandedId(null)
      await fetchRequests(step)
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
          title: '✅ Document Claimed',
          message: `Your ${req.document_type} (${req.reference_no}) has been successfully claimed. Thank you!`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

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
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Your office does not process document requests directly.</p>
        </div>
      </div>
    )
  }

  const RequestCard = ({ req, isHistory = false }: { req: DocumentRequest; isHistory?: boolean }) => {
    const isExpanded = expandedId === req.id
    const steps = DOCUMENT_STEPS[req.document_type] || ['Registrar']
    const currentIdx = steps.indexOf(step)
    const nextStep = steps[currentIdx + 1] || null
    const progress = getProgress(req)
    const isBeingPrepared = req.status === 'Being Prepared'
    const isReadyForPickup = req.status === 'Ready for Pickup'
    const isClaimed = req.status === 'Claimed'

    return (
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Success bar */}
        {successId === req.id && (
          <div className="bg-emerald-500 px-5 py-2.5 flex items-center gap-2">
            <Check size={14} className="text-white shrink-0" />
            <p className="text-xs font-semibold text-white">
              {isReadyForPickup ? '📦 Marked Ready for Pickup — student notified!'
                : isClaimed ? '✅ Marked as Claimed!'
                : `✅ Approved! ${nextStep ? `${nextStep} office notified.` : 'Being prepared.'}`}
            </p>
          </div>
        )}

        {/* Status color bar */}
        <div className="h-1 w-full" style={{
          backgroundColor: isReadyForPickup || isClaimed ? '#10b981'
            : isBeingPrepared ? '#f59e0b'
            : req.status === 'Payment Required' ? '#ef4444'
            : '#3b82f6'
        }} />

        <div className="p-5">

          {/* Header */}
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
              <p className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>Progress</p>
              <p className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{progress}%</p>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? '#10b981' : progress > 60 ? '#f59e0b' : '#3b82f6'
                }}
              />
            </div>
          </div>

          {/* Approval chain */}
          <div className="flex items-center gap-1 flex-wrap mb-3">
            {steps.map((s, i) => {
              const sStatus = STEP_TO_STATUS[s]
              const isDone = STATUS_ORDER.indexOf(sStatus) <= STATUS_ORDER.indexOf(req.status) && req.status !== 'Submitted'
              const isCurrent = req.current_step === s && !isDone
              return (
                <div key={s} className="flex items-center gap-1">
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: isDone ? '#d1fae5' : isCurrent ? '#1e293b' : 'var(--bg)',
                      color: isDone ? '#065f46' : isCurrent ? '#ffffff' : 'var(--text-faint)',
                    }}
                  >
                    {isDone ? '✓ ' : ''}{s}
                  </span>
                  {i < steps.length - 1 && (
                    <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>→</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pickup date if set */}
          {req.pickup_date && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <Clock size={12} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-semibold text-emerald-700">
                Pickup date: {new Date(req.pickup_date).toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {new Date(req.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>

            {!isHistory && !isClaimed && (
              <button
                onClick={() => setExpandedId(isExpanded ? null : req.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {isExpanded ? 'Collapse' : isReadyForPickup ? 'Mark Claimed' : isBeingPrepared ? 'Set Pickup' : 'Approve'}
              </button>
            )}

            {isClaimed && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check size={12} />
                Completed
              </span>
            )}
          </div>

          {/* Expanded form */}
          {isExpanded && !isHistory && !isClaimed && (
            <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>

              {/* Ready for Pickup — Mark Claimed */}
              {isReadyForPickup && (
                <>
                  <div className="rounded-xl px-4 py-3 bg-emerald-50 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-700">
                      📦 This document is ready for pickup. Click below once the student has claimed it.
                    </p>
                  </div>
                  <button
                    onClick={() => markClaimed(req)}
                    disabled={updating === req.id}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                  >
                    {updating === req.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={13} />}
                    ✅ Mark as Claimed — Student Received Document
                  </button>
                </>
              )}

              {/* Being Prepared — Registrar sets pickup date */}
              {isBeingPrepared && isRegistrar && (
                <>
                  <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700">
                      Set a pickup date and mark as Ready for Pickup. Student will be notified with push + email.
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
                      placeholder="Additional notes for student..."
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
                      {updating === req.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Package size={13} />}
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

              {/* Normal approval step */}
              {!isBeingPrepared && !isReadyForPickup && (
                <>
                  <div className="rounded-xl px-4 py-3"
                    style={{ backgroundColor: step === 'Finance' ? '#fef3c7' : '#f0fdf4', border: `1px solid ${step === 'Finance' ? '#fde68a' : '#bbf7d0'}` }}>
                    <p className="text-xs font-semibold" style={{ color: step === 'Finance' ? '#92400e' : '#065f46' }}>
                      {step === 'Finance'
                        ? '⚠️ Approving will notify the student to pay at the Cashier office.'
                        : nextStep
                          ? `✅ Approving will notify the ${nextStep} office to process this request next.`
                          : '✅ Approving will mark this document as Being Prepared at the Registrar.'
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
                      {updating === req.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={13} />}
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Document Requests</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {isRegistrar
            ? 'Manage all document requests — approve, set pickup date, and mark claimed'
            : `Requests awaiting ${step} clearance`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg)' }}>
        <button
          onClick={() => setTab('pending')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{
            backgroundColor: tab === 'pending' ? 'var(--bg-card)' : 'transparent',
            color: tab === 'pending' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab === 'pending' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Inbox size={14} />
          Pending
          {requests.length > 0 && (
            <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
          style={{
            backgroundColor: tab === 'history' ? 'var(--bg-card)' : 'transparent',
            color: tab === 'history' ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab === 'history' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <History size={14} />
          History
          {historyRequests.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--border)', color: 'var(--text-muted)' }}>
              {historyRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : tab === 'pending' ? (
        requests.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No pending requests</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              All requests needing {step} have been processed
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => <RequestCard key={req.id} req={req} />)}
          </div>
        )
      ) : (
        historyRequests.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <History size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No history yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Completed requests will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyRequests.map(req => <RequestCard key={req.id} req={req} isHistory />)}
          </div>
        )
      )}
    </div>
  )
}