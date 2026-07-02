'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import { GraduationCap, Eye, EyeOff, ArrowLeft, IdCard, Mail } from 'lucide-react'

type LoginMode = 'student_id' | 'email'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('student_id')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    let loginEmail = email

    // If using student ID mode, look up the email first
    if (mode === 'student_id') {
      if (!studentId.trim()) {
        setError('Please enter your Student ID')
        setLoading(false)
        return
      }

      const res = await fetch('/api/lookup-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId.trim() })
      })

      const result = await res.json()

      if (result.error) {
        setError('Student ID not found. Please check your ID or contact the admin.')
        setLoading(false)
        return
      }

      loginEmail = result.email
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (loginError) {
      setError('Incorrect password. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    router.push(profile?.role === 'admin' ? '/admin' : '/dashboard')
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `https://campus-helpdesk-phi.vercel.app/reset-password`,
    })

    if (error) {
      setForgotError(error.message)
      setForgotLoading(false)
      return
    }

    setForgotSent(true)
    setForgotLoading(false)
  }

  // Forgot password screen
  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={28} className="text-slate-600 dark:text-slate-300" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Reset Password</h1>
            <p className="text-sm text-slate-400 mt-1">Smart Campus Help Desk</p>
          </div>

          <div
            className="rounded-2xl border p-6"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            {forgotSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold" style={{ color: 'var(--text)' }}>Check your Gmail</p>
                  <p className="text-xs text-slate-500 mt-2">Reset link sent to</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{forgotEmail}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setForgotSent(false); setForgotEmail('') }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-slate-50 dark:hover:bg-slate-700"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    Try different email
                  </button>
                  <button
                    onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail('') }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-all"
                  >
                    Back to login
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setShowForgot(false); setForgotError('') }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 mb-5"
                >
                  <ArrowLeft size={14} />
                  Back to login
                </button>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Enter your email address and we will send you a link to reset your password.
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                      }}
                    />
                  </div>
                  {forgotError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                      {forgotError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-all disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main login screen
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={28} className="text-slate-600 dark:text-slate-300" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1">Smart Campus Help Desk · ISAP and MCNP</p>
        </div>

        <div
          className="rounded-2xl border p-6 space-y-5"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >

          {/* Login mode toggle */}
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <button
              onClick={() => { setMode('student_id'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'student_id'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <IdCard size={14} />
              Student ID
            </button>
            <button
              onClick={() => { setMode('email'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'email'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Mail size={14} />
              Email
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Student ID input */}
            {mode === 'student_id' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Student ID Number
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder="e.g. 2024-0001"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono tracking-wider"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Your student ID number assigned by the admin office
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-all"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border px-4 py-2.5 pr-11 text-sm focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 px-3 py-2 rounded-lg">
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-all disabled:opacity-50"
            >
              {loading
                ? mode === 'student_id' ? 'Looking up ID...' : 'Logging in...'
                : 'Log in'
              }
            </button>
          </form>

          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="text-slate-600 dark:text-slate-300 font-semibold hover:underline"
            >
              Sign up
            </button>
          </p>
        </div>

        {/* Admin note */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Admin accounts use email login only
        </p>
      </div>
    </div>
  )
}