'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { createClient } from '@/src/lib/supabase/client'

export default function PushNotificationSetup() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
      setSupported(true)
      setPermission(Notification.permission)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      if (Notification.permission === 'granted') {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        setSubscribed(!!existing)
      }
    }
    check()
  }, [])

  const subscribe = async () => {
    if (!userId) return
    setLoading(true)

    try {
      // Step 1 — request permission explicitly
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== 'granted') {
        alert('Please allow notifications in your browser settings to receive push notifications.')
        setLoading(false)
        return
      }

      // Step 2 — get service worker and subscribe
      const reg = await navigator.serviceWorker.ready

      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        console.error('VAPID public key not set')
        setLoading(false)
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
      })

      // Step 3 — save subscription to server
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

  // Permission permanently denied — show disabled icon
  if (permission === 'denied') {
    return (
      <button
        title="Notifications blocked — enable in browser settings"
        className="w-9 h-9 flex items-center justify-center rounded-xl opacity-40 cursor-not-allowed"
      >
        <BellOff size={17} style={{ color: 'var(--text-faint)' }} />
      </button>
    )
  }

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      title={
        subscribed
          ? 'Push notifications ON — click to disable'
          : permission === 'default'
            ? 'Enable push notifications'
            : 'Enable push notifications'
      }
      className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--text-faint)' }} />
      ) : subscribed ? (
        <BellRing size={17} className="text-blue-500" />
      ) : (
        <BellOff size={17} style={{ color: 'var(--text-faint)' }} />
      )}
    </button>
  )
}

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}