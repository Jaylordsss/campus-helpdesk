'use client'

import { useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Star, Send } from 'lucide-react'

export default function FeedbackPage() {
  const supabase = createClient()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('feedback').insert({
      student_id: user.id,
      rating,
      comment: comment.trim(),
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star size={28} className="text-yellow-500 fill-yellow-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Thank you!</h2>
        <p className="text-sm text-gray-500 mt-2">Your feedback has been submitted successfully.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-500 mt-1">Rate your experience with the Help Desk</p>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star rating */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">Your rating</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${
                      star <= (hovered || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-200 fill-gray-200'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Comments <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts or suggestions..."
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-300 hover:bg-blue-400 text-gray-900 text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
          >
            <Send size={15} />
            {submitting ? 'Submitting...' : 'Submit feedback'}
          </button>
        </form>
      </div>
    </div>
  )
}
