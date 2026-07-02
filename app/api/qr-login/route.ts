import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { student_id } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up student email by student_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name, role')
      .eq('student_id', student_id.trim())
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Student ID not found' }, { status: 404 })
    }

    // Generate magic link with redirect to dashboard
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: {
        redirectTo: 'https://campus-helpdesk-phi.vercel.app/dashboard',
      }
    })

    if (error || !data) {
      return NextResponse.json({ error: 'Could not generate login link' }, { status: 500 })
    }

    return NextResponse.json({
      magic_link: data.properties?.action_link,
      role: profile.role,
      name: profile.name,
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}