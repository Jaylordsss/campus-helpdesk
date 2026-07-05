import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, title, message, type, link } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Save in-app notification
    const { error } = await supabase.from('notifications').insert({
      user_id: userId, title, message, type, link
    })
    if (error) throw error

    // Send push notification directly (not via fetch)
    try {
      if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        const webpush = (await import('web-push')).default
        webpush.setVapidDetails(
          process.env.VAPID_EMAIL!,
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!
        )

        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('id, subscription')
          .eq('user_id', userId)

        if (subs && subs.length > 0) {
          const payload = JSON.stringify({
            title,
            body: message,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            data: { link: '/dashboard/notifications' }
          })

          for (const sub of subs) {
            try {
              await webpush.sendNotification(sub.subscription, payload)
              console.log('Push notification sent to', userId)
            } catch (err: unknown) {
              console.error('Push failed:', err)
              if (err instanceof Error && 'statusCode' in err) {
                const statusErr = err as { statusCode: number }
                if (statusErr.statusCode === 410 || statusErr.statusCode === 404) {
                  await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                }
              }
            }
          }
        }
      }
    } catch (pushErr) {
      console.error('Push error (non-critical):', pushErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}