'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Download, GraduationCap } from 'lucide-react'

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
  const [qrDataUrl, setQrDataUrl] = useState('')
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
      if (data) {
        setProfile(data)
        if (data.student_id) {
          generateQR(data.student_id)
        }
      }
      setLoading(false)
    }
    getData()
  }, [])

  const generateQR = async (studentId: string) => {
    try {
      const QRCode = await import('qrcode')
      const loginUrl = `https://campus-helpdesk-phi.vercel.app/login?student_id=${encodeURIComponent(studentId)}`
      const url = await QRCode.toDataURL(loginUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#ffffff',
          light: '#00000000',
        }
      })
      setQrDataUrl(url)
    } catch (err) {
      console.error('QR generation failed:', err)
    }
  }

  const handleDownload = async () => {
    if (!cardRef.current) return
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
      })
      const link = document.createElement('a')
      link.download = `${profile?.name?.replace(/\s+/g, '-') || 'student'}-id-card.png`
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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Student ID Card
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your digital ID card — scan the QR code to log in instantly
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
            Please contact the admin office to complete your profile.
          </p>
        </div>
      )}

      {/* ID Card */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="w-[400px] rounded-3xl overflow-hidden"
          style={{
            background: isISAP
              ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 100%)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
          }}
        >
          {/* Top header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <GraduationCap size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-black text-xl leading-none tracking-wide">
                    {profile?.school}
                  </p>
                  <p className="text-white/60 text-[9px] font-medium leading-tight max-w-[180px] mt-0.5">
                    {schoolFull}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-[8px] font-semibold uppercase tracking-widest">
                  School Year
                </p>
                <p className="text-white font-bold text-sm">{schoolYear}</p>
              </div>
            </div>

            {/* Thin divider */}
            <div className="mt-4 h-px bg-white/20" />
          </div>

          {/* Card body */}
          <div className="px-6 pb-4 flex items-start gap-5">

            {/* Photo placeholder */}
            <div
              className="w-24 h-28 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 border-white/30"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <GraduationCap size={28} className="text-white/50 mb-1" />
              <p className="text-white/40 text-[8px] font-medium text-center px-1 leading-tight">
                PHOTO
              </p>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-white/50 text-[8px] font-bold uppercase tracking-widest mb-0.5">
                Full Name
              </p>
              <p className="text-white font-bold text-base leading-tight mb-3">
                {profile?.name || 'Student Name'}
              </p>

              <p className="text-white/50 text-[8px] font-bold uppercase tracking-widest mb-0.5">
                Student ID
              </p>
              <p className="text-white font-black text-2xl tracking-widest mb-3 font-mono">
                {profile?.student_id || '____-____'}
              </p>

              <p className="text-white/50 text-[8px] font-bold uppercase tracking-widest mb-0.5">
                Program
              </p>
              <p className="text-white text-xs font-semibold leading-tight mb-3">
                {profile?.course || 'Not assigned'}
              </p>

              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-white text-[10px] font-bold">
                  {profile?.year_level || '1st Year'}
                </span>
                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-white text-[10px] font-bold">
                  Student
                </span>
              </div>
            </div>
          </div>

          {/* QR + footer */}
          <div
            className="mx-4 mb-4 px-4 py-4 rounded-2xl flex items-center justify-between gap-4"
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            {/* Left info */}
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-white/40 text-[8px] font-bold uppercase tracking-widest">
                  Email
                </p>
                <p className="text-white/70 text-[10px] font-medium truncate">
                  {profile?.email}
                </p>
              </div>
              <div>
                <p className="text-white/40 text-[8px] font-bold uppercase tracking-widest">
                  Campus
                </p>
                <p className="text-white/70 text-[10px] font-medium">
                  Alimanao, Penablanca, Cagayan
                </p>
              </div>
              <div className="pt-1">
                <p className="text-white/40 text-[8px] font-medium">
                  Scan QR to log in to the Help Desk
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="shrink-0">
              {qrDataUrl ? (
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center p-1"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-full h-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <p className="text-white/40 text-[8px] text-center leading-tight px-1">
                    No Student ID set
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Barcode strip */}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-px h-6 justify-center mb-1">
              {Array.from({ length: 60 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/25 rounded-sm"
                  style={{
                    width: i % 4 === 0 ? '3px' : '1.5px',
                    height: `${((i * 7 + 13) % 40) + 60}%`,
                  }}
                />
              ))}
            </div>
            <p className="text-center text-white/30 text-[8px] font-mono tracking-[0.3em]">
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

      {/* How to use QR */}
      <div
        className="rounded-2xl border p-5"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)' }}>
          How to use the QR Code
        </p>
        <div className="space-y-2.5">
          {[
            'Download your ID card as a PNG image.',
            'Open the campus-helpdesk-phi.vercel.app on any device.',
            'Scan the QR code on your ID card with your phone camera.',
            'It will open the login page with your Student ID already filled in.',
            'Just enter your password and tap Log in.',
          ].map((note, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white ${
                isISAP ? 'bg-red-500' : 'bg-blue-500'
              }`}>
                {i + 1}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}