'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { createClient } from '@/src/lib/supabase/client'

export default function PushNotificationSetup() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      setSupported(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      setSubscribed(!!existing)
    }
    check()
  }, [])

  const subscribe = async () => {
    if (!userId || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userId })
      })
      setSubscribed(true)
    } catch (err) {
      console.error('Subscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()
      setSubscribed(false)
    } catch (err) {
      console.error('Unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      title={subscribed ? 'Push notifications ON — click to disable' : 'Enable push notifications'}
      className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/10"
    >
      {subscribed
        ? <Bell size={17} className="text-blue-500" />
        : <BellOff size={17} style={{ color: 'var(--text-faint)' }} />
      }
    </button>
  )
}