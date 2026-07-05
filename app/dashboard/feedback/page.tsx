'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Star, Send, Check } from 'lucide-react'

export default function FeedbackPage() {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<{ name: string; school: string } | null>(null)

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('name, school')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
    }
    getData()
  }, [])

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from('feedback').insert({
        student_id: userId,
        rating,
        comment: comment.trim() || null,
      })

      if (error) throw error

      // Notify all admins about the new feedback
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (admins) {
        for (const admin of admins) {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: admin.id,
              title: 'New Student Feedback',
              message: `${profile?.name || 'A student'} left a ${rating}-star rating${comment.trim() ? ': "' + comment.trim().substring(0, 60) + (comment.trim().length > 60 ? '...' : '') + '"' : ''}`,
              type: 'feedback',
              link: '/admin/feedback',
            })
          })
        }
      }

      setSubmitted(true)
      setRating(0)
      setComment('')
      setTimeout(() => setSubmitted(false), 4000)

    } catch (err) {
      console.error('Feedback error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Feedback
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Share your experience with the Smart Campus Help Desk
        </p>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center shrink-0">
            <Check size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              Thank you for your feedback!
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
              Your response has been recorded and sent to the admin team.
            </p>
          </div>
        </div>
      )}

      <div
        className="rounded-2xl border p-6 space-y-6"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Star rating */}
        <div>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
            How would you rate your experience?
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="transition-all hover:scale-110 active:scale-95"
              >
                <Star
                  size={36}
                  fill={star <= (hover || rating) ? accentColor : 'none'}
                  stroke={star <= (hover || rating) ? accentColor : 'var(--border)'}
                  strokeWidth={1.5}
                />
              </button>
            ))}
            {(hover || rating) > 0 && (
              <span className="ml-2 text-sm font-semibold" style={{ color: accentColor }}>
                {ratingLabels[hover || rating]}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
            Additional comments <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell us what you liked or how we can improve..."
            rows={4}
            className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-none transition-colors"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="flex items-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          <Send size={15} />
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>

      {/* Info */}
      <div
        className="rounded-2xl border p-5"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Why your feedback matters
        </p>
        <div className="space-y-2">
          {[
            'Your ratings help us improve the Help Desk system.',
            'Comments are reviewed by the admin team.',
            'Feedback is anonymous to other students.',
            'Admins are notified when feedback is submitted.',
          ].map((note, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}