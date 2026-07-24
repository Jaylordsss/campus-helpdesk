import { createClient } from '@/src/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()

  // Run auth and profile fetch in parallel for speed
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/visitor')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, office')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const office = profile?.office

  if (role === 'admin') {
    const isMainAdmin = !office || office === 'General Administration'
    redirect(isMainAdmin ? '/admin' : '/office-admin')
  }

  redirect('/dashboard')
}