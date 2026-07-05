'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Bell, X, MessageSquare, Star, CheckCircle } from 'lucide-react'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  link: string | null
  created_at: string
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [openUpward, setOpenUpward] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchNotifications = async (uid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await fetchNotifications(user.id)
      intervalId = setInterval(() => fetchNotifications(user.id), 10000)
    }
    init()
    return () => { if (intervalId) clearInterval(intervalId) }
  }, [])

  const handleOpen = () => {
    // Detect if bell is in bottom half of screen — open upward if so
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const screenMid = window.innerHeight / 2
      setOpenUpward(rect.top > screenMid)
    }
    setOpen(prev => !prev)
    if (!open && unreadCount > 0) markAllRead()
  }

  const markAllRead = async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const markRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'inquiry': return <MessageSquare size={14} className="text-blue-500" />
      case 'response': return <CheckCircle size={14} className="text-emerald-500" />
      case 'feedback': return <Star size={14} className="text-yellow-500" />
      default: return <Bell size={14} className="text-slate-400" />
    }
  }

  const formatTime = (date: string) => {
    const now = new Date().getTime()
    const then = new Date(date).getTime()
    const diff = now - then
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <div className="relative shrink-0">
        <button
          ref={buttonRef}
          onClick={handleOpen}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Bell size={18} style={{ color: 'var(--text-muted)' }} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div
            className="absolute z-50 rounded-2xl shadow-xl overflow-hidden"
            style={{
              width: '320px',
              ...(openUpward
                ? { bottom: '48px', left: '-140px' }
                : { top: '48px', right: '0px' }
              ),
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                  Notifications
                </p>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ color: 'var(--text-faint)' }}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={24} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markRead(notif.id)
                      if (notif.link) window.location.href = notif.link
                      setOpen(false)
                    }}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: !notif.is_read ? 'rgba(59,130,246,0.06)' : undefined,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--bg)' }}
                    >
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs leading-tight ${!notif.is_read ? 'font-bold' : 'font-semibold'}`}
                          style={{ color: 'var(--text)' }}
                        >
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p
                        className="text-xs mt-0.5 leading-relaxed line-clamp-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {notif.message}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                        {formatTime(notif.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  {notifications.length} total
                </p>
                <button
                  onClick={markAllRead}
                  className="text-xs font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}