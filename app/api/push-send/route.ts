import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, title, message, link } = await request.json()

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ success: true, sent: 0, reason: 'VAPID not configured' })
    }

    const webpush = await import('web-push')
    webpush.default.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return NextResponse.json({ success: true, sent: 0 })

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: { link: link || '/dashboard' }
    })

    for (const sub of subs) {
      try {
        await webpush.default.sendNotification(sub.subscription, payload)
      } catch (err) {
        console.error('Push failed:', err)
        await supabase.from('push_subscriptions').delete().eq('user_id', userId)
      }
    }

    return NextResponse.json({ success: true, sent: subs.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}