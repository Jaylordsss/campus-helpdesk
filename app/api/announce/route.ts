import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const typeColors: Record<string, string> = {
  urgent: '#ef4444',
  enrollment: '#3b82f6',
  event: '#8b5cf6',
  holiday: '#f59e0b',
  general: '#64748b',
}

const typeLabels: Record<string, string> = {
  urgent: '🚨 URGENT',
  enrollment: '📋 Enrollment',
  event: '🎉 Event',
  holiday: '🏖️ Holiday',
  general: '📢 Announcement',
}

export async function POST(request: Request) {
  try {
    const { announcementId, title, content, type, school, adminName } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all students for this school
    let query = supabase.from('profiles').select('id, name, email').eq('role', 'student')
    if (school !== 'BOTH') {
      query = query.eq('school', school)
    }
    const { data: students } = await query

    if (!students || students.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const color = typeColors[type] || typeColors.general
    const label = typeLabels[type] || typeLabels.general

    // Send in-app notifications to all students
    const notifInserts = students.map(student => ({
      user_id: student.id,
      title: `${label}: ${title}`,
      message: content.length > 100 ? content.substring(0, 100) + '...' : content,
      type: 'general',
      link: '/dashboard',
    }))

    await supabase.from('notifications').insert(notifInserts)

    // Send emails if Gmail is configured
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })

      const schoolName = school === 'MCNP'
        ? 'Medical Colleges of Northern Philippines'
        : school === 'ISAP'
        ? 'International School of Asia and the Pacific'
        : 'ISAP & MCNP'

      for (const student of students) {
        await transporter.sendMail({
          from: `"Smart Campus Help Desk" <${process.env.GMAIL_USER}>`,
          to: student.email,
          subject: `${label}: ${title} — Smart Campus Help Desk`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:40px 20px;">
              <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <div style="background:#1e293b;padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:20px;">Smart Campus Help Desk</h1>
                  <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">${schoolName}</p>
                </div>
                <div style="padding:32px 40px;">
                  <div style="text-align:center;margin-bottom:24px;">
                    <span style="background:${color}20;color:${color};font-size:13px;font-weight:600;padding:8px 20px;border-radius:99px;border:1px solid ${color}40;">
                      ${label}
                    </span>
                  </div>
                  <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;font-weight:700;">${title}</h2>
                  <div style="background:#f8fafc;border-left:4px solid ${color};border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                    <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;white-space:pre-line;">${content}</p>
                  </div>
                  <p style="color:#64748b;font-size:13px;">
                    This announcement was posted by <strong>${adminName}</strong> from the Smart Campus Help Desk.
                  </p>
                  <p style="color:#94a3b8;font-size:12px;margin-top:8px;">
                    Log in to the Help Desk portal to view all announcements.
                  </p>
                </div>
                <div style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;color:#94a3b8;font-size:12px;">Smart Campus Help Desk · ISAP &amp; MCNP</p>
                  <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Sent to ${student.email}</p>
                </div>
              </div>
            </div>
          `,
          text: `${label}: ${title}\n\n${content}\n\nPosted by ${adminName} — Smart Campus Help Desk`
        })
      }
    }

    return NextResponse.json({ success: true, sent: students.length })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed'
    console.error('Announce error:', err)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}