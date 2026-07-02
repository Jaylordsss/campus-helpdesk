'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import {
  LayoutDashboard, Users, BookOpen, CreditCard,
  MapPin, MessageSquare, Star, HelpCircle,
  TrendingUp, LogOut, Menu, ShieldCheck, ChevronRight,
  Megaphone
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Courses', href: '/admin/courses', icon: BookOpen },
  { label: 'Tuition', href: '/admin/tuition', icon: CreditCard },
  { label: 'Locations', href: '/admin/locations', icon: MapPin },
  { label: 'FAQs', href: '/admin/faq', icon: HelpCircle },
  { label: 'Inquiries', href: '/admin/inquiries', icon: MessageSquare },
  { label: 'Feedback', href: '/admin/feedback', icon: Star },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminName, setAdminName] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const getAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles').select('name, role').eq('id', user.id).single()
      if (!data || data.role !== 'admin') { router.push('/dashboard'); return }
      setAdminName(data.name)
    }
    getAdmin()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-red-100 to-blue-100 dark:from-red-950/50 dark:to-blue-950/50">
              <ShieldCheck size={16} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-faint)' }}>
                Admin
              </p>
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>
                Help Desk Portal
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pb-2"
            style={{ color: 'var(--text-faint)' }}>
            Management
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all font-medium ${
                  active
                    ? 'bg-black/5 dark:bg-white/10 font-semibold'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}
              >
                <Icon
                  size={15}
                  style={{ color: active ? 'var(--text)' : 'var(--text-faint)' }}
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
                {adminName}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                Administrator
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="lg:hidden sticky top-0 z-10 px-4 py-3 flex items-center gap-3 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--bg-sidebar)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text)' }}>
            Admin Portal
          </span>
          <ThemeToggle />
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}