'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Trash2, LogOut, Shield, Bell, Moon, Sun,
  Key, User, AlertTriangle, Check, Eye, EyeOff,
  ChevronRight, Smartphone, Globe
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

type Profile = {
  id: string
  name: string
  email: string
  school: string
  student_id: string | null
  course: string | null
  year_level: string | null
  created_at: string
  photo_url: string | null
}

function NotificationToggles({ accentColor, email, userId }: { accentColor: string; email: string; userId: string }) {
  const [inApp, setInApp] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load saved preferences
    const savedInApp = localStorage.getItem('notif_inapp')
    const savedEmail = localStorage.getItem('notif_email')
    if (savedInApp !== null) setInApp(savedInApp === 'true')
    if (savedEmail !== null) setEmailNotif(savedEmail === 'true')

    // Check push status
    if ('Notification' in window) {
      setPushPermission(Notification.permission)
    }
    const checkPush = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setPushEnabled(!!sub)
    }
    checkPush()
  }, [])

  const toggleInApp = (val: boolean) => {
    setInApp(val)
    localStorage.setItem('notif_inapp', String(val))
  }

  const toggleEmail = (val: boolean) => {
    setEmailNotif(val)
    localStorage.setItem('notif_email', String(val))
  }

  const togglePush = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
        setPushEnabled(false)
      } else {
        // Request permission first
        const perm = await Notification.requestPermission()
        setPushPermission(perm)

        if (perm !== 'granted') {
          alert('Please allow notifications in your browser/device settings to enable push notifications.')
          return
        }

        // Subscribe
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
        const reg = await navigator.serviceWorker.ready

        // Convert VAPID key
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

        setPushEnabled(true)
      }
    } catch (err) {
      console.error('Push toggle failed:', err)
    } finally {
      setPushLoading(false)
    }
  }

  if (!mounted) return null

  const Toggle = ({ value, onChange, disabled = false }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 disabled:opacity-50"
      style={{ backgroundColor: value ? accentColor : '#e2e8f0' }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: value ? '22px' : '2px' }}
      />
    </button>
  )

  const notifItems = [
    {
      icon: <Bell size={15} className="text-slate-500" />,
      label: 'In-App Notifications',
      desc: 'Bell alerts for inquiries and announcements',
      value: inApp,
      onChange: toggleInApp,
      tag: null,
    },
    {
      icon: <Smartphone size={15} className="text-slate-500" />,
      label: 'Push Notifications',
      desc: pushPermission === 'denied'
        ? 'Blocked — enable in device settings'
        : pushEnabled
          ? 'Receiving alerts when app is closed'
          : 'Get alerts even when app is closed',
      value: pushEnabled,
      onChange: () => togglePush(),
      tag: pushPermission === 'denied' ? 'Blocked' : pushLoading ? 'Loading...' : null,
      disabled: pushPermission === 'denied' || pushLoading,
    },
    {
      icon: <Globe size={15} className="text-slate-500" />,
      label: 'Email Notifications',
      desc: `Sent to ${email}`,
      value: emailNotif,
      onChange: toggleEmail,
      tag: null,
    },
  ]

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Notifications</p>
      </div>

      {notifItems.map((item, i) => (
        <div
          key={i}
          className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: i < notifItems.length - 1 ? '1px solid var(--border)' : 'none' }}
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.label}</p>
            <p className="text-xs" style={{ color: item.tag === 'Blocked' ? '#ef4444' : 'var(--text-muted)' }}>
              {item.desc}
            </p>
          </div>
          {item.tag ? (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
              item.tag === 'Blocked' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {item.tag}
            </span>
          ) : (
            <Toggle
              value={item.value}
              onChange={item.onChange as (v: boolean) => void}
              disabled={item.disabled}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Change password
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'final'>('confirm')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Sign out all
  const [signingOut, setSigningOut] = useState(false)

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
      setLoading(false)
    }
    getData()
  }, [])

  const handleChangePassword = async () => {
    setPwError('')
    if (!newPassword.trim()) { setPwError('Please enter a new password'); return }
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    setChangingPw(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPwSuccess('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
      setShowChangePassword(false)
      setTimeout(() => setPwSuccess(''), 4000)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPw(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm')
      return
    }
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id })
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/visitor')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Manage your account preferences
        </p>
      </div>

      {/* Success */}
      {pwSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <Check size={15} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{pwSuccess}</p>
        </div>
      )}

      {/* ── Account Info ────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Account</p>
        </div>

        {/* Profile summary */}
        <div className="px-5 py-4 flex items-center gap-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: isISAP ? '#fee2e2' : '#dbeafe', color: accentColor }}>
            {profile?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${profile.photo_url}?v=${Date.now()}`}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              profile?.name?.charAt(0)?.toUpperCase() || '?'
            )}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{profile?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: isISAP ? '#fee2e2' : '#dbeafe', color: accentColor }}
              >
                {profile?.school}
              </span>
              {profile?.student_id && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                  {profile.student_id}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="ml-auto flex items-center gap-1 text-xs font-semibold transition-all"
            style={{ color: accentColor }}
          >
            Edit <ChevronRight size={13} />
          </button>
        </div>

        {/* Member since */}
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <User size={15} className="text-slate-500" />
            </div>
            <p className="text-sm" style={{ color: 'var(--text)' }}>Member since</p>
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
              : '—'
            }
          </p>
        </div>
      </div>

      {/* ── Appearance ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Appearance</p>
        </div>

        {/* Dark mode toggle */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              {theme === 'dark'
                ? <Moon size={15} className="text-slate-500" />
                : <Sun size={15} className="text-amber-500" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="relative w-12 h-6 rounded-full transition-all"
            style={{ backgroundColor: theme === 'dark' ? accentColor : '#e2e8f0' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: theme === 'dark' ? '26px' : '2px' }}
            />
          </button>
        </div>
      </div>

      {/* ── Notifications ────────────────────────────────────────────── */}
      <NotificationToggles accentColor={accentColor} email={profile?.email || ''} userId={profile?.id || ''} />

      {/* ── Security ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Security</p>
        </div>

        {/* Change password */}
        <div className="border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="w-full px-5 py-4 flex items-center justify-between transition-all hover:bg-black/5 dark:hover:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                <Key size={15} className="text-slate-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Change Password</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Update your account password</p>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--text-faint)' }}
              className={`transition-transform ${showChangePassword ? 'rotate-90' : ''}`} />
          </button>

          {showChangePassword && (
            <div className="px-5 pb-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }}>
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm focus:outline-none"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }}>
                    {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              {pwError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{pwError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPw}
                  className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  {changingPw
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={14} />
                  }
                  {changingPw ? 'Saving...' : 'Update Password'}
                </button>
                <button
                  onClick={() => { setShowChangePassword(false); setNewPassword(''); setConfirmPassword(''); setPwError('') }}
                  className="px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security info */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <Shield size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>QR Login</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Manage your login QR code</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/id-card')}
            className="text-xs font-semibold transition-all"
            style={{ color: accentColor }}
          >
            Manage <ChevronRight size={13} className="inline" />
          </button>
        </div>
      </div>

      {/* ── Session ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Session</p>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full px-5 py-4 flex items-center gap-3 transition-all hover:bg-black/5 dark:hover:bg-white/5"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <LogOut size={15} className="text-slate-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sign out of your account on this device</p>
          </div>
        </button>
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-200 overflow-hidden bg-red-50/30">
        <div className="px-5 py-3 border-b border-red-100">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500">Danger Zone</p>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 size={15} className="text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Delete Account</p>
              <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                Permanently delete your account and all data. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => { setShowDeleteConfirm(true); setDeleteStep('confirm'); setDeleteConfirmText(''); setDeleteError('') }}
              className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">

            {deleteStep === 'confirm' ? (
              <>
                {/* Step 1 — Yes or No */}
                <div className="text-center mb-5">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={28} className="text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Delete your account?</h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    This will permanently delete your account, profile, inquiries, and all data. <strong>This cannot be undone.</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setDeleteStep('final')}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all"
                  >
                    Yes, delete my account
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                  >
                    No, keep my account
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2 — Type DELETE */}
                <div className="text-center mb-5">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={26} className="text-red-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Final confirmation</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Type <span className="font-black text-red-600 font-mono">DELETE</span> to confirm
                  </p>
                </div>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE here"
                  className="w-full border-2 border-red-200 rounded-xl px-4 py-3 text-sm font-mono text-center focus:outline-none focus:border-red-500 mb-3"
                  style={{ letterSpacing: '0.2em' }}
                  autoFocus
                />

                {deleteError && (
                  <p className="text-xs text-red-600 text-center mb-3">{deleteError}</p>
                )}

                <div className="space-y-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== 'DELETE'}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {deleting
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting...</>
                      : <><Trash2 size={15} />Delete my account forever</>
                    }
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteStep('confirm'); setDeleteConfirmText('') }}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}