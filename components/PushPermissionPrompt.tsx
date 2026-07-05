'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Bell, X } from 'lucide-react'

export default function PushPermissionPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      // Only show if push is supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return

      // Already granted or denied — don't show
      if (Notification.permission !== 'default') return

      // Already dismissed before
      if (localStorage.getItem('push_prompt_dismissed') === 'true') return

      // Get user
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Check if already subscribed
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) return

      // Show prompt after 2 seconds
      setTimeout(() => setShow(true), 2000)
    }
    check()
  }, [])

  const handleAllow = async () => {
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted' && userId && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        const reg = await navigator.serviceWorker.ready

        const base64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        const padding = '='.repeat((4 - base64.length % 4) % 4)
        const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
        const raw = window.atob(b64)
        const arr = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: arr
        })

        await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), userId })
        })
      }
    } catch (err) {
      console.error('Push subscribe failed:', err)
    } finally {
      setLoading(false)
      setShow(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40">
      <div className="w-full max-w-sm">
      <div className="bg-slate-900 rounded-2xl shadow-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Bell size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Enable Notifications</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Get notified when admin responds to your inquiries or posts announcements.
            </p>
          </div>
          <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleAllow}
            disabled={loading}
            className="flex-1 py-2.5 bg-white text-slate-900 text-xs font-bold rounded-xl disabled:opacity-50 transition-all hover:bg-slate-100"
          >
            {loading ? 'Enabling...' : '🔔 Allow Notifications'}
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2.5 text-slate-400 text-xs font-semibold rounded-xl border border-slate-700 hover:bg-white/5 transition-all"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}