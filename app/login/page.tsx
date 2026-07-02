'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import { GraduationCap, Eye, EyeOff, ArrowLeft, IdCard, Mail, QrCode, X, Loader2 } from 'lucide-react'

type LoginMode = 'student_id' | 'email' | 'qr'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<LoginMode>('student_id')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrLogging, setQrLogging] = useState(false)
  const [qrScanning, setQrScanning] = useState(false)
  const [qrError, setQrError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const scannerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null)

  useEffect(() => {
    if (!searchParams) return
    const scannedId = searchParams.get('student_id')
    if (scannedId) {
      setStudentId(decodeURIComponent(scannedId))
      setMode('student_id')
    }
  }, [searchParams])

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop()
        html5QrRef.current.clear()
        html5QrRef.current = null
      } catch {
        // ignore
      }
    }
  }

  // Handle QR scan result — instant login no password
  const handleQRScanned = async (scannedStudentId: string) => {
    setQrScanning(false)
    setQrLogging(true)
    setQrError('')
    await stopScanner()

    try {
      // Call QR login API to get magic link
      const res = await fetch('/api/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: scannedStudentId })
      })

      const result = await res.json()

      if (result.error) {
        setQrError('Student ID not found. Please use a valid campus ID card.')
        setQrLogging(false)
        setQrScanning(true)
        startScanner()
        return
      }

      // Redirect to magic link — Supabase handles the session
      if (result.magic_link) {
        window.location.href = result.magic_link
      } else {
        setQrError('Login failed. Please try again.')
        setQrLogging(false)
      }
    } catch {
      setQrError('Something went wrong. Please try again.')
      setQrLogging(false)
    }
  }

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      // Small delay to ensure DOM is ready
      await new Promise(r => setTimeout(r, 200))

      const scanner = new Html5Qrcode('qr-reader')
      html5QrRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText: string) => {
          try {
            const url = new URL(decodedText)
            const scannedStudentId = url.searchParams.get('student_id')
            if (scannedStudentId) {
              await handleQRScanned(decodeURIComponent(scannedStudentId))
            } else {
              setQrError('Invalid QR code. Please scan your campus ID card.')
            }
          } catch {
            setQrError('Invalid QR code format.')
          }
        },
        () => {}
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setQrError('Could not access camera. Please allow camera permission.')
      setQrScanning(false)
    }
  }

  useEffect(() => {
    if (mode === 'qr' && qrScanning) {
      startScanner()
    }
    return () => {
      if (mode !== 'qr') stopScanner()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, qrScanning])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    let loginEmail = email

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
      redirectTo: 'https://campus-helpdesk-phi.vercel.app/reset-password',
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
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--bg-card)' }}>
              <GraduationCap size={28} className="text-slate-600 dark:text-slate-300" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Reset Password</h1>
            <p className="text-sm text-slate-400 mt-1">Smart Campus Help Desk</p>
          </div>
          <div className="rounded-2xl border p-6"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
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
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--text)' }}>{forgotEmail}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setForgotSent(false); setForgotEmail('') }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-all"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg)' }}
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
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  Enter your email and we will send you a reset link.
                </p>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Email address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--bg-card)' }}>
            <GraduationCap size={28} className="text-slate-600 dark:text-slate-300" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1">Smart Campus Help Desk · ISAP and MCNP</p>
        </div>

        <div className="rounded-2xl border p-6 space-y-5"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* URL param banner */}
          {searchParams?.get('student_id') && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl px-4 py-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Student ID detected from QR — enter your password to log in
              </p>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--bg)' }}>
            <button
              onClick={() => { setMode('student_id'); setError(''); stopScanner(); setQrScanning(false) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'student_id' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              style={mode === 'student_id' ? { color: 'var(--text)' } : {}}
            >
              <IdCard size={13} />
              Student ID
            </button>
            <button
              onClick={() => {
                setMode('qr')
                setError('')
                setQrError('')
                setQrLogging(false)
                setQrScanning(true)
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'qr' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              style={mode === 'qr' ? { color: 'var(--text)' } : {}}
            >
              <QrCode size={13} />
              Scan QR
            </button>
            <button
              onClick={() => { setMode('email'); setError(''); stopScanner(); setQrScanning(false) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'email' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              style={mode === 'email' ? { color: 'var(--text)' } : {}}
            >
              <Mail size={13} />
              Email
            </button>
          </div>

          {/* QR Scanner */}
          {mode === 'qr' && (
            <div className="space-y-3">

              {/* Logging in spinner */}
              {qrLogging && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center">
                    <Loader2 size={28} className="text-emerald-600 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                      Logging you in...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Please wait a moment
                    </p>
                  </div>
                </div>
              )}

              {/* Camera view */}
              {!qrLogging && (
                <>
                  <div className="relative rounded-2xl overflow-hidden bg-black">
                    <div id="qr-reader" style={{ width: '100%' }} />

                    {/* Corner frame overlay */}
                    {qrScanning && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 relative">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                          {/* Scan line animation */}
                          <div
                            className="absolute left-0 right-0 h-0.5 bg-white/70"
                            style={{
                              animation: 'scanLine 2s linear infinite',
                              top: '50%',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <style>{`
                    @keyframes scanLine {
                      0% { transform: translateY(-96px); opacity: 1; }
                      50% { opacity: 0.5; }
                      100% { transform: translateY(96px); opacity: 1; }
                    }
                  `}</style>

                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      Point camera at your ID card QR code
                    </p>
                    <p className="text-xs text-slate-400">
                      Login is instant — no password needed
                    </p>
                  </div>

                  {qrError && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-red-600 dark:text-red-400">{qrError}</p>
                      <button
                        onClick={() => {
                          setQrError('')
                          setQrScanning(true)
                          startScanner()
                        }}
                        className="text-xs font-semibold text-red-600 shrink-0 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      stopScanner()
                      setMode('student_id')
                      setQrScanning(false)
                      setQrError('')
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* Student ID form */}
          {mode === 'student_id' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Student ID Number
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder="e.g. 2024-0001"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none font-mono tracking-wider"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Or use <span className="font-semibold">Scan QR</span> tab for instant login
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
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
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
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
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          )}

          {/* Email form */}
          {mode === 'email' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
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
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
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
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          )}

          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <button
              onClick={() => router.push('/signup')}
              className="font-semibold hover:underline"
              style={{ color: 'var(--text)' }}
            >
              Sign up
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Admin accounts use Email login only
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}