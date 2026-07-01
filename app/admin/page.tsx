'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import {
  Users, BookOpen, CreditCard, MapPin,
  MessageSquare, Star, HelpCircle,
  TrendingUp, Clock, CheckCircle,
  ChevronRight, ShieldCheck, LogOut
} from 'lucide-react'

type Stats = {
  users: number
  courses: number
  inquiries: number
  pending: number
  resolved: number
  feedback: number
  faq: number
  locations: number
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    users: 0, courses: 0, inquiries: 0,
    pending: 0, resolved: 0, feedback: 0,
    faq: 0, locations: 0
  })
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data: profile } = await supabase
          .from('profiles').select('name, role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
          router.push('/dashboard'); return
        }
        setAdminName(profile.name)

        const [
          { count: users },
          { count: courses },
          { count: inquiries },
          { count: pending },
          { count: resolved },
          { count: feedback },
          { count: faq },
          { count: locations },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('courses').select('*', { count: 'exact', head: true }),
          supabase.from('inquiries').select('*', { count: 'exact', head: true }),
          supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('inquiries').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
          supabase.from('feedback').select('*', { count: 'exact', head: true }),
          supabase.from('faq').select('*', { count: 'exact', head: true }),
          supabase.from('locations').select('*', { count: 'exact', head: true }),
        ])

        setStats({
          users: users || 0, courses: courses || 0,
          inquiries: inquiries || 0, pending: pending || 0,
          resolved: resolved || 0, feedback: feedback || 0,
          faq: faq || 0, locations: locations || 0,
        })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    getData()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { label: 'Users', desc: `${stats.users} registered`, icon: Users, href: '/admin/users' },
    { label: 'Courses', desc: `${stats.courses} programs`, icon: BookOpen, href: '/admin/courses' },
    { label: 'Tuition', desc: 'Fee schedules', icon: CreditCard, href: '/admin/tuition' },
    { label: 'Locations', desc: `${stats.locations} offices`, icon: MapPin, href: '/admin/locations' },
    { label: 'FAQs', desc: `${stats.faq} entries`, icon: HelpCircle, href: '/admin/faq' },
    { label: 'Inquiries', desc: `${stats.pending} pending`, icon: MessageSquare, href: '/admin/inquiries', badge: stats.pending > 0 ? `${stats.pending}` : undefined },
    { label: 'Feedback', desc: `${stats.feedback} responses`, icon: Star, href: '/admin/feedback' },
    { label: 'Analytics', desc: 'Reports & overview', icon: TrendingUp, href: '/admin/analytics' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header — red left + blue right = both schools */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-100 to-blue-100">
              <ShieldCheck size={16} className="text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
                Admin Portal
              </p>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                Smart Campus Help Desk
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs font-semibold text-slate-500">
              {adminName}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Page title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage campus content for ISAP and MCNP
          </p>
        </div>

        {/* Dual school indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
            <span className="w-2 h-2 bg-red-400 rounded-full" />
            <span className="text-xs font-bold text-red-700">ISAP</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl">
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
            <span className="text-xs font-bold text-blue-700">MCNP</span>
          </div>
          <span className="text-xs text-slate-400">Managing both institutions</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <Users size={14} className="text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.users}</p>
            <p className="text-xs text-slate-400 font-medium">Users</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <Clock size={14} className="text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            <p className="text-xs text-slate-400 font-medium">Pending</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <CheckCircle size={14} className="text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
            <p className="text-xs text-slate-400 font-medium">Resolved</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <Star size={14} className="text-slate-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.feedback}</p>
            <p className="text-xs text-slate-400 font-medium">Feedback</p>
          </div>
        </div>

        {/* Management menu */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Management
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 text-left hover:border-slate-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Icon size={16} className="text-slate-500" />
                    </div>
                    {item.badge && (
                      <span className="text-xs font-bold bg-red-100 text-red-600 w-5 h-5 rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ChevronRight size={11} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}