'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  Megaphone, Bell, BookOpen, Star,
  Calendar, AlertCircle, Clock
} from 'lucide-react'

type Announcement = {
  id: string
  title: string
  content: string
  type: string
  school: string
  created_at: string
  expires_at: string | null
}

const typeConfig: Record<string, {
  label: string
  icon: React.ElementType
  bg: string
  text: string
  border: string
}> = {
  urgent: { label: 'Urgent', icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  enrollment: { label: 'Enrollment', icon: BookOpen, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  event: { label: 'Event', icon: Star, bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  holiday: { label: 'Holiday', icon: Calendar, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  general: { label: 'Announcement', icon: Bell, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    const getData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles').select('school').eq('id', user.id).single()
        if (!profile) return
        setSchool(profile.school)

        const { data } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .or(`school.eq.${profile.school},school.eq.BOTH`)
          .order('created_at', { ascending: false })

        // Filter out expired
        const valid = (data || []).filter(a =>
          !a.expires_at || new Date(a.expires_at) >= new Date()
        )
        setAnnouncements(valid)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    getData()
  }, [])

  const isISAP = school === 'ISAP'
  const accentText = isISAP ? 'text-red-600' : 'text-blue-600'
  const accentBg = isISAP ? 'bg-red-500' : 'bg-blue-500'
  const accentBorder = isISAP
    ? 'border-red-400 bg-red-50 text-red-700'
    : 'border-blue-400 bg-blue-50 text-blue-700'

  const typeFilters = ['ALL', 'urgent', 'enrollment', 'event', 'holiday', 'general']

  const filtered = filter === 'ALL'
    ? announcements
    : announcements.filter(a => a.type === filter)

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const timeAgo = (date: string) => {
    const now = new Date().getTime()
    const then = new Date(date).getTime()
    const diff = now - then
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
        <p className="text-sm text-slate-500 mt-1">
          Latest updates from{' '}
          <span className={`font-semibold ${accentText}`}>{school}</span>
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {typeFilters.map(f => {
          const cfg = typeConfig[f]
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all capitalize ${
                filter === f
                  ? f === 'ALL'
                    ? accentBorder
                    : `${cfg?.border} ${cfg?.bg} ${cfg?.text}`
                  : 'border-slate-100 text-slate-500 hover:border-slate-200 bg-white'
              }`}
            >
              {f === 'ALL' ? 'All' : cfg?.label}
            </button>
          )
        })}
      </div>

      {/* Announcements */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <Megaphone size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No announcements</p>
          <p className="text-xs text-slate-300 mt-1">
            Check back later for updates from your school
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const cfg = typeConfig[a.type] || typeConfig.general
            const Icon = cfg.icon
            const isNew = new Date().getTime() - new Date(a.created_at).getTime() < 86400000

            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-sm ${
                  a.type === 'urgent' ? 'border-red-200' : 'border-slate-100'
                }`}
              >
                {/* Type badge + new badge */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                    <Icon size={12} />
                    {cfg.label}
                  </div>
                  {isNew && (
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-full">
                      New
                    </span>
                  )}
                  {a.school !== 'BOTH' && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      a.school === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {a.school}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mb-2">{a.title}</h3>

                {/* Content */}
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {a.content}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={11} />
                    {timeAgo(a.created_at)} · {formatDate(a.created_at)}
                  </div>
                  {a.expires_at && (
                    <span className="text-xs text-slate-400">
                      Until {new Date(a.expires_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </span>
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