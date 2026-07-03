'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Download, GraduationCap, QrCode } from 'lucide-react'

type Profile = {
  id: string
  name: string
  email: string
  school: string
  student_id: string | null
  course: string | null
  year_level: string | null
  photo_url: string | null
}

export default function IDCardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, school, student_id, course, year_level, photo_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        if (data.student_id) generateQR(data.student_id)
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
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#ffffff', light: '#00000000' }
      })
      setQrDataUrl(url)
    } catch (err) {
      console.error('QR generation failed:', err)
    }
  }

  const handleDownload = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const html2canvasPro = (await import('html2canvas-pro')).default
      const canvas = await html2canvasPro(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      })
      const link = document.createElement('a')
      link.download = `${profile?.name?.replace(/\s+/g, '-') || 'student'}-id-card.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadQR = async () => {
    if (!profile?.student_id) return
    try {
      const QRCode = await import('qrcode')
      const loginUrl = `https://campus-helpdesk-phi.vercel.app/login?student_id=${encodeURIComponent(profile.student_id)}`
      const url = await QRCode.toDataURL(loginUrl, {
        width: 400,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#ffffff' }
      })
      const link = document.createElement('a')
      link.download = `${profile?.name?.replace(/\s+/g, '-') || 'student'}-qr-code.png`
      link.href = url
      link.click()
    } catch (err) {
      console.error('QR download failed:', err)
    }
  }

  const isISAP = profile?.school === 'ISAP'
  const gradientBg = isISAP
    ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 100%)'
    : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 100%)'
  const currentYear = new Date().getFullYear()
  const schoolYear = `${currentYear}-${currentYear + 1}`
  const schoolFull = isISAP
    ? 'International School of Asia and the Pacific'
    : 'Medical Colleges of Northern Philippines'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Student ID Card
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Download your digital ID or QR code for quick login
        </p>
      </div>

      {(!profile?.student_id || !profile?.course) && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '16px',
          padding: '16px'
        }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', marginBottom: '4px' }}>
            Incomplete information
          </p>
          <p style={{ fontSize: '12px', color: '#b45309' }}>
            Your Student ID or course is not yet assigned. Please contact the admin office.
          </p>
        </div>
      )}

      {/* ID Card */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div
          ref={cardRef}
          style={{
            width: '400px',
            borderRadius: '24px',
            overflow: 'hidden',
            background: gradientBg,
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ padding: '24px 24px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px', height: '40px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <GraduationCap size={22} color="white" />
                </div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '22px', lineHeight: '1' }}>
                    {profile?.school}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '9px', fontWeight: 500, maxWidth: '180px', lineHeight: '1.3', marginTop: '2px' }}>
                    {schoolFull}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  School Year
                </div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '13px' }}>
                  {schoolYear}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '16px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
          </div>

          {/* Body */}
          <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div style={{
              width: '90px', height: '110px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.12)',
              border: '2px solid rgba(255,255,255,0.25)',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {profile?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${profile.photo_url}?v=${Date.now()}`}
                  alt="Student"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <GraduationCap size={26} color="rgba(255,255,255,0.4)" />
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '8px', fontWeight: 600, marginTop: '4px', textAlign: 'center' }}>
                    PHOTO
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px' }}>
                Full Name
              </div>
              <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '15px', lineHeight: '1.2', marginBottom: '12px' }}>
                {profile?.name || 'Student Name'}
              </div>

              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px' }}>
                Student ID
              </div>
              <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '22px', letterSpacing: '4px', fontFamily: 'monospace', marginBottom: '12px' }}>
                {profile?.student_id || '____-____'}
              </div>

              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px' }}>
                Program
              </div>
              <div style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, lineHeight: '1.3', marginBottom: '10px' }}>
                {profile?.course || 'Not assigned'}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '8px' }}>
                  <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: 700 }}>
                    {profile?.year_level || '1st Year'}
                  </span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '8px' }}>
                  <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: 700 }}>
                    Student
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with QR */}
          <div style={{
            margin: '0 16px 16px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Email
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 500 }}>
                  {profile?.email}
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Campus
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 500 }}>
                  Alimanao, Penablanca, Cagayan
                </div>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '8px', marginTop: '4px' }}>
                {profile?.student_id
                  ? 'Download QR Code below for easy login'
                  : 'Contact admin to get your Student ID'
                }
              </div>
            </div>

            {/* QR Code */}
            {profile?.student_id && qrDataUrl ? (
              <div style={{
                width: '100px', height: '100px',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '4px',
                flexShrink: 0,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                />
              </div>
            ) : profile?.student_id ? (
              <div style={{
                width: '100px', height: '100px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', textAlign: 'center', padding: '4px' }}>
                  Generating...
                </span>
              </div>
            ) : (
              <div style={{
                width: '100px', height: '100px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '12px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                padding: '6px',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '8px', textAlign: 'center', lineHeight: '1.4' }}>
                  No Student ID assigned
                </span>
              </div>
            )}
          </div>

          {/* Barcode */}
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5px', height: '28px', justifyContent: 'center', marginBottom: '4px' }}>
              {Array.from({ length: 55 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    borderRadius: '1px',
                    width: i % 4 === 0 ? '3px' : '1.5px',
                    height: `${((i * 7 + 13) % 40) + 60}%`,
                  }}
                />
              ))}
            </div>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '8px', fontFamily: 'monospace', letterSpacing: '4px' }}>
              {profile?.student_id || 'CAMPUS-HELPDESK'}
            </div>
          </div>
        </div>
      </div>

      {/* Download buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>

        {/* Download full ID card */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: accentColor,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '12px',
            border: 'none',
            cursor: downloading ? 'not-allowed' : 'pointer',
            opacity: downloading ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          <Download size={17} />
          {downloading ? 'Downloading...' : 'Download ID Card'}
        </button>

        {/* Download QR only */}
        {profile?.student_id && (
          <button
            onClick={handleDownloadQR}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'transparent',
              color: accentColor,
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '12px',
              border: `2px solid ${accentColor}`,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <QrCode size={17} />
            Download QR Code Only
          </button>
        )}
      </div>

      {/* How to use */}
      <div
        className="rounded-2xl border p-5"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)' }}>
          How to use your ID Card
        </p>
        <div className="space-y-2.5">
          {[
            'Download your ID card as PNG or download the QR Code separately.',
            'Go to the login page and click the Upload QR tab.',
            'Upload the QR Code PNG — your Student ID is auto-filled.',
            'Enter your password and click Log in.',
            'Use the QR Code Only download for best scanning results on mobile.',
          ].map((note, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                style={{ background: accentColor }}
              >
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