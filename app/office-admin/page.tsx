'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MessageSquare, FileText, Clock, CheckCircle2 } from 'lucide-react'
import { OFFICE_TO_CATEGORY, OFFICE_TO_STEP } from './layout'

export default function OfficeAdminDashboard() {
  const [profile, setProfile] = useState<{ name: string; office: string; school: string } | null>(null)
  const [stats, setStats] = useState({ inquiries: 0, pending: 0, documents: 0, resolved: 0 })
  const [recentInquiries, setRecentInquiries] = useState<{ id: string; message: string; status: string; created_at: string; profiles: { name: string } }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles').select('name, office, school').eq('id', user.id).single()
      if (!prof) return
      setProfile(prof)

      const category = OFFICE_TO_CATEGORY[prof.office] || 'General'
      const step = OFFICE_TO_STEP[prof.office] || null

      // Get inquiries for this office
      let inqQuery = supabase.from('inquiries').select('*', { count: 'exact' })
      if (category !== 'General') inqQuery = inqQuery.eq('category', category)
      const { count: totalInq } = await inqQuery

      let pendingQuery = supabase.from('inquiries').select('*', { count: 'exact' }).eq('status', 'pending')
      if (category !== 'General') pendingQuery = pendingQuery.eq('category', category)
      const { count: pendingInq } = await pendingQuery

      // Get recent inquiries
      let recentQuery = supabase.from('inquiries')
        .select('id, message, status, created_at, profiles(name)')
        .order('created_at', { ascending: false }).limit(5)
      if (category !== 'General') recentQuery = recentQuery.eq('category', category)
      const { data: recent } = await recentQuery

      // Get document requests for this step
      let docCount = 0
      if (step) {
        const { count } = await supabase.from('document_requests')
          .select('*', { count: 'exact' })
          .eq('current_step', step)
          .neq('status', 'Claimed').neq('status', 'Rejected')
        docCount = count || 0
      }

      setStats({
        inquiries: totalInq || 0,
        pending: pendingInq || 0,
        documents: docCount,
        resolved: (totalInq || 0) - (pendingInq || 0),
      })
      setRecentInquiries((recent || []) as unknown as typeof recentInquiries)
      setLoading(false)
    }
    init()
  }, [])

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Welcome */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accentColor }}>
          {greeting()}
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          {profile?.name} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {profile?.office} · Office Portal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Inquiries', value: stats.inquiries, icon: MessageSquare, color: accentColor },
          { label: 'Pending', value: stats.pending, icon: Clock, color: '#f59e0b' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: '#10b981' },
          { label: 'Doc Requests', value: stats.documents, icon: FileText, color: '#8b5cf6' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <Icon size={18} className="mb-2" style={{ color: s.color }} />
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Inquiries */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Recent Inquiries</p>
        </div>
        {recentInquiries.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare size={24} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No inquiries yet</p>
          </div>
        ) : (
          recentInquiries.map((inq, i) => (
            <div key={inq.id} className="px-5 py-3 flex items-start justify-between gap-3"
              style={{ borderBottom: i < recentInquiries.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {inq.profiles?.name}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {inq.message}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                inq.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {inq.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}