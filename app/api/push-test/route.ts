import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!subs || subs.length === 0) return NextResponse.json({ error: 'No subscriptions found for this user' }, { status: 404 })

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const payload = JSON.stringify({
      title: 'Test Notification',
      body: 'If you see this, push notifications are working!',
      icon: '/icons/icon-192x192.png',
      data: { link: '/dashboard' }
    })

    const results = []
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        results.push({ id: sub.id, status: 'sent' })
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string }
        results.push({ id: sub.id, status: 'failed', code: e.statusCode, message: e.message })
      }
    }

    return NextResponse.json({ subscriptions: subs.length, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}