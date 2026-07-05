import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { announcementId, title, content, type, school, adminName } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all students for this school
    let query = supabase.from('profiles').select('id, name, email').eq('role', 'student')
    if (school !== 'BOTH') query = query.eq('school', school)
    const { data: students } = await query

    if (!students || students.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const label = type === 'urgent' ? '🚨 URGENT'
      : type === 'enrollment' ? '📋 Enrollment'
      : type === 'event' ? '🎉 Event'
      : type === 'holiday' ? '🏖️ Holiday'
      : '📢 Announcement'

    // Save in-app notifications for all students
    const notifInserts = students.map(student => ({
      user_id: student.id,
      title: `${label}: ${title}`,
      message: content.length > 100 ? content.substring(0, 100) + '...' : content,
      type: 'general',
      link: '/dashboard/announcements',
    }))
    await supabase.from('notifications').insert(notifInserts)

    // Send PUSH notifications to all students
    let pushSent = 0
    try {
      if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        const webpush = (await import('web-push')).default
        webpush.setVapidDetails(
          process.env.VAPID_EMAIL!,
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!
        )

        const payload = JSON.stringify({
          title: `${label}: ${title}`,
          body: content.length > 100 ? content.substring(0, 100) + '...' : content,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          data: { link: '/dashboard/announcements' }
        })

        for (const student of students) {
          const { data: subs } = await supabase
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', student.id)

          if (!subs || subs.length === 0) continue

          for (const sub of subs) {
            try {
              await webpush.sendNotification(sub.subscription, payload)
              pushSent++
              console.log('Push sent to', student.email)
            } catch (err: unknown) {
              console.error('Push failed for', student.email, err)
              if (err instanceof Error && 'statusCode' in err) {
                const statusErr = err as { statusCode: number }
                if (statusErr.statusCode === 410 || statusErr.statusCode === 404) {
                  await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                }
              }
            }
          }
        }
        console.log(`Push notifications sent: ${pushSent}/${students.length}`)
      }
    } catch (pushErr) {
      console.error('Push error:', pushErr)
    }

    // Send emails
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
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
                    <h2 style="color:#1e293b;margin:0 0 16px;">${title}</h2>
                    <p style="color:#334155;font-size:15px;line-height:1.7;white-space:pre-line;">${content}</p>
                    <p style="color:#64748b;font-size:13px;margin-top:24px;">Posted by ${adminName}</p>
                  </div>
                </div>
              </div>
            `,
            text: `${label}: ${title}\n\n${content}\n\nPosted by ${adminName}`
          })
        }
      } catch (emailErr) {
        console.error('Email error:', emailErr)
      }
    }

    return NextResponse.json({ success: true, sent: students.length, pushSent })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed'
    console.error('Announce error:', err)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}