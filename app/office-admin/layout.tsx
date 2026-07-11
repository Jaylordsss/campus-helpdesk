'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, FileText,
  LogOut, Menu, X, Settings, Bell
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import NotificationBell from '@/components/NotificationBell'
import Link from 'next/link'

type Profile = {
  name: string
  email: string
  school: string
  office: string
}

const OFFICE_NAV: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  'Library': [
    { label: 'Dashboard', href: '/office-admin', icon: LayoutDashboard },
    { label: 'Document Requests', href: '/office-admin/documents', icon: FileText },
    { label: 'Inquiries', href: '/office-admin/inquiries', icon: MessageSquare },
    { label: 'Settings', href: '/office-admin/settings', icon: Settings },
  ],
  'Registrar': [
    { label: 'Dashboard', href: '/office-admin', icon: LayoutDashboard },
    { label: 'Document Requests', href: '/office-admin/documents', icon: FileText },
    { label: 'Inquiries', href: '/office-admin/inquiries', icon: MessageSquare },
    { label: 'Settings', href: '/office-admin/settings', icon: Settings },
  ],
  'Finance / Cashier': [
    { label: 'Dashboard', href: '/office-admin', icon: LayoutDashboard },
    { label: 'Document Requests', href: '/office-admin/documents', icon: FileText },
    { label: 'Inquiries', href: '/office-admin/inquiries', icon: MessageSquare },
    { label: 'Settings', href: '/office-admin/settings', icon: Settings },
  ],
  'Office of Guidance Services': [
    { label: 'Dashboard', href: '/office-admin', icon: LayoutDashboard },
    { label: 'Document Requests', href: '/office-admin/documents', icon: FileText },
    { label: 'Inquiries', href: '/office-admin/inquiries', icon: MessageSquare },
    { label: 'Settings', href: '/office-admin/settings', icon: Settings },
  ],
  'Office of Student Services': [
    { label: 'Dashboard', href: '/office-admin', icon: LayoutDashboard },
    { label: 'Inquiries', href: '/office-admin/inquiries', icon: MessageSquare },
    { label: 'Settings', href: '/office-admin/settings', icon: Settings },
  ],
  'CITE - College of Information Technology': [
    { label: 'Dashboard', href: '/office-admin', icon: LayoutDashboard },
    { label: 'Inquiries', href: '/office-admin/inquiries', icon: MessageSquare },
    { label: 'Settings', href: '/office-admin/settings', icon: Settings },
  ],
  'CASTE - College of Arts Sciences and Teacher Education': [
    { label: 'Dashboard', href: '/office-admin', icon: LayoutDashboard },
    { label: 'Inquiries', href: '/office-admin/inquiries', icon: MessageSquare },
    { label: 'Settings', href: '/office-admin/settings', icon: Settings },
  ],
  'Office of the Dean': [
    { label: 'Dashboard', href: '/office-admin', icon: LayoutDashboard },
    { label: 'Document Requests', href: '/office-admin/documents', icon: FileText },
    { label: 'Inquiries', href: '/office-admin/inquiries', icon: MessageSquare },
    { label: 'Settings', href: '/office-admin/settings', icon: Settings },
  ],
}

// Map office to inquiry category
export const OFFICE_TO_CATEGORY: Record<string, string> = {
  'Registrar': 'Registrar',
  'Finance / Cashier': 'Finance',
  'Office of Student Services': 'Office of Student Services',
  'Office of Guidance Services': 'Office of Guidance Services',
  'CITE - College of Information Technology': 'CITE',
  'CASTE - College of Arts Sciences and Teacher Education': 'CASTE',
  'Office of the Dean': 'General',
  'Library': 'General',
}

// Map office to document step
export const OFFICE_TO_STEP: Record<string, string> = {
  'Library': 'Library',
  'Registrar': 'Registrar',
  'Finance / Cashier': 'Finance',
  'Office of the Dean': 'Dean',
  'Office of Guidance Services': 'Guidance',
}

export default function OfficeAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('name, email, school, office')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
    }
    init()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = profile?.office ? (OFFICE_NAV[profile.office] || OFFICE_NAV['Office of Student Services']) : []
  const officeShort = profile?.office?.split(' - ')[0]?.split(' / ')[0] || 'Office'

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-card)' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: profile?.school === 'ISAP' ? '#fee2e2' : profile?.school === 'MCNP' ? '#dbeafe' : '#f1f5f9' }}>
            <span className="text-lg">🏛️</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{officeShort}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>Office Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/office-admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: isActive ? (profile?.school === 'ISAP' ? '#fee2e2' : '#dbeafe') : 'transparent',
                color: isActive ? (profile?.school === 'ISAP' ? '#dc2626' : '#2563eb') : 'var(--text-muted)',
              }}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{profile?.name}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>{officeShort} Admin</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-black/5"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>

      {/* Desktop sidebar */}
      <aside className="hidden sm:flex w-60 shrink-0 flex-col border-r" style={{ borderColor: 'var(--border)' }}>
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72" style={{ backgroundColor: 'var(--bg-card)' }}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile header */}
        <header className="sm:hidden flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu size={20} style={{ color: 'var(--text-muted)' }} />
            </button>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{officeShort} Portal</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}