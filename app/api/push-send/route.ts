import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { userId, title, message, link } = await request.json()

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log('VAPID keys missing')
      return NextResponse.json({ success: false, reason: 'VAPID not configured' })
    }

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId)

    console.log('Push subscriptions found:', subs?.length, 'error:', error)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: 'No subscriptions for user' })
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: { link: link || '/dashboard' }
    })

    let sent = 0
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        sent++
        console.log('Push sent successfully')
      } catch (err: unknown) {
        console.error('Push failed for sub:', err)
        // Remove expired/invalid subscription
        if (err instanceof Error && 'statusCode' in err) {
          const statusErr = err as { statusCode: number }
          if (statusErr.statusCode === 410 || statusErr.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      }
    }

    return NextResponse.json({ success: true, sent })
  } catch (err) {
    console.error('Push send error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}