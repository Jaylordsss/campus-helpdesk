'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import {
  Bot, BookOpen, CreditCard, Map,
  MessageSquare, Star, ChevronRight,
  Clock, Wifi, Megaphone
} from 'lucide-react'

type Profile = { name: string; school: string }

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courseCount, setCourseCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: p } = await supabase
          .from('profiles').select('name, school').eq('id', user.id).single()
        if (!p) { setLoading(false); return }
        setProfile(p)

        const { count: cc } = await supabase
          .from('courses').select('*', { count: 'exact', head: true }).eq('school', p.school)
        const { count: pc } = await supabase
          .from('inquiries').select('*', { count: 'exact', head: true })
          .eq('student_id', user.id).eq('status', 'pending')

        setCourseCount(cc || 0)
        setPendingCount(pc || 0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    getData()
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // ISAP = red, MCNP = blue
  const isISAP = profile?.school === 'ISAP'
  const bannerClass = isISAP
    ? 'bg-red-50 border-red-100'
    : 'bg-blue-50 border-blue-100'
  const greetingColor = isISAP ? 'text-red-500' : 'text-blue-500'
  const badgeClass = isISAP
    ? 'bg-red-100 text-red-700'
    : 'bg-blue-100 text-blue-700'
  const dotClass = isISAP ? 'bg-red-400' : 'bg-blue-400'

  const cards = [
    {
      title: 'Announcements',
      desc: 'Latest updates, events, and notices from your school.',
      icon: Megaphone,
      href: '/dashboard/announcements',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      title: 'AI Assistant',
      desc: 'Ask anything about campus, courses, tuition, and offices.',
      icon: Bot,
      href: '/dashboard/chat',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
    {
      title: 'Courses',
      desc: `Browse the ${courseCount} programs at ${profile?.school || 'your school'}.`,
      icon: BookOpen,
      href: '/dashboard/courses',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      badge: courseCount > 0 ? `${courseCount} programs` : undefined,
    },
    {
      title: 'Tuition Fees',
      desc: 'View fees per semester and intersession.',
      icon: CreditCard,
      href: '/dashboard/tuition',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
    {
      title: 'Campus Map',
      desc: 'Find offices and get directions around campus.',
      icon: Map,
      href: '/dashboard/map',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
    {
      title: 'Inquiries',
      desc: 'Submit concerns and track admin responses.',
      icon: MessageSquare,
      href: '/dashboard/inquiries',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      badge: pendingCount > 0 ? `${pendingCount} pending` : undefined,
    },
    {
      title: 'Feedback',
      desc: 'Rate your experience and share suggestions.',
      icon: Star,
      href: '/dashboard/feedback',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* Welcome banner */}
      <div className={`rounded-2xl p-6 sm:p-8 border ${bannerClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest ${greetingColor}`}>
              {greeting()}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              {profile?.name} 👋
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Welcome to the Smart Campus Help Desk
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold self-start ${badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            {profile?.school}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-5 font-medium">
          {isISAP
            ? 'International School of Asia and the Pacific'
            : 'Medical Colleges of Northern Philippines'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <BookOpen size={15} className="text-slate-400 mb-2" />
          <p className="text-xl font-bold text-slate-900">{courseCount}</p>
          <p className="text-xs text-slate-400 font-medium">Programs</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <Clock size={15} className="text-slate-400 mb-2" />
          <p className="text-xl font-bold text-slate-900">{pendingCount}</p>
          <p className="text-xs text-slate-400 font-medium">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <Wifi size={15} className="text-slate-400 mb-2" />
          <p className="text-xl font-bold text-slate-900">Live</p>
          <p className="text-xs text-slate-400 font-medium">AI Ready</p>
        </div>
      </div>

      {/* Service cards */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Campus Services
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <button
                key={card.href}
                onClick={() => router.push(card.href)}
                className="bg-white border border-slate-100 rounded-2xl p-5 text-left hover:border-slate-200 hover:shadow-sm transition-all duration-150 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon size={16} className={card.iconColor} />
                  </div>
                  {card.badge && (
                    <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800">{card.title}</p>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">{card.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ChevronRight size={12} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}