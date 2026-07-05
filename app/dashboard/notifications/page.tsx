'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Bell, MessageSquare, Star, CheckCircle,
  Megaphone, ArrowLeft, Clock, ChevronRight
} from 'lucide-react'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  link: string | null
  created_at: string
}

type DetailData = {
  title: string
  content: string
  type: string
  created_at: string
  extra?: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Notification | null>(null)
  const [detailData, setDetailData] = useState<DetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<{ school: string; name: string } | null>(null)

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'
  const accentBg = isISAP ? 'bg-red-50' : 'bg-blue-50'
  const accentText = isISAP ? 'text-red-600' : 'text-blue-600'

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
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setNotifications(data || [])
      setLoading(false)
    }
    getData()
  }, [])

  const markRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const handleSelect = async (notif: Notification) => {
    setSelected(notif)
    setDetailData(null)
    setDetailLoading(true)
    if (!notif.is_read) markRead(notif.id)

    const supabase = createClient()

    try {
      // Load full detail based on notification type and link
      if (notif.type === 'response' || notif.link === '/dashboard/inquiries') {
        // Load the latest resolved inquiry for this user
        const { data } = await supabase
          .from('inquiries')
          .select('message, response, created_at, status')
          .eq('student_id', userId)
          .eq('status', 'resolved')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (data) {
          setDetailData({
            title: notif.title,
            content: data.response || notif.message,
            type: 'response',
            created_at: notif.created_at,
            extra: `Your inquiry: "${data.message?.substring(0, 80)}${(data.message?.length || 0) > 80 ? '...' : ''}"`,
          })
        } else {
          setDetailData({
            title: notif.title,
            content: notif.message,
            type: notif.type,
            created_at: notif.created_at,
          })
        }
      } else if (notif.link === '/dashboard/announcements' || notif.type === 'general') {
        // Try to match announcement by title
        const titleMatch = notif.title.replace(/^.*?:\s*/, '').trim()
        const { data } = await supabase
          .from('announcements')
          .select('title, content, type, created_at')
          .ilike('title', `%${titleMatch}%`)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (data) {
          setDetailData({
            title: data.title,
            content: data.content,
            type: data.type,
            created_at: notif.created_at,
          })
        } else {
          setDetailData({
            title: notif.title,
            content: notif.message,
            type: notif.type,
            created_at: notif.created_at,
          })
        }
      } else {
        setDetailData({
          title: notif.title,
          content: notif.message,
          type: notif.type,
          created_at: notif.created_at,
        })
      }
    } catch {
      setDetailData({
        title: notif.title,
        content: notif.message,
        type: notif.type,
        created_at: notif.created_at,
      })
    }

    setDetailLoading(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'inquiry': return <MessageSquare size={20} className="text-blue-500" />
      case 'response': return <CheckCircle size={20} className="text-emerald-500" />
      case 'feedback': return <Star size={20} className="text-yellow-500" />
      default: return <Megaphone size={20} className="text-slate-500" />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case 'inquiry': return 'bg-blue-100'
      case 'response': return 'bg-emerald-100'
      case 'feedback': return 'bg-yellow-100'
      default: return 'bg-slate-100'
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

  const formatTimeAgo = (date: string) => {
    const diff = new Date().getTime() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAllRead = async () => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-0">

        {/* Back button */}
        <button
          onClick={() => { setSelected(null); setDetailData(null) }}
          className="flex items-center gap-2 text-sm font-semibold mb-6 transition-all hover:opacity-70"
          style={{ color: accentColor }}
        >
          <ArrowLeft size={17} />
          Back to Notifications
        </button>

        {/* Detail card */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          {/* Colored top bar */}
          <div
            className="h-2 w-full"
            style={{ backgroundColor: accentColor }}
          />

          <div className="p-6 space-y-5">

            {/* Icon + type */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${getIconBg(selected.type)}`}
                style={{ width: 64, height: 64 }}>
                {detailLoading
                  ? <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                  : <div className="scale-150">{getIcon(selected.type)}</div>
                }
              </div>

              {/* Date */}
              <p className="text-xs text-slate-400 mb-2">{formatDate(selected.created_at)}</p>

              {/* Title */}
              <h2 className="text-lg font-bold text-center" style={{ color: 'var(--text)' }}>
                {detailData?.title || selected.title}
              </h2>
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

            {/* Extra context (e.g. original inquiry) */}
            {detailData?.extra && (
              <div
                className={`rounded-xl p-4 ${accentBg}`}
              >
                <p className={`text-xs font-semibold mb-1 ${accentText}`}>Your original inquiry:</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{detailData.extra}</p>
              </div>
            )}

            {/* Main content */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: 'var(--bg)' }}
            >
              {detailLoading ? (
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-full" />
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-5/6" />
                </div>
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: 'var(--text)' }}
                >
                  {detailData?.content || selected.message}
                </p>
              )}
            </div>

            {/* Action button */}
            {selected.link && (
              <button
                onClick={() => router.push(selected.link!)}
                className="w-full py-3.5 rounded-2xl text-white text-sm font-bold transition-all"
                style={{ backgroundColor: accentColor }}
              >
                {selected.type === 'response' ? 'View My Inquiries'
                  : selected.link === '/dashboard/announcements' ? 'View All Announcements'
                  : selected.type === 'feedback' ? 'View Feedback'
                  : 'Open'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── INBOX LIST ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all"
            style={{ color: accentColor, borderColor: accentColor }}
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Bell size={28} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No notifications yet</p>
          <p className="text-xs text-slate-400 mt-1">You will be notified here for announcements and inquiry responses.</p>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          {notifications.map((notif, i) => (
            <button
              key={notif.id}
              onClick={() => handleSelect(notif)}
              className="w-full flex items-start gap-4 px-5 py-4 text-left transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{
                borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                backgroundColor: !notif.is_read ? (isISAP ? 'rgba(220,38,38,0.04)' : 'rgba(37,99,235,0.04)') : undefined,
              }}
            >
              {/* Icon */}
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${getIconBg(notif.type)}`}>
                {getIcon(notif.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-snug ${!notif.is_read ? 'font-bold' : 'font-semibold'}`}
                    style={{ color: 'var(--text)' }}>
                    {notif.title}
                  </p>
                  {!notif.is_read && (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: accentColor }}
                    />
                  )}
                </div>
                <p className="text-xs mt-0.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {notif.message}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Clock size={10} style={{ color: 'var(--text-faint)' }} />
                  <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    {formatTimeAgo(notif.created_at)}
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}