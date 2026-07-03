'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import {
  GraduationCap, Eye, EyeOff, ArrowLeft,
  IdCard, Mail, QrCode, Upload, X
} from 'lucide-react'

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
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [qrMessage, setQrMessage] = useState('')
  const [scannedStudentId, setScannedStudentId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!searchParams) return
    const sid = searchParams.get('student_id')
    if (sid) {
      setStudentId(decodeURIComponent(sid))
      setMode('student_id')
    }
  }, [searchParams])

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setQrStatus('scanning')
    setQrMessage('Reading QR code...')
    setScannedStudentId('')

    try {
      // Use jsqr which works reliably on both localhost and Vercel
      const jsQR = (await import('jsqr')).default

      // Read file as image
      const imageData = await new Promise<ImageData>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) { reject(new Error('No canvas context')); return }
            ctx.drawImage(img, 0, 0)
            resolve(ctx.getImageData(0, 0, img.width, img.height))
          }
          img.onerror = reject
          img.src = ev.target?.result as string
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Scan QR code from image data
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })

      if (!code) {
        setQrStatus('error')
        setQrMessage('Could not read QR code. Try downloading the QR Code Only PNG for better results.')
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      // Parse student_id from URL
      try {
        const url = new URL(code.data)
        const sid = url.searchParams.get('student_id')
        if (sid) {
          const decoded = decodeURIComponent(sid)
          setScannedStudentId(decoded)
          setStudentId(decoded)
          setQrStatus('success')
          setQrMessage(`Student ID found: ${decoded}`)
          setMode('student_id')
        } else {
          setQrStatus('error')
          setQrMessage('QR code is not a valid campus ID card.')
        }
      } catch {
        setQrStatus('error')
        setQrMessage('Invalid QR code format. Please use your campus ID card QR.')
      }

    } catch (err) {
      console.error('QR scan error:', err)
      setQrStatus('error')
      setQrMessage('Could not read QR code. Please try the QR Code Only download for best results.')
    }

    if (fileRef.current) fileRef.current.value = ''
  }

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
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              Reset Password
            </h1>
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
                  <p className="text-base font-bold" style={{ color: 'var(--text)' }}>
                    Check your Gmail
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Reset link sent to</p>
                  <p className="text-sm font-bold mt-1" style={{ color: 'var(--text)' }}>
                    {forgotEmail}
                  </p>
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
                    <label className="block text-xs font-semibold mb-1.5"
                      style={{ color: 'var(--text-muted)' }}>
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            Welcome back
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Smart Campus Help Desk · ISAP and MCNP
          </p>
        </div>

        <div className="rounded-2xl border p-6 space-y-5"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* Mode toggle */}
          <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--bg)' }}>
            <button
              onClick={() => { setMode('student_id'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'student_id'
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
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
                setQrStatus('idle')
                setQrMessage('')
                setScannedStudentId('')
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'qr'
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              style={mode === 'qr' ? { color: 'var(--text)' } : {}}
            >
              <QrCode size={13} />
              Upload QR
            </button>
            <button
              onClick={() => { setMode('email'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'email'
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              style={mode === 'email' ? { color: 'var(--text)' } : {}}
            >
              <Mail size={13} />
              Email
            </button>
          </div>

          

          {/* QR Upload mode */}
          {mode === 'qr' && (
            <div className="space-y-4">

              {/* Upload area */}
              <div
                onClick={() => fileRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all hover:border-slate-400"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: 'var(--bg)' }}>
                  <Upload size={24} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Upload your ID card PNG
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Click to select the downloaded ID card image
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all">
                  <QrCode size={13} />
                  Choose Image
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleQRUpload}
                style={{ display: 'none' }}
              />

              {/* Status messages */}
              {qrStatus === 'scanning' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg)' }}>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Reading QR code...
                  </p>
                </div>
              )}

              {qrStatus === 'success' && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        QR scanned successfully
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setQrStatus('idle')
                        setScannedStudentId('')
                        setStudentId('')
                        setMode('qr')
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 font-mono">
                    Student ID: {scannedStudentId}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                    Enter your password below to log in
                  </p>
                </div>
              )}

              {qrStatus === 'error' && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-start justify-between gap-2">
                  <p className="text-xs text-red-600 dark:text-red-400">{qrMessage}</p>
                  <button
                    onClick={() => setQrStatus('idle')}
                    className="text-red-400 hover:text-red-600 shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Instructions */}
              {qrStatus === 'idle' && (
                <div className="space-y-2">
                  {[
                    'Go to Dashboard → My ID Card',
                    'Download your ID card as PNG',
                    'Come back here and upload that PNG',
                    'Your Student ID will be filled automatically',
                    'Enter your password to log in',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{step}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Password form — shown after successful QR scan */}
              {qrStatus === 'success' && (
                <form onSubmit={handleLogin} className="space-y-4 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold"
                        style={{ color: 'var(--text-muted)' }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600"
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
                        autoFocus
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
            </div>
          )}

          {/* Student ID form */}
          {mode === 'student_id' && (
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Show banner if came from QR upload */}
              {scannedStudentId && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl px-4 py-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Student ID filled from QR code — enter your password
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
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
                  Or use <span className="font-semibold">Upload QR</span> tab to scan your ID card PNG
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold"
                    style={{ color: 'var(--text-muted)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600"
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
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>
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
                  <label className="block text-xs font-semibold"
                    style={{ color: 'var(--text-muted)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600"
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