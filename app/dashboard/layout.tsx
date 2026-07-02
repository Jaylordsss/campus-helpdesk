'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import {
  LayoutDashboard, BookOpen, CreditCard,
  Map, MessageSquare, Star, LogOut,
  Menu, GraduationCap, Bot, ChevronRight,
  HelpCircle, Megaphone
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Announcements', href: '/dashboard/announcements', icon: Megaphone },
  { label: 'AI Assistant', href: '/dashboard/chat', icon: Bot },
  { label: 'Courses', href: '/dashboard/courses', icon: BookOpen },
  { label: 'Tuition', href: '/dashboard/tuition', icon: CreditCard },
  { label: 'Campus Map', href: '/dashboard/map', icon: Map },
  { label: 'FAQs', href: '/dashboard/faq', icon: HelpCircle },
  { label: 'Inquiries', href: '/dashboard/inquiries', icon: MessageSquare },
  { label: 'Feedback', href: '/dashboard/feedback', icon: Star },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<{ name: string; school: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles').select('name, school').eq('id', user.id).single()
      if (data) setProfile(data)
    }
    getProfile()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isISAP = profile?.school === 'ISAP'
  const activeClass = isISAP
    ? 'bg-red-50 text-red-700 font-semibold'
    : 'bg-blue-50 text-blue-700 font-semibold'
  const logoIconBg = isISAP ? 'bg-red-100' : 'bg-blue-100'
  const logoIconColor = isISAP ? 'text-red-600' : 'text-blue-600'
  const schoolTextColor = isISAP ? 'text-red-600' : 'text-blue-600'

  return (
    <div className="flex min-h-screen bg-slate-50">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-56 bg-white border-r border-slate-200 z-30 flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        <div className="px-4 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${logoIconBg}`}>
              <GraduationCap size={16} className={logoIconColor} />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold tracking-widest uppercase truncate ${schoolTextColor}`}>
                {profile?.school || '...'}
              </p>
              <p className="text-[11px] text-slate-400">Help Desk</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                  ${active ? activeClass : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'}`}
              >
                <Icon size={15} className={active ? '' : 'text-slate-400'} />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={12} className="opacity-40" />}
              </button>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <div className="px-3 py-2 mb-1 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {profile?.name || 'Student'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{profile?.school} Student</p>
            </div>
            <NotificationBell />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">

        <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded flex items-center justify-center ${logoIconBg}`}>
              <GraduationCap size={12} className={logoIconColor} />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {profile?.school} Help Desk
            </span>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}