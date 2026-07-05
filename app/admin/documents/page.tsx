'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  FileText, Filter, Check, X, Clock,
  ChevronDown, ChevronUp, Package, AlertCircle,
  Send, CheckCircle2
} from 'lucide-react'

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
  profiles: { name: string; email: string; student_id: string | null; course: string | null }
}

const STATUSES = [
  'Submitted',
  'Library Clearance',
  'Guidance Clearance',
  'Dean Approval',
  'Payment Required',
  'Payment Confirmed',
  'Being Prepared',
  'Ready for Pickup',
  'Claimed',
  'Rejected',
]

const DOCUMENT_TYPES = [
  { value: 'Certificate of Enrollment', steps: ['Registrar'] },
  { value: 'Transcript of Records', steps: ['Library', 'Dean', 'Finance', 'Registrar'] },
  { value: 'Good Moral Certificate', steps: ['Guidance', 'Registrar'] },
  { value: 'Diploma', steps: ['Library', 'Dean', 'Finance', 'Registrar'] },
  { value: 'Honorable Dismissal', steps: ['Library', 'Guidance', 'Dean', 'Finance', 'Registrar'] },
  { value: 'Authentication', steps: ['Registrar'] },
]

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

const STEP_NEXT_STATUS: Record<string, string> = {
  'Library': 'Library Clearance',
  'Guidance': 'Guidance Clearance',
  'Dean': 'Dean Approval',
  'Finance': 'Payment Required',
  'Registrar': 'Being Prepared',
}

export default function AdminDocumentsPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [schoolFilter, setSchoolFilter] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [remarks, setRemarks] = useState<Record<string, string>>({})
  const [pickupDates, setPickupDates] = useState<Record<string, string>>({})

  const fetchRequests = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('document_requests')
      .select('*, profiles(name, email, student_id, course)')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [])

  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter
    const matchSchool = schoolFilter === 'ALL' || r.school === schoolFilter
    return matchStatus && matchSchool
  })

  const pendingCount = requests.filter(r =>
    r.status !== 'Claimed' && r.status !== 'Rejected'
  ).length

  const updateStatus = async (req: DocumentRequest, newStatus: string, nextStep?: string) => {
    setUpdating(req.id)
    try {
      const supabase = createClient()
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (nextStep) updateData.current_step = nextStep
      if (remarks[req.id]) updateData.remarks = remarks[req.id]
      if (pickupDates[req.id]) updateData.pickup_date = new Date(pickupDates[req.id]).toISOString()

      await supabase.from('document_requests').update(updateData).eq('id', req.id)

      // Add approval record
      await supabase.from('request_approvals').insert({
        request_id: req.id,
        step: req.current_step,
        status: newStatus === 'Rejected' ? 'rejected' : 'approved',
        remarks: remarks[req.id] || null,
      })

      // Notify student
      let notifTitle = ''
      let notifMsg = ''

      if (newStatus === 'Ready for Pickup') {
        notifTitle = '📦 Document Ready for Pickup!'
        notifMsg = `Your ${req.document_type} is ready. Please pick it up at the Registrar Office.`
      } else if (newStatus === 'Payment Required') {
        notifTitle = '💰 Payment Required'
        notifMsg = `Please visit the Finance/Cashier office to pay for your ${req.document_type}.`
      } else if (newStatus === 'Rejected') {
        notifTitle = '❌ Document Request Rejected'
        notifMsg = `Your request for ${req.document_type} was rejected. ${remarks[req.id] || ''}`
      } else {
        notifTitle = `📋 Request Update — ${newStatus}`
        notifMsg = `Your ${req.document_type} request (${req.reference_no}) status: ${newStatus}`
      }

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.student_id,
          title: notifTitle,
          message: notifMsg,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      // Also send email if ready for pickup
      if (newStatus === 'Ready for Pickup') {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiryId: req.id,
            response: `Your ${req.document_type} (Ref: ${req.reference_no}) is now ready for pickup at the Registrar Office. Please bring a valid ID and this reference number.${pickupDates[req.id] ? `\n\nPickup Date: ${new Date(pickupDates[req.id]).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''}`,
            studentEmail: req.profiles?.email,
            studentName: req.profiles?.name,
            studentId: req.student_id,
            adminName: 'Registrar Office',
          })
        })
      }

      setRemarks(prev => { const n = { ...prev }; delete n[req.id]; return n })
      setPickupDates(prev => { const n = { ...prev }; delete n[req.id]; return n })
      setExpandedId(null)
      await fetchRequests()
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  const getNextActions = (req: DocumentRequest) => {
    const doc = DOCUMENT_TYPES.find(d => d.value === req.document_type)
    if (!doc) return []
    if (req.status === 'Claimed' || req.status === 'Rejected') return []

    const currentIdx = doc.steps.indexOf(req.current_step)
    const actions = []

    if (req.status === 'Payment Required') {
      actions.push({
        label: '✅ Confirm Payment Received',
        status: 'Payment Confirmed',
        nextStep: req.current_step,
        color: '#10b981',
        needsPickupDate: true,
      })
    } else if (req.status === 'Payment Confirmed') {
      // Waiting for cron to auto-mark ready — admin can manually mark ready too
      actions.push({
        label: '📦 Mark Ready Now (Manual)',
        status: 'Ready for Pickup',
        color: '#10b981',
      })
    } else if (req.status === 'Ready for Pickup') {
      actions.push({
        label: '✅ Mark as Claimed',
        status: 'Claimed',
        color: '#64748b',
      })
    } else if (req.status === 'Being Prepared') {
      actions.push({
        label: '📦 Mark Ready for Pickup',
        status: 'Ready for Pickup',
        color: '#10b981',
        needsPickupDate: true,
      })
    } else {
      const nextStep = doc.steps[currentIdx + 1]

      if (currentIdx === doc.steps.length - 1) {
        actions.push({
          label: '✅ Approve — Mark Being Prepared',
          status: 'Being Prepared',
          color: '#f59e0b',
        })
      } else if (nextStep === 'Finance') {
        actions.push({
          label: `✅ Approve ${req.current_step} — Require Payment`,
          status: 'Payment Required',
          nextStep: 'Finance',
          color: '#ef4444',
        })
      } else {
        actions.push({
          label: `✅ Approve ${req.current_step} → ${nextStep}`,
          status: STEP_NEXT_STATUS[req.current_step] || req.status,
          nextStep,
          color: '#2563eb',
        })
      }
    }

    if (req.status !== 'Claimed') {
      actions.push({
        label: '❌ Reject',
        status: 'Rejected',
        color: '#ef4444',
        isReject: true,
      })
    }

    return actions
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Document Requests</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Review and process student document requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: requests.length, color: 'var(--text)' },
          { label: 'Pending', value: pendingCount, color: '#f59e0b' },
          { label: 'Ready', value: requests.filter(r => r.status === 'Ready for Pickup').length, color: '#10b981' },
          { label: 'Claimed', value: requests.filter(r => r.status === 'Claimed').length, color: '#64748b' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <option value="ALL">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* School filter */}
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
        </div>
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Showing <span className="font-bold" style={{ color: 'var(--text)' }}>{filtered.length}</span> of {requests.length} requests
        </p>
      </div>

      {/* Request list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const isExpanded = expandedId === req.id
            const actions = getNextActions(req)
            const needsPickupDate = actions.some(a => a.needsPickupDate)

            return (
              <div key={req.id} className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                {/* Ready for pickup highlight */}
                {req.status === 'Ready for Pickup' && <div className="h-1 bg-emerald-400" />}
                {req.status === 'Payment Required' && <div className="h-1 bg-red-400" />}
                {req.status === 'Submitted' && <div className="h-1 bg-blue-400" />}

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        req.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.profiles?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                          {req.profiles?.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                          {req.profiles?.email}
                        </p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-faint)' }}>
                          {req.reference_no}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLOR[req.status] || 'bg-slate-100 text-slate-600'}`}>
                        {req.status}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.school}
                      </span>
                    </div>
                  </div>

                  {/* Document info */}
                  <div className="rounded-xl px-4 py-3 mb-3 flex items-start justify-between gap-3"
                    style={{ backgroundColor: 'var(--bg)' }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                        {req.document_type}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Purpose: {req.purpose} · {req.copies} {req.copies === 1 ? 'copy' : 'copies'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Current Step
                      </p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                        {req.current_step}
                      </p>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {new Date(req.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Collapse' : 'Manage'}
                    </button>
                  </div>

                  {/* Expanded — actions */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>

                      {/* Remarks input */}
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          Remarks / Notes (optional)
                        </label>
                        <input
                          value={remarks[req.id] || ''}
                          onChange={e => setRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Add a note for the student..."
                          className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        />
                      </div>

                      {/* Pickup date */}
                      {(req.status === 'Being Prepared' || req.status === 'Payment Required' || actions.some((a: {needsPickupDate?: boolean}) => a.needsPickupDate)) && (
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            Set Pickup Date *
                          </label>
                          <input
                            type="date"
                            value={pickupDates[req.id] || ''}
                            onChange={e => setPickupDates(prev => ({ ...prev, [req.id]: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          />
                          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
                            On this date, the document will automatically be marked Ready for Pickup and the student will be notified.
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => updateStatus(req, action.status, action.nextStep)}
                            disabled={updating === req.id}
                            className="flex items-center gap-2 px-4 py-2.5 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-all"
                            style={{ backgroundColor: action.color }}
                          >
                            {updating === req.id
                              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : null
                            }
                            {action.label}
                          </button>
                        ))}
                      </div>

                      {/* Existing remarks */}
                      {req.remarks && (
                        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg)' }}>
                          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Previous remarks</p>
                          <p className="text-sm" style={{ color: 'var(--text)' }}>{req.remarks}</p>
                        </div>
                      )}
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