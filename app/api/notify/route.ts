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

    // Send push notification in background (non-blocking)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    fetch(`${baseUrl}/api/push-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, message, link })
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}