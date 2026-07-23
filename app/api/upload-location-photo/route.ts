import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const locationId = formData.get('locationId') as string
    const photoType = (formData.get('photoType') as string) || 'pov'

    if (!file || !locationId) {
      return NextResponse.json({ error: 'Missing file or locationId' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${locationId}/${photoType}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadError } = await supabase.storage
      .from('locations')
      .upload(path, buffer, { upsert: true, contentType: file.type })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('locations')
      .getPublicUrl(path)

    // Save to correct column
    const column = photoType === 'logo' ? 'photo_url_logo' : 'photo_url_pov'
    const { error: updateError } = await supabase
      .from('locations')
      .update({ [column]: publicUrl, photo_url: publicUrl })
      .eq('id', locationId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, photo_url: publicUrl, column })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}