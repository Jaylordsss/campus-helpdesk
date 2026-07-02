import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const {
      inquiryId,
      response,
      studentEmail,
      studentName,
      studentId,
      adminName
    } = await request.json()

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"Smart Campus Help Desk" <${process.env.GMAIL_USER}>`,
      to: studentEmail,
      subject: 'Your inquiry has been answered — Smart Campus Help Desk',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:40px 20px;">
          <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="background:#1e293b;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:20px;">Smart Campus Help Desk</h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">ISAP &amp; MCNP Campus Assistant</p>
            </div>
            <div style="padding:32px 40px;">
              <div style="text-align:center;margin-bottom:24px;">
                <span style="background:#dcfce7;color:#16a34a;font-size:13px;font-weight:600;padding:8px 20px;border-radius:99px;">Inquiry Resolved</span>
              </div>
              <p style="color:#64748b;font-size:14px;">Hi <strong style="color:#1e293b;">${studentName}</strong>,</p>
              <p style="color:#64748b;font-size:14px;line-height:1.6;">Your inquiry has been reviewed and answered by our campus help desk team.</p>
              <div style="background:#f1f5f9;border-left:4px solid #3b82f6;border-radius:8px;padding:20px 24px;margin:20px 0;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;">Response from ${adminName}</p>
                <p style="margin:0;color:#1e293b;font-size:15px;line-height:1.7;">${response}</p>
              </div>
              <p style="color:#64748b;font-size:13px;">If you have more questions, submit a new inquiry through the Help Desk portal.</p>
              <p style="color:#94a3b8;font-size:12px;">This is an automated message. Please do not reply.</p>
            </div>
            <div style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">Smart Campus Help Desk · ISAP &amp; MCNP</p>
              <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Sent to ${studentEmail}</p>
            </div>
          </div>
        </div>
      `,
      text: `Hi ${studentName},\n\nYour inquiry has been answered by ${adminName}.\n\nRESPONSE:\n${response}\n\nSmart Campus Help Desk`
    })

    await supabase
      .from('inquiries')
      .update({ response, status: 'resolved' })
      .eq('id', inquiryId)

    if (studentId) {
      await supabase.from('notifications').insert({
        user_id: studentId,
        title: 'Your inquiry has been answered',
        message: response.length > 80 ? response.substring(0, 80) + '...' : response,
        type: 'response',
        link: '/dashboard/inquiries',
      })
    }

    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send email'
    console.error('Email error:', err)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}