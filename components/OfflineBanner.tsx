'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowBack(true)
      setTimeout(() => setShowBack(false), 3000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowBack(false)
    }

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showBack) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white transition-all ${
      isOnline ? 'bg-emerald-500' : 'bg-slate-800'
    }`}>
      {isOnline ? (
        <>
          <Wifi size={16} />
          Back online
        </>
      ) : (
        <>
          <WifiOff size={16} />
          You are offline — some features may not work
        </>
      )}
    </div>
  )
}