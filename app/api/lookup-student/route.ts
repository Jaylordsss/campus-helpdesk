import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { student_id } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('profiles')
      .select('email, name, role, school')
      .eq('student_id', student_id.trim())
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Student ID not found' }, { status: 404 })
    }

    return NextResponse.json({ email: data.email, name: data.name, role: data.role, school: data.school })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}