'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import {
  LayoutDashboard, Users, BookOpen, CreditCard,
  MapPin, MessageSquare, Star, HelpCircle,
  TrendingUp, LogOut, Menu, ShieldCheck, ChevronRight
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-100 to-blue-100 shrink-0">
              <ShieldCheck size={16} className="text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Admin</p>
              <p className="text-xs font-bold text-slate-900 truncate">Help Desk Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 pb-2">
            Management
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                  ${active
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                  }`}
              >
                <Icon size={15} className={active ? 'text-slate-700' : 'text-slate-400'} />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={12} className="opacity-40" />}
              </button>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <div className="px-3 py-2 mb-1 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{adminName}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Administrator</p>
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
          <span className="text-sm font-semibold text-slate-800 flex-1">Admin Portal</span>
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