'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MessageSquare, Send, Clock, CheckCircle, ChevronDown } from 'lucide-react'

type Inquiry = {
  id: string
  message: string
  response: string | null
  status: string
  category: string
  created_at: string
}

const CATEGORIES = [
  { value: 'Registrar', label: 'Registrar', icon: '📋', desc: 'Enrollment, records, documents' },
  { value: 'Finance', label: 'Finance / Cashier', icon: '💰', desc: 'Tuition fees, payments, scholarships' },
  { value: 'Account', label: 'Account', icon: '👤', desc: 'Login issues, account problems' },
  { value: 'Office of Student Services', label: 'Office of Student Services', icon: '🎓', desc: 'Student affairs and services' },
  { value: 'Office of Guidance Services', label: 'Office of Guidance Services', icon: '🤝', desc: 'Counseling and guidance' },
  { value: 'CITE', label: 'CITE - College of Information Technology', icon: '💻', desc: 'IT department concerns' },
  { value: 'CASTE', label: 'CASTE - College of Arts, Sciences and Teacher Education', icon: '📚', desc: 'Arts and sciences department' },
  { value: 'General', label: 'General', icon: '💬', desc: 'Other concerns' },
]

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<{ school: string; name: string } | null>(null)
  const [step, setStep] = useState<'category' | 'message'>('category')
  const [showCategorySheet, setShowCategorySheet] = useState(false)

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase
        .from('profiles').select('school, name').eq('id', user.id).single()
      if (prof) setProfile(prof)
      const { data } = await supabase
        .from('inquiries').select('*').eq('student_id', user.id)
        .order('created_at', { ascending: false })
      setInquiries(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !category) return
    setSubmitting(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('inquiries')
      .insert({ student_id: userId, message: message.trim(), category })
      .select().single()

    if (!error && data) {
      setInquiries([data, ...inquiries])
      setMessage('')
      setCategory('')
      setStep('category')

      const CATEGORY_TO_OFFICE: Record<string, string | null> = {
        'Registrar': 'Registrar',
        'Finance': 'Finance / Cashier',
        'Account': null,
        'Office of Student Services': 'Office of Student Services',
        'Office of Guidance Services': 'Office of Guidance Services',
        'CITE': 'CITE - College of Information Technology',
        'CASTE': 'CASTE - College of Arts Sciences and Teacher Education',
        'General': null,
      }

      const targetOffice = CATEGORY_TO_OFFICE[category]
      const { data: allAdmins } = await supabase
        .from('profiles').select('id, office').eq('role', 'admin')

      const relevantAdmins = (allAdmins || []).filter(admin =>
        targetOffice
          ? admin.office === targetOffice || !admin.office || admin.office === 'General Administration'
          : !admin.office || admin.office === 'General Administration'
      )

      for (const admin of relevantAdmins) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: admin.id,
            title: `New Inquiry — ${category}`,
            message: message.trim().length > 80
              ? message.trim().substring(0, 80) + '...'
              : message.trim(),
            type: 'inquiry',
            link: admin.office === targetOffice ? '/office-admin/inquiries' : '/admin/inquiries',
          })
        })
      }
    }
    setSubmitting(false)
  }

  const selectedCategory = CATEGORIES.find(c => c.value === category)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inquiries</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Submit a concern to the right office
        </p>
      </div>

      {/* Submit form */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Step indicator */}
        <div className="flex items-center px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: accentColor, color: '#fff' }}
            >1</div>
            <span className="text-xs font-semibold" style={{ color: step === 'category' ? 'var(--text)' : 'var(--text-faint)' }}>
              Select Office / Department
            </span>
          </div>
          <div className="flex-1 h-px mx-3" style={{ backgroundColor: 'var(--border)' }} />
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: step === 'message' ? accentColor : 'var(--border)',
                color: step === 'message' ? '#fff' : 'var(--text-faint)'
              }}
            >2</div>
            <span className="text-xs font-semibold" style={{ color: step === 'message' ? 'var(--text)' : 'var(--text-faint)' }}>
              Write your message
            </span>
          </div>
        </div>

        <div className="p-5">

          {/* Step 1 — Category grid */}
          {step === 'category' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Where do you want to send your inquiry?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setCategory(cat.value)
                      setStep('message')
                    }}
                    className="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                    style={{
                      borderColor: category === cat.value ? accentColor : 'var(--border)',
                      backgroundColor: 'var(--bg)',
                    }}
                  >
                    <span className="text-xl shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                        {cat.label}
                      </p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {cat.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Message */}
          {step === 'message' && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Selected category */}
              <div
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedCategory?.icon}</span>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                      {selectedCategory?.label}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {selectedCategory?.desc}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('category')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                  style={{ borderColor: 'var(--border)', color: accentColor }}
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Your message
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your concern clearly..."
                  rows={4}
                  required
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-none"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  <Send size={15} />
                  {submitting ? 'Submitting...' : 'Submit Inquiry'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('category'); setMessage('') }}
                  className="px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Inquiry list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
            Your Inquiries ({inquiries.length})
          </p>
        </div>

        {inquiries.length === 0 ? (
          <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <MessageSquare size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No inquiries yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Submit your first inquiry above</p>
          </div>
        ) : (
          inquiries.map(inquiry => {
            const cat = CATEGORIES.find(c => c.value === inquiry.category)
            return (
              <div key={inquiry.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat?.icon || '💬'}</span>
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                    >
                      {inquiry.category || 'General'}
                    </span>
                  </div>
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

                <p className="text-sm" style={{ color: 'var(--text)' }}>{inquiry.message}</p>

                {inquiry.response && (
                  <div
                    className="mt-3 rounded-xl px-4 py-3"
                    style={{ backgroundColor: 'var(--bg)' }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: accentColor }}>
                      Admin response:
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text)' }}>{inquiry.response}</p>
                  </div>
                )}

                <p className="text-xs mt-2" style={{ color: 'var(--text-faint)' }}>
                  {new Date(inquiry.created_at).toLocaleDateString('en-PH', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}