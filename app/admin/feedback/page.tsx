'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Star, MessageSquare } from 'lucide-react'

type Feedback = {
  id: string
  rating: number
  comment: string
  created_at: string
  student_id: string
  profiles: { name: string; email: string; school: string }
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState(0)
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('feedback')
        .select('*, profiles(name, email, school)')
        .order('created_at', { ascending: false })
      setFeedback(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const filtered = feedback
    .filter(f => filterSchool === 'ALL' || f.profiles?.school === filterSchool)
    .filter(f => filterRating === 0 || f.rating === filterRating)

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : '0.0'

  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: feedback.filter(f => f.rating === r).length,
    percent: feedback.length > 0
      ? Math.round((feedback.filter(f => f.rating === r).length / feedback.length) * 100)
      : 0
  }))

  const ratingLabel = (r: number) =>
    ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][r]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Feedback</h1>
        <p className="text-sm text-slate-400 mt-1">Student ratings and comments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4 sm:col-span-2">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-4xl font-bold text-slate-900">{avgRating}</p>
              <div className="flex items-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    size={14}
                    className={s <= Math.round(Number(avgRating))
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-slate-200 fill-slate-200'
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">Average rating</p>
            </div>
            <div className="flex-1 space-y-1">
              {ratingCounts.map(({ rating, count, percent }) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4">{rating}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-yellow-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <Star size={15} className="text-yellow-400 fill-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{feedback.length}</p>
          <p className="text-xs text-slate-400 font-medium">Total responses</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <MessageSquare size={15} className="text-slate-400 mb-2" />
          <p className="text-2xl font-bold text-slate-900">
            {feedback.filter(f => f.comment?.trim()).length}
          </p>
          <p className="text-xs text-slate-400 font-medium">With comments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterSchool(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterSchool === s
                  ? s === 'ISAP' ? 'bg-red-100 text-red-700'
                    : s === 'MCNP' ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterRating(0)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterRating === 0 ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}
          >
            All stars
          </button>
          {[5, 4, 3, 2, 1].map(r => (
            <button
              key={r}
              onClick={() => setFilterRating(filterRating === r ? 0 : r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                filterRating === r
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-white border border-slate-200 text-slate-500'
              }`}
            >
              {r} <Star size={11} className={filterRating === r ? 'fill-yellow-500 text-yellow-500' : ''} />
            </button>
          ))}
        </div>
      </div>

      {/* Feedback list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <Star size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No feedback found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(f => (
            <div key={f.id} className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    f.profiles?.school === 'ISAP'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {f.profiles?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {f.profiles?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400">{f.profiles?.school}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-0.5 justify-end">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={13}
                        className={s <= f.rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-200 fill-slate-200'
                        }
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{ratingLabel(f.rating)}</p>
                </div>
              </div>

              {f.comment ? (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 leading-relaxed">
                  "{f.comment}"
                </p>
              ) : (
                <p className="text-xs text-slate-300 italic">No comment provided</p>
              )}

              <p className="text-xs text-slate-300 mt-3">
                {new Date(f.created_at).toLocaleDateString('en-PH', {
                  year: 'numeric', month: 'short', day: 'numeric'
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}