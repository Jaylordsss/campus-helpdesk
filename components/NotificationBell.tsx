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

  const markAllRead = async () => {
    if (!userId) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
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
      {/* Full screen overlay when open */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="relative shrink-0">
        {/* Bell button */}
        <button
          ref={buttonRef}
          onClick={() => {
            setOpen(prev => !prev)
            if (!open && unreadCount > 0) markAllRead()
          }}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all"
        >
          <Bell size={18} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown — fixed so it always shows fully */}
        {open && (
          <div
            className="fixed z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            style={{
              width: '320px',
              bottom: '80px',
              left: '16px',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">Notifications</p>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-400">No notifications yet</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    You will be notified for inquiries and responses
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
                    className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all ${
                      !notif.is_read ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-tight text-slate-900 ${
                          !notif.is_read ? 'font-bold' : 'font-semibold'
                        }`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatTime(notif.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">{notifications.length} total</p>
                <button
                  onClick={markAllRead}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-all"
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