
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const locationId = formData.get('locationId') as string

    if (!file || !locationId) {
      return NextResponse.json({ error: 'Missing file or locationId' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${locationId}/photo.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('locations')
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('locations')
      .getPublicUrl(path)

    // Save to database
    const { error: updateError } = await supabase
      .from('locations')
      .update({ photo_url: publicUrl })
      .eq('id', locationId)

    if (updateError) {
      console.error('DB update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, photo_url: publicUrl })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}