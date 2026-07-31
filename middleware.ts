import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimit = new Map<string, { count: number; resetTime: number }>()

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/chat') ||
      request.nextUrl.pathname.startsWith('/api/visitor-chat')) {

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') || 'unknown'

    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute
    const maxRequests = 20 // max 20 requests per minute per IP

    const record = rateLimit.get(ip)

    if (!record || now > record.resetTime) {
      rateLimit.set(ip, { count: 1, resetTime: now + windowMs })
    } else if (record.count >= maxRequests) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      )
    } else {
      record.count++
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/chat', '/api/visitor-chat'],
}