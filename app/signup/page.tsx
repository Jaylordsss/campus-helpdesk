'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import { GraduationCap, ShieldCheck, Eye, EyeOff } from 'lucide-react'

const ADMIN_SECRET_CODE = 'campusadmin2024'

export default function SignupPage() {
  const router = useRouter()
  const [role, setRole] = useState<'student' | 'admin' | ''>('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showAdminCode, setShowAdminCode] = useState(false)
  const [school, setSchool] = useState('ISAP')
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (role === 'admin' && adminCode !== ADMIN_SECRET_CODE) {
      setError('Invalid admin code. Please contact the system administrator.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name,
        email,
        role,
        school: role === 'admin' ? 'ISAP' : school,
      })
      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    router.push(role === 'admin' ? '/admin' : '/dashboard')
  }

  const isISAP = school === 'ISAP'
  const focusBorder = isISAP ? 'focus:border-red-400' : 'focus:border-blue-400'
  const btnClass = isISAP
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-blue-500 hover:bg-blue-600 text-white'
  const badgeClass = isISAP ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={28} className="text-slate-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create an account</h1>
          <p className="text-sm text-slate-400 mt-1">Smart Campus Help Desk</p>
        </div>

        {/* Step 1 — Role selector */}
        {!role && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center mb-4">
              I am signing up as a
            </p>

            <button
              onClick={() => setRole('student')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <GraduationCap size={20} className="text-slate-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">Student</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Access campus info, courses, tuition, and inquiries
                </p>
              </div>
            </button>

            <button
              onClick={() => setRole('admin')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-slate-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">Administrator</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage campus content, inquiries, and users
                </p>
              </div>
            </button>

            <p className="text-center text-sm text-slate-400 pt-2">
              Already have an account?{' '}
              <a href="/login" className="text-slate-600 font-semibold hover:underline">Log in</a>
            </p>
          </div>
        )}

        {/* Step 2 — Signup form */}
        {role && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">

            {/* Role badge + change */}
            <div className="flex items-center justify-between mb-5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                ${role === 'admin' ? 'bg-slate-100 text-slate-700' : badgeClass}`}>
                {role === 'admin' ? <ShieldCheck size={13} /> : <GraduationCap size={13} />}
                {role === 'admin' ? 'Administrator' : `Student · ${school}`}
              </span>
              <button
                onClick={() => { setRole(''); setError('') }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Change
              </button>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">

              {/* Full name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className={`w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none placeholder:text-slate-300
                    ${role === 'admin' ? 'focus:border-slate-400' : focusBorder}`}
                />
              </div>

              {/* School selector — students only */}
              {role === 'student' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">School</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSchool('ISAP')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        school === 'ISAP'
                          ? 'border-red-400 bg-red-50'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <p className={`text-xs font-bold ${school === 'ISAP' ? 'text-red-700' : 'text-slate-700'}`}>
                        ISAP
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        International School of Asia and the Pacific
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchool('MCNP')}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        school === 'MCNP'
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <p className={`text-xs font-bold ${school === 'MCNP' ? 'text-blue-700' : 'text-slate-700'}`}>
                        MCNP
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        Medical Colleges of Northern Philippines
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className={`w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none placeholder:text-slate-300
                    ${role === 'admin' ? 'focus:border-slate-400' : focusBorder}`}
                />
              </div>

              {/* Password with eye toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={`w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-11 text-sm text-slate-900 focus:outline-none placeholder:text-slate-300
                      ${role === 'admin' ? 'focus:border-slate-400' : focusBorder}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Admin code with eye toggle */}
              {role === 'admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Admin access code
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminCode ? 'text' : 'password'}
                      required
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      placeholder="Enter the admin secret code"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-11 text-sm text-slate-900 focus:border-slate-400 focus:outline-none placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminCode(!showAdminCode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showAdminCode ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Contact the system administrator to get this code.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50
                  ${role === 'admin' ? 'bg-slate-800 hover:bg-slate-900 text-white' : btnClass}`}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-400 mt-5">
              Already have an account?{' '}
              <a href="/login" className="text-slate-600 font-semibold hover:underline">Log in</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}