'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Download, GraduationCap, IdCard } from 'lucide-react'

type Profile = {
  id: string
  name: string
  email: string
  school: string
  student_id: string | null
  course: string | null
  year_level: string | null
}

export default function IDCardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, school, student_id, course, year_level')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
      setLoading(false)
    }
    getData()
  }, [])

  const handleDownload = async () => {
    if (!cardRef.current) return
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `${profile?.name || 'student'}-id-card.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const isISAP = profile?.school === 'ISAP'
  const schoolFull = isISAP
    ? 'International School of Asia and the Pacific'
    : 'Medical Colleges of Northern Philippines'
  const currentYear = new Date().getFullYear()
  const schoolYear = `${currentYear}-${currentYear + 1}`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Student ID Card</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your official digital student identification card
        </p>
      </div>

      {/* Missing info warning */}
      {(!profile?.student_id || !profile?.course) && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">
            Incomplete information
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Your Student ID number or course is not yet assigned.
            Please contact the admin office to update your profile.
          </p>
        </div>
      )}

      {/* ID Card */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="w-[380px] rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: isISAP
              ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 100%)',
          }}
        >
          {/* Card header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <GraduationCap size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-black text-lg leading-none tracking-wide">
                    {profile?.school}
                  </p>
                  <p className="text-white/70 text-[9px] font-medium leading-tight max-w-[200px]">
                    {schoolFull}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-[9px] font-semibold uppercase tracking-widest">
                  School Year
                </p>
                <p className="text-white font-bold text-sm">{schoolYear}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 h-px bg-white/20" />

          {/* Card body */}
          <div className="px-6 py-5 flex items-center gap-5">

            {/* Photo placeholder */}
            <div
              className="w-24 h-28 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 border-white/30"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <GraduationCap size={28} className="text-white/60 mb-1" />
              <p className="text-white/50 text-[9px] font-medium text-center leading-tight px-1">
                Student Photo
              </p>
            </div>

            {/* Student info */}
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-[9px] font-semibold uppercase tracking-widest mb-0.5">
                Full Name
              </p>
              <p className="text-white font-bold text-base leading-tight mb-3">
                {profile?.name || 'Student Name'}
              </p>

              <p className="text-white/60 text-[9px] font-semibold uppercase tracking-widest mb-0.5">
                Student ID
              </p>
              <p className="text-white font-black text-xl tracking-widest mb-3 font-mono">
                {profile?.student_id || '____-____'}
              </p>

              <p className="text-white/60 text-[9px] font-semibold uppercase tracking-widest mb-0.5">
                Course
              </p>
              <p className="text-white text-[11px] font-semibold leading-tight mb-2">
                {profile?.course || 'Not assigned'}
              </p>

              <div className="flex items-center gap-2">
                <div className="bg-white/20 px-2.5 py-1 rounded-lg">
                  <p className="text-white text-[10px] font-bold">
                    {profile?.year_level || '1st Year'}
                  </p>
                </div>
                <div className="bg-white/20 px-2.5 py-1 rounded-lg">
                  <p className="text-white text-[10px] font-bold">
                    {profile?.school}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card footer */}
          <div
            className="mx-4 mb-4 px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.25)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-[8px] font-semibold uppercase tracking-widest">
                  Email
                </p>
                <p className="text-white/80 text-[10px] font-medium">
                  {profile?.email}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[8px] font-semibold uppercase tracking-widest">
                  Type
                </p>
                <p className="text-white/80 text-[10px] font-medium">Student</p>
              </div>
            </div>
          </div>

          {/* Barcode decoration */}
          <div className="px-6 pb-5">
            <div className="flex items-end gap-0.5 h-8 justify-center">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/30 rounded-sm"
                  style={{
                    width: i % 3 === 0 ? '3px' : '1.5px',
                    height: `${Math.random() * 60 + 40}%`,
                  }}
                />
              ))}
            </div>
            <p className="text-center text-white/40 text-[8px] font-mono mt-1 tracking-widest">
              {profile?.student_id || 'CAMPUS-HELPDESK'}
            </p>
          </div>
        </div>
      </div>

      {/* Download button */}
      <div className="flex justify-center">
        <button
          onClick={handleDownload}
          className={`flex items-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-xl transition-all shadow-lg ${
            isISAP
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Download size={17} />
          Download ID Card as PNG
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          Important Notes
        </p>
        <div className="space-y-2">
          {[
            'This is your official digital student ID for ISAP/MCNP Help Desk.',
            'Your Student ID number is assigned by the admin office.',
            'If your ID number or course is missing, contact the admin.',
            'Download and save your ID card for reference.',
          ].map((note, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                isISAP ? 'bg-red-400' : 'bg-blue-400'
              }`} />
              <p className="text-xs text-slate-500 dark:text-slate-400">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}