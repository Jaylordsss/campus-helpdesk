'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Key, LogOut, Eye, EyeOff, Check } from 'lucide-react'

export default function OfficeAdminSettings() {
  const router = useRouter()
  const [profile, setProfile] = useState<{ name: string; email: string; office: string; school: string } | null>(null)
  const [showChangePw, setShowChangePw] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('name, email, office, school').eq('id', user.id).single()
      if (data) setProfile(data)
    }
    init()
  }, [])

  const handleChangePw = async () => {
    setPwError('')
    if (!newPw) { setPwError('Enter a new password'); return }
    if (newPw.length < 6) { setPwError('At least 6 characters'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    setChangingPw(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      setPwSuccess('Password changed!')
      setNewPw(''); setConfirmPw(''); setShowChangePw(false)
      setTimeout(() => setPwSuccess(''), 4000)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setChangingPw(false)
    }
  }

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>

      {pwSuccess && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <Check size={15} className="text-emerald-600" />
          <p className="text-xs font-semibold text-emerald-700">{pwSuccess}</p>
        </div>
      )}

      {/* Account info */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Account</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
            style={{ backgroundColor: isISAP ? '#fee2e2' : '#dbeafe', color: accentColor }}>
            {profile?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{profile?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile?.email}</p>
            <p className="text-xs mt-0.5 font-semibold" style={{ color: accentColor }}>{profile?.office}</p>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Security</p>
        </div>
        <button
          onClick={() => setShowChangePw(!showChangePw)}
          className="w-full px-5 py-4 flex items-center gap-3 hover:bg-black/5 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <Key size={15} className="text-slate-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Change Password</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Update your account password</p>
          </div>
        </button>
        {showChangePw && (
          <div className="px-5 pb-5 space-y-3">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New password"
                className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-faint)' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <input
              type={showPw ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Confirm password"
              className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            {pwError && <p className="text-xs text-red-600">{pwError}</p>}
            <button onClick={handleChangePw} disabled={changingPw}
              className="px-4 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
              style={{ backgroundColor: accentColor }}>
              {changingPw ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Session</p>
        </div>
        <button
          onClick={async () => {
            setSigningOut(true)
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
          }}
          disabled={signingOut}
          className="w-full px-5 py-4 flex items-center gap-3 hover:bg-black/5 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <LogOut size={15} className="text-slate-500" />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </p>
        </button>
      </div>
    </div>
  )
}