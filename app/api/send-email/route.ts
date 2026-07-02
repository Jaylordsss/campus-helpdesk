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
      adminName
    } = await request.json()

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    const mailOptions = {
      from: `"Smart Campus Help Desk" <${process.env.GMAIL_USER}>`,
      to: studentEmail,
      subject: 'Your inquiry has been answered — Smart Campus Help Desk',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background:#1e293b;padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">
                        Smart Campus Help Desk
                      </h1>
                      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">
                        ISAP &amp; MCNP Campus Assistant
                      </p>
                    </td>
                  </tr>

                  <!-- Status badge -->
                  <tr>
                    <td style="padding:32px 40px 0;text-align:center;">
                      <span style="background:#dcfce7;color:#16a34a;font-size:13px;font-weight:600;padding:8px 20px;border-radius:99px;">
                        Inquiry Resolved
                      </span>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:28px 40px;">
                      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">
                        Hi <strong style="color:#1e293b;">${studentName}</strong>,
                      </p>
                      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                        Your inquiry has been reviewed and answered by our campus help desk team.
                      </p>

                      <!-- Response box -->
                      <div style="background:#f1f5f9;border-left:4px solid #3b82f6;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                        <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
                          Response from ${adminName}
                        </p>
                        <p style="margin:0;color:#1e293b;font-size:15px;line-height:1.7;">
                          ${response}
                        </p>
                      </div>

                      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;">

                      <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                        If you have more questions, you can submit a new inquiry through the Help Desk portal.
                      </p>
                      <p style="margin:0;color:#94a3b8;font-size:12px;">
                        This is an automated message. Please do not reply to this email.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                      <p style="margin:0;color:#94a3b8;font-size:12px;">
                        Smart Campus Help Desk · ISAP &amp; MCNP
                      </p>
                      <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">
                        This email was sent to ${studentEmail}
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Hi ${studentName},

Your inquiry has been answered by ${adminName}.

RESPONSE:
${response}

If you have more questions, please visit the Campus Help Desk portal.

Smart Campus Help Desk - ISAP & MCNP
      `
    }

    await transporter.sendMail(mailOptions)

    // Update inquiry in Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase
      .from('inquiries')
      .update({ response, status: 'resolved' })
      .eq('id', inquiryId)

    return NextResponse.json({ success: true })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send email'
    console.error('Email error:', err)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}