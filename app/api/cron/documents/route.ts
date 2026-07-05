import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date().toISOString()

  // Find all requests where:
  // - status is "Payment Confirmed"
  // - pickup_date has arrived (pickup_date <= now)
  const { data: readyRequests, error } = await supabase
    .from('document_requests')
    .select('*, profiles(name, email)')
    .eq('status', 'Payment Confirmed')
    .lte('pickup_date', now)

  if (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!readyRequests || readyRequests.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No documents ready today' })
  }

  const results = []

  for (const req of readyRequests) {
    try {
      // Update status to Ready for Pickup
      await supabase
        .from('document_requests')
        .update({
          status: 'Ready for Pickup',
          current_step: 'Registrar',
          updated_at: now,
        })
        .eq('id', req.id)

      // Add approval record
      await supabase.from('request_approvals').insert({
        request_id: req.id,
        step: 'Auto',
        status: 'approved',
        remarks: 'Document automatically marked ready on scheduled pickup date',
        approved_at: now,
      })

      const pickupDateFormatted = req.pickup_date
        ? new Date(req.pickup_date).toLocaleDateString('en-PH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : 'Today'

      // Send in-app + push notification
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: req.student_id,
          title: '📦 Your Document is Ready for Pickup!',
          message: `Your ${req.document_type} (${req.reference_no}) is now ready. Please pick it up at the Registrar Office today.`,
          type: 'general',
          link: '/dashboard/documents',
        })
      })

      // Send email
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: req.id,
          response: `Great news! Your ${req.document_type} (Reference: ${req.reference_no}) is now ready for pickup at the Registrar Office.\n\nPickup Date: ${pickupDateFormatted}\nOffice Hours: Monday to Friday, 8:00 AM – 5:00 PM\n\nPlease bring:\n• A valid ID\n• This reference number: ${req.reference_no}\n\nIf you have any questions, please contact the Registrar Office.`,
          studentEmail: req.profiles?.email,
          studentName: req.profiles?.name,
          studentId: req.student_id,
          adminName: 'Registrar Office',
        })
      })

      results.push({ id: req.id, ref: req.reference_no, status: 'processed' })
      console.log(`✅ Document ready: ${req.reference_no} for ${req.profiles?.name}`)

    } catch (err) {
      console.error(`❌ Failed for ${req.reference_no}:`, err)
      results.push({ id: req.id, ref: req.reference_no, status: 'failed', error: String(err) })
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
    timestamp: now,
  })
}