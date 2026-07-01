'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  Users, BookOpen, MessageSquare,
  Star, HelpCircle, MapPin, TrendingUp, CheckCircle, Clock
} from 'lucide-react'

type Stats = {
  totalUsers: number
  isapUsers: number
  mcnpUsers: number
  totalCourses: number
  isapCourses: number
  mcnpCourses: number
  totalInquiries: number
  pendingInquiries: number
  resolvedInquiries: number
  totalFeedback: number
  avgRating: number
  totalFAQs: number
  totalLocations: number
}

type RecentInquiry = {
  id: string
  message: string
  status: string
  created_at: string
  profiles: { name: string; school: string }
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([])
  const [ratingBreakdown, setRatingBreakdown] = useState<{ rating: number; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()

      const [
        { data: profiles },
        { data: courses },
        { data: inquiries },
        { data: feedback },
        { count: faqCount },
        { count: locationCount },
        { data: recent },
      ] = await Promise.all([
        supabase.from('profiles').select('school, role'),
        supabase.from('courses').select('school'),
        supabase.from('inquiries').select('status'),
        supabase.from('feedback').select('rating'),
        supabase.from('faq').select('*', { count: 'exact', head: true }),
        supabase.from('locations').select('*', { count: 'exact', head: true }),
        supabase.from('inquiries')
          .select('id, message, status, created_at, profiles(name, school)')
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const students = profiles?.filter(p => p.role === 'student') || []
      const avgRating = feedback && feedback.length > 0
        ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
        : 0

      const ratingMap = [5, 4, 3, 2, 1].map(r => ({
        rating: r,
        count: feedback?.filter(f => f.rating === r).length || 0
      }))

      setStats({
        totalUsers: students.length,
        isapUsers: students.filter(p => p.school === 'ISAP').length,
        mcnpUsers: students.filter(p => p.school === 'MCNP').length,
        totalCourses: courses?.length || 0,
        isapCourses: courses?.filter(c => c.school === 'ISAP').length || 0,
        mcnpCourses: courses?.filter(c => c.school === 'MCNP').length || 0,
        totalInquiries: inquiries?.length || 0,
        pendingInquiries: inquiries?.filter(i => i.status === 'pending').length || 0,
        resolvedInquiries: inquiries?.filter(i => i.status === 'resolved').length || 0,
        totalFeedback: feedback?.length || 0,
        avgRating: Number(avgRating.toFixed(1)),
        totalFAQs: faqCount || 0,
        totalLocations: locationCount || 0,
      })

      setRecentInquiries(recent as any || [])
      setRatingBreakdown(ratingMap)
      setLoading(false)
    }
    getData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) return null

  const resolutionRate = stats.totalInquiries > 0
    ? Math.round((stats.resolvedInquiries / stats.totalInquiries) * 100)
    : 0

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">System overview for ISAP and MCNP</p>
      </div>

      {/* Overview stats */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Students', value: stats.totalUsers, icon: Users },
            { label: 'Courses', value: stats.totalCourses, icon: BookOpen },
            { label: 'Inquiries', value: stats.totalInquiries, icon: MessageSquare },
            { label: 'Feedback', value: stats.totalFeedback, icon: Star },
            { label: 'FAQs', value: stats.totalFAQs, icon: HelpCircle },
            { label: 'Locations', value: stats.totalLocations, icon: MapPin },
            { label: 'Avg Rating', value: `${stats.avgRating}★`, icon: TrendingUp },
            { label: 'Resolution', value: `${resolutionRate}%`, icon: CheckCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
              <Icon size={14} className="text-slate-400 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* School breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Students by school */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Students by School
          </p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-red-600">ISAP</span>
                <span className="text-xs font-semibold text-slate-600">
                  {stats.isapUsers} students
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-red-400 h-2 rounded-full transition-all"
                  style={{ width: stats.totalUsers > 0 ? `${(stats.isapUsers / stats.totalUsers) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-blue-600">MCNP</span>
                <span className="text-xs font-semibold text-slate-600">
                  {stats.mcnpUsers} students
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: stats.totalUsers > 0 ? `${(stats.mcnpUsers / stats.totalUsers) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry status */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Inquiry Status
          </p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                  <Clock size={11} /> Pending
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {stats.pendingInquiries}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-amber-400 h-2 rounded-full transition-all"
                  style={{ width: stats.totalInquiries > 0 ? `${(stats.pendingInquiries / stats.totalInquiries) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle size={11} /> Resolved
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {stats.resolvedInquiries}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-emerald-400 h-2 rounded-full transition-all"
                  style={{ width: stats.totalInquiries > 0 ? `${(stats.resolvedInquiries / stats.totalInquiries) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50">
            <p className="text-xs text-slate-400">
              Resolution rate:{' '}
              <span className="font-bold text-emerald-600">{resolutionRate}%</span>
            </p>
          </div>
        </div>

        {/* Rating breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Rating Breakdown
          </p>
          <div className="flex items-end gap-2 h-24">
            {ratingBreakdown.map(({ rating, count }) => {
              const maxCount = Math.max(...ratingBreakdown.map(r => r.count), 1)
              const height = Math.round((count / maxCount) * 100)
              return (
                <div key={rating} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-500">{count}</span>
                  <div className="w-full flex items-end" style={{ height: '60px' }}>
                    <div
                      className="w-full bg-yellow-400 rounded-t-lg transition-all"
                      style={{ height: `${Math.max(height, count > 0 ? 10 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{rating}★</span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-400">Average</p>
            <p className="text-sm font-bold text-yellow-500">{stats.avgRating} ★</p>
          </div>
        </div>

        {/* Courses by school */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Courses by School
          </p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-red-600">ISAP</span>
                <span className="text-xs font-semibold text-slate-600">
                  {stats.isapCourses} courses
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-red-400 h-2 rounded-full"
                  style={{ width: stats.totalCourses > 0 ? `${(stats.isapCourses / stats.totalCourses) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-blue-600">MCNP</span>
                <span className="text-xs font-semibold text-slate-600">
                  {stats.mcnpCourses} courses
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full"
                  style={{ width: stats.totalCourses > 0 ? `${(stats.mcnpCourses / stats.totalCourses) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent inquiries */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Recent Inquiries
        </p>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {recentInquiries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No inquiries yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentInquiries.map(inquiry => (
                <div key={inquiry.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      inquiry.profiles?.school === 'ISAP'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {inquiry.profiles?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700">
                        {inquiry.profiles?.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{inquiry.message}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    inquiry.status === 'resolved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {inquiry.status === 'resolved'
                      ? <><CheckCircle size={10} /> Resolved</>
                      : <><Clock size={10} /> Pending</>
                    }
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}