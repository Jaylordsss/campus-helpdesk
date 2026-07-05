'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import {
  LayoutDashboard, BookOpen, CreditCard,
  Map, MessageSquare, Star, LogOut,
  Menu, GraduationCap, Bot, ChevronRight,
  HelpCircle, Megaphone, IdCard, User, Bell
} from 'lucide-react'
import PushNotificationSetup from '@/components/PushNotificationSetup'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import OfflineBanner from '@/components/OfflineBanner'


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
  { label: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { label: 'My Profile', href: '/dashboard/profile', icon: User },
  { label: 'My ID Card', href: '/dashboard/id-card', icon: IdCard },
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
    ? 'bg-red-50 text-red-700 font-semibold dark:bg-red-950/50 dark:text-red-400'
    : 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/50 dark:text-blue-400'

  const logoIconBg = isISAP
    ? 'bg-red-100 dark:bg-red-950/50'
    : 'bg-blue-100 dark:bg-blue-950/50'

  const logoIconColor = isISAP
    ? 'text-red-600 dark:text-red-400'
    : 'text-blue-600 dark:text-blue-400'

  const schoolTextColor = isISAP
    ? 'text-red-600 dark:text-red-400'
    : 'text-blue-600 dark:text-blue-400'

  return (
    <div
      className="flex min-h-screen transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-56 z-30 flex flex-col
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
        style={{
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${logoIconBg}`}>
              <GraduationCap size={16} className={logoIconColor} />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold tracking-widest uppercase truncate ${schoolTextColor}`}>
                {profile?.school || '...'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                Help Desk
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active ? activeClass : 'font-medium hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={!active ? { color: 'var(--text-muted)' } : {}}
              >
                <Icon
                  size={15}
                  style={!active ? { color: 'var(--text-faint)' } : {}}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={12} className="opacity-40" />}
              </button>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="px-3 py-2 mb-1 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {profile?.name || 'Student'}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                {profile?.school} Student
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <PushNotificationSetup />
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            style={{ color: 'var(--text-faint)' }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header
          className="lg:hidden sticky top-0 z-10 px-4 py-3 flex items-center gap-3 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--bg-sidebar)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded flex items-center justify-center ${logoIconBg}`}>
              <GraduationCap size={12} className={logoIconColor} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {profile?.school} Help Desk
            </span>
          </div>
          <PushNotificationSetup />
          <ThemeToggle />
          <NotificationBell />
        </header>
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}