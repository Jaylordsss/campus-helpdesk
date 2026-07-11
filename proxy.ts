import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes
  const publicRoutes = ['/login', '/signup', '/visitor', '/reset-password', '/api']
  if (publicRoutes.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Not logged in → visitor
  if (!user) {
    if (pathname === '/') return NextResponse.redirect(new URL('/visitor', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, office')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const office = profile?.office

  // Root redirect
  if (pathname === '/') {
    if (role === 'admin') {
      if (office && office !== 'General Administration') {
        return NextResponse.redirect(new URL('/office-admin', request.url))
      }
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Office admin trying to access main admin → redirect to office-admin
  if (pathname.startsWith('/admin') && role === 'admin' && office && office !== 'General Administration') {
    return NextResponse.redirect(new URL('/office-admin', request.url))
  }

  // Main admin trying to access office-admin → redirect to admin
  if (pathname.startsWith('/office-admin') && role === 'admin' && (!office || office === 'General Administration')) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Student trying to access admin areas
  if ((pathname.startsWith('/admin') || pathname.startsWith('/office-admin')) && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Student routes for non-students
  if (pathname.startsWith('/dashboard') && role === 'admin') {
    if (office && office !== 'General Administration') {
      return NextResponse.redirect(new URL('/office-admin', request.url))
    }
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
}