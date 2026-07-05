'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  FileText, Plus, X, Check, Clock, Download,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2,
  Loader2, FileCheck, Package
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
  created_at: string
}

const DOCUMENT_TYPES = [
  {
    value: 'Certificate of Enrollment',
    label: 'Certificate of Enrollment',
    icon: '📄',
    desc: 'Proof that you are currently enrolled',
    steps: ['Registrar'],
    days: 1,
  },
  {
    value: 'Transcript of Records',
    label: 'Transcript of Records (TOR)',
    icon: '📋',
    desc: 'Official copy of your academic records',
    steps: ['Library', 'Dean', 'Finance', 'Registrar'],
    days: 5,
  },
  {
    value: 'Good Moral Certificate',
    label: 'Good Moral Certificate',
    icon: '🏅',
    desc: 'Certificate of good moral character',
    steps: ['Guidance', 'Registrar'],
    days: 2,
  },
  {
    value: 'Diploma',
    label: 'Diploma',
    icon: '🎓',
    desc: 'Official diploma document',
    steps: ['Library', 'Dean', 'Finance', 'Registrar'],
    days: 7,
  },
  {
    value: 'Honorable Dismissal',
    label: 'Honorable Dismissal',
    icon: '📜',
    desc: 'For transferring to another school',
    steps: ['Library', 'Guidance', 'Dean', 'Finance', 'Registrar'],
    days: 5,
  },
  {
    value: 'Authentication',
    label: 'Document Authentication',
    icon: '✅',
    desc: 'Authenticate school documents',
    steps: ['Registrar'],
    days: 2,
  },
]

const PURPOSES = [
  'For Employment',
  'For Scholarship Application',
  'For Board Exam',
  'For Transfer',
  'For Graduate School',
  'For Travel / Visa',
  'For Personal Record',
  'Other',
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'Submitted': { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100', icon: <Clock size={11} /> },
  'Library Clearance': { label: 'Library Clearance', color: 'text-violet-700', bg: 'bg-violet-100', icon: <Clock size={11} /> },
  'Dean Approval': { label: 'Dean Approval', color: 'text-orange-700', bg: 'bg-orange-100', icon: <Clock size={11} /> },
  'Guidance Clearance': { label: 'Guidance Clearance', color: 'text-teal-700', bg: 'bg-teal-100', icon: <Clock size={11} /> },
  'Payment Required': { label: 'Payment Required', color: 'text-red-700', bg: 'bg-red-100', icon: <AlertCircle size={11} /> },
  'Payment Confirmed': { label: 'Payment Confirmed', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <Check size={11} /> },
  'Being Prepared': { label: 'Being Prepared', color: 'text-amber-700', bg: 'bg-amber-100', icon: <Loader2 size={11} /> },
  'Ready for Pickup': { label: 'Ready for Pickup', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <Package size={11} /> },
  'Claimed': { label: 'Claimed', color: 'text-slate-700', bg: 'bg-slate-100', icon: <CheckCircle2 size={11} /> },
  'Rejected': { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100', icon: <X size={11} /> },
}

function RequestSlip({ req, onClose }: { req: DocumentRequest; onClose: () => void }) {
  const doc = DOCUMENT_TYPES.find(d => d.value === req.document_type)
  const isISAP = true // will be filled from profile

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        {/* Slip header */}
        <div className="bg-slate-800 px-6 py-5 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Smart Campus Help Desk</p>
          <p className="text-white font-bold text-lg">Document Request Slip</p>
          <p className="text-slate-400 text-xs mt-1">ISAP & MCNP</p>
        </div>

        {/* Reference number */}
        <div className="bg-slate-50 px-6 py-4 text-center border-b border-slate-200">
          <p className="text-xs text-slate-500 font-semibold mb-1">Reference Number</p>
          <p className="text-3xl font-black text-slate-900 tracking-widest font-mono">
            {req.reference_no}
          </p>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-3">
          {[
            { label: 'Document', value: req.document_type },
            { label: 'Purpose', value: req.purpose },
            { label: 'Copies', value: req.copies.toString() },
            { label: 'Date Filed', value: new Date(req.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) },
            {
              label: 'Est. Pickup Date',
              value: req.pickup_date
                ? new Date(req.pickup_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                : `In ${doc?.days || 3} working day(s)`
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-4">
              <p className="text-xs text-slate-500 shrink-0">{item.label}</p>
              <p className="text-xs font-semibold text-slate-900 text-right">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Status */}
        <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-100 text-center">
          <p className="text-xs text-emerald-700 font-semibold">
            ✅ Request submitted successfully. Please keep this reference number.
          </p>
        </div>

        {/* Instructions */}
        <div className="px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            You will be notified via push notification and email when your document is ready for pickup at the Registrar Office.
          </p>
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 text-white text-sm font-bold rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [profile, setProfile] = useState<{ name: string; school: string; course: string | null; student_id: string | null } | null>(null)
  const [userId, setUserId] = useState('')

  // Form state
  const [selectedDoc, setSelectedDoc] = useState<typeof DOCUMENT_TYPES[0] | null>(null)
  const [purpose, setPurpose] = useState('')
  const [customPurpose, setCustomPurpose] = useState('')
  const [copies, setCopies] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [newRequest, setNewRequest] = useState<DocumentRequest | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [formStep, setFormStep] = useState<'type' | 'details'>('type')

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'

  const fetchRequests = async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('document_requests')
      .select('*')
      .eq('student_id', uid)
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase
        .from('profiles')
        .select('name, school, course, student_id')
        .eq('id', user.id).single()
      if (prof) setProfile(prof)
      await fetchRequests(user.id)
      setLoading(false)
    }
    init()
  }, [])

  const handleSubmit = async () => {
    if (!selectedDoc || !purpose) return
    setSubmitting(true)

    try {
      const supabase = createClient()
      const finalPurpose = purpose === 'Other' ? customPurpose : purpose

      // Calculate pickup date based on days needed
      const pickup = new Date()
      pickup.setDate(pickup.getDate() + (selectedDoc.days || 3))
      // Skip weekends
      if (pickup.getDay() === 0) pickup.setDate(pickup.getDate() + 1)
      if (pickup.getDay() === 6) pickup.setDate(pickup.getDate() + 2)

      const { data, error } = await supabase
        .from('document_requests')
        .insert({
          student_id: userId,
          document_type: selectedDoc.value,
          purpose: finalPurpose,
          copies,
          school: profile?.school,
          pickup_date: pickup.toISOString(),
          status: 'Submitted',
          current_step: selectedDoc.steps[0],
        })
        .select()
        .single()

      if (error) throw error

      // Create first approval step
      await supabase.from('request_approvals').insert({
        request_id: data.id,
        step: selectedDoc.steps[0],
        status: 'pending',
      })

      // Notify admins
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
      if (admins) {
        for (const admin of admins) {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: admin.id,
              title: `New Document Request — ${selectedDoc.value}`,
              message: `${profile?.name} requested a ${selectedDoc.value} for ${finalPurpose}. Ref: ${data.reference_no}`,
              type: 'general',
              link: '/admin/documents',
            })
          })
        }
      }

      setNewRequest(data)
      setShowForm(false)
      setSelectedDoc(null)
      setPurpose('')
      setCopies(1)
      setFormStep('type')
      await fetchRequests(userId)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const activeRequests = requests.filter(r => r.status !== 'Claimed' && r.status !== 'Rejected')
  const pastRequests = requests.filter(r => r.status === 'Claimed' || r.status === 'Rejected')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Receipt slip modal */}
      {newRequest && (
        <RequestSlip req={newRequest} onClose={() => setNewRequest(null)} />
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Document Requests
          </h1>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setFormStep('type') }}
              className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Plus size={16} />
              New Request
            </button>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Request official school documents online
        </p>
      </div>

      {/* Request Form */}
      {showForm && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* Step indicator */}
          <div className="flex items-center px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: accentColor, color: '#fff' }}>1</div>
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Select Document</span>
            </div>
            <div className="flex-1 h-px mx-3" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: formStep === 'details' ? accentColor : 'var(--border)',
                  color: formStep === 'details' ? '#fff' : 'var(--text-faint)'
                }}>2</div>
              <span className="text-xs font-semibold" style={{ color: formStep === 'details' ? 'var(--text)' : 'var(--text-faint)' }}>
                Fill Details
              </span>
            </div>
          </div>

          <div className="p-5">
            {/* Step 1 — Select document type */}
            {formStep === 'type' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  What document do you need?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DOCUMENT_TYPES.map(doc => (
                    <button
                      key={doc.value}
                      onClick={() => {
                        setSelectedDoc(doc)
                        setFormStep('details')
                      }}
                      className="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                      style={{
                        borderColor: selectedDoc?.value === doc.value ? accentColor : 'var(--border)',
                        backgroundColor: 'var(--bg)',
                      }}
                    >
                      <span className="text-2xl shrink-0">{doc.icon}</span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{doc.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{doc.desc}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Clock size={10} style={{ color: 'var(--text-faint)' }} />
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>
                            ~{doc.days} working day{doc.days > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowForm(false)}
                  className="text-sm font-semibold transition-all"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Step 2 — Fill details */}
            {formStep === 'details' && selectedDoc && (
              <div className="space-y-4">

                {/* Selected doc */}
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedDoc.icon}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{selectedDoc.label}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Approval steps: {selectedDoc.steps.join(' → ')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormStep('type')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: 'var(--border)', color: accentColor }}
                  >
                    Change
                  </button>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Purpose *
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {PURPOSES.filter(p => p !== 'Other').map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPurpose(p)}
                        className="px-3 py-2 rounded-xl border-2 text-xs font-semibold text-left transition-all"
                        style={{
                          borderColor: purpose === p ? accentColor : 'var(--border)',
                          backgroundColor: purpose === p ? (isISAP ? '#fee2e2' : '#dbeafe') : 'var(--bg)',
                          color: purpose === p ? accentColor : 'var(--text-muted)',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPurpose('Other')}
                      className="px-3 py-2 rounded-xl border-2 text-xs font-semibold text-left transition-all"
                      style={{
                        borderColor: purpose === 'Other' ? accentColor : 'var(--border)',
                        backgroundColor: purpose === 'Other' ? (isISAP ? '#fee2e2' : '#dbeafe') : 'var(--bg)',
                        color: purpose === 'Other' ? accentColor : 'var(--text-muted)',
                      }}
                    >
                      Other
                    </button>
                  </div>
                  {purpose === 'Other' && (
                    <input
                      value={customPurpose}
                      onChange={e => setCustomPurpose(e.target.value)}
                      placeholder="Please specify the purpose..."
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  )}
                </div>

                {/* Copies */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Number of Copies
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCopies(Math.max(1, copies - 1))}
                      className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-lg transition-all"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      −
                    </button>
                    <span className="text-lg font-bold w-8 text-center" style={{ color: 'var(--text)' }}>
                      {copies}
                    </span>
                    <button
                      onClick={() => setCopies(Math.min(5, copies + 1))}
                      className="w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-lg transition-all"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      +
                    </button>
                    <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Max 5 copies</span>
                  </div>
                </div>

                {/* Approval flow preview */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg)' }}>
                  <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-muted)' }}>
                    APPROVAL PROCESS
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedDoc.steps.map((step, i) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                          style={{ backgroundColor: 'var(--bg-card)' }}>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: accentColor }}>
                            {i + 1}
                          </div>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{step}</span>
                        </div>
                        {i < selectedDoc.steps.length - 1 && (
                          <span style={{ color: 'var(--text-faint)' }}>→</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-faint)' }}>
                    Estimated processing: {selectedDoc.days} working day{selectedDoc.days > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !purpose || (purpose === 'Other' && !customPurpose)}
                    className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
                    style={{ backgroundColor: accentColor }}
                  >
                    {submitting
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</>
                      : <><FileCheck size={15} />Submit Request</>
                    }
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setFormStep('type'); setSelectedDoc(null) }}
                    className="px-4 py-2.5 rounded-xl border text-sm font-semibold"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
            Active Requests ({activeRequests.length})
          </p>
          {activeRequests.map(req => {
            const doc = DOCUMENT_TYPES.find(d => d.value === req.document_type)
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG['Submitted']
            const isExpanded = expandedId === req.id
            const stepIndex = doc?.steps.indexOf(req.current_step) ?? 0
            const totalSteps = doc?.steps.length ?? 1
            const progressPct = req.status === 'Ready for Pickup' || req.status === 'Claimed'
              ? 100
              : Math.round(((stepIndex + 1) / (totalSteps + 2)) * 100)

            return (
              <div key={req.id} className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

                {/* Top bar */}
                {req.status === 'Ready for Pickup' && (
                  <div className="h-1.5 w-full bg-emerald-400" />
                )}
                {req.status === 'Payment Required' && (
                  <div className="h-1.5 w-full bg-red-400" />
                )}

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{doc?.icon || '📄'}</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                          {req.document_type}
                        </p>
                        <p className="text-xs font-mono font-semibold" style={{ color: 'var(--text-faint)' }}>
                          {req.reference_no}
                        </p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${statusCfg.color} ${statusCfg.bg}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%`, backgroundColor: accentColor }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                        Current: <span className="font-semibold">{req.current_step}</span>
                      </p>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--text-faint)' }}>
                        {progressPct}%
                      </p>
                    </div>
                  </div>

                  {/* Waiting for pickup date */}
                  {req.status === 'Payment Confirmed' && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 mb-3">
                      <Clock size={14} className="text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-blue-700">
                          Payment confirmed! Your document is being prepared.
                        </p>
                        {req.pickup_date && (
                          <p className="text-xs text-blue-600 mt-0.5">
                            Ready for pickup on: <span className="font-bold">
                              {new Date(req.pickup_date).toLocaleDateString('en-PH', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                              })}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Alert for ready for pickup */}
                  {req.status === 'Ready for Pickup' && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 mb-3">
                      <Package size={14} className="text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700">
                        Your document is ready! Please pick it up at the Registrar Office.
                      </p>
                    </div>
                  )}

                  {/* Expand / collapse */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold transition-all"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Hide details' : 'View details'}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>

                      {/* Approval steps */}
                      {doc && (
                        <div>
                          <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>
                            APPROVAL STEPS
                          </p>
                          <div className="space-y-2">
                            {doc.steps.map((step, i) => {
                              const currentIdx = doc.steps.indexOf(req.current_step)
                              const isDone = i < currentIdx || req.status === 'Ready for Pickup' || req.status === 'Claimed'
                              const isCurrent = i === currentIdx && req.status !== 'Ready for Pickup' && req.status !== 'Claimed'
                              return (
                                <div key={step} className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                    isDone ? 'bg-emerald-100' : isCurrent ? '' : 'bg-slate-100'
                                  }`}
                                    style={isCurrent ? { backgroundColor: isISAP ? '#fee2e2' : '#dbeafe' } : {}}>
                                    {isDone
                                      ? <Check size={12} className="text-emerald-600" />
                                      : <span className="text-[10px] font-bold" style={{ color: isCurrent ? accentColor : 'var(--text-faint)' }}>
                                          {i + 1}
                                        </span>
                                    }
                                  </div>
                                  <p className="text-xs font-semibold" style={{
                                    color: isDone ? '#10b981' : isCurrent ? accentColor : 'var(--text-faint)'
                                  }}>
                                    {step}
                                    {isCurrent && ' (In Progress)'}
                                    {isDone && ' ✓'}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Info */}
                      <div className="space-y-1.5">
                        {[
                          { label: 'Purpose', value: req.purpose },
                          { label: 'Copies', value: req.copies.toString() },
                          { label: 'Filed', value: new Date(req.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) },
                          req.pickup_date ? { label: 'Est. Pickup', value: new Date(req.pickup_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) } : null,
                          req.remarks ? { label: 'Remarks', value: req.remarks } : null,
                        ].filter(Boolean).map((item, i) => (
                          <div key={i} className="flex items-start justify-between gap-4">
                            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{item!.label}</p>
                            <p className="text-xs font-semibold text-right" style={{ color: 'var(--text)' }}>{item!.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Past Requests */}
      {pastRequests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
            Past Requests ({pastRequests.length})
          </p>
          {pastRequests.map(req => {
            const doc = DOCUMENT_TYPES.find(d => d.value === req.document_type)
            const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG['Claimed']
            return (
              <div key={req.id} className="rounded-2xl border p-4 opacity-70"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{doc?.icon || '📄'}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{req.document_type}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{req.reference_no}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${statusCfg.color} ${statusCfg.bg}`}>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty */}
      {requests.length === 0 && !showForm && (
        <div className="rounded-2xl border p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <FileText size={36} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>No document requests yet</p>
          <p className="text-xs mt-1 mb-5" style={{ color: 'var(--text-muted)' }}>
            Request official school documents online — no need to line up at the Registrar
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-all"
            style={{ backgroundColor: accentColor }}
          >
            Request a Document
          </button>
        </div>
      )}
    </div>
  )
}