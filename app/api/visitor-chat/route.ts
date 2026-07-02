import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const msg = message.toLowerCase()

    let intent = 'GENERAL'
    if (msg.match(/where|location|office|room|building|find|direction/)) intent = 'LOCATION'
    else if (msg.match(/tuition|fee|fees|cost|price|amount|pay|how much/)) intent = 'TUITION'
    else if (msg.match(/course|program|degree|nursing|medtech|pharmacy|bsit|criminology|social work|computer engineering|physical therapy/)) intent = 'COURSES'
    else if (msg.match(/enroll|enrollment|register|admission|requirement|apply/)) intent = 'ENROLLMENT'

    let contextData = ''

    if (intent === 'COURSES') {
      const { data } = await supabase
        .from('courses').select('name, description, duration, school, has_intersession').order('school').order('name')
      if (data && data.length > 0) {
        contextData = `All courses offered:\n`
        for (const c of data) {
          contextData += `- [${c.school}] ${c.name} (${c.duration})${c.has_intersession ? ' - has intersession' : ''}: ${c.description}\n`
        }
      }
    }

    if (intent === 'TUITION') {
      const { data: tuition } = await supabase
        .from('tuition').select('year_level, semester, amount, course_id, school').order('school').order('year_level').order('semester')
      const { data: courses } = await supabase
        .from('courses').select('id, name')
      const map: Record<string, string> = {}
      courses?.forEach(c => { map[c.id] = c.name })
      if (tuition && tuition.length > 0) {
        contextData = `Tuition fees:\n`
        for (const t of tuition) {
          contextData += `- [${t.school}] ${map[t.course_id] || 'Unknown'} | ${t.year_level} | ${t.semester}: ₱${Number(t.amount).toLocaleString()}\n`
        }
      }
    }

    if (intent === 'LOCATION') {
      const { data } = await supabase
        .from('locations').select('office_name, building, room, school').order('office_name')
      if (data && data.length > 0) {
        contextData = `Campus offices:\n`
        for (const l of data) {
          contextData += `- [${l.school}] ${l.office_name}: ${l.building}${l.room ? ', ' + l.room : ''}\n`
        }
      }
    }

    if (intent === 'ENROLLMENT' || intent === 'GENERAL') {
      const { data } = await supabase
        .from('faq').select('question, answer').eq('school', 'BOTH').order('category')
      if (data && data.length > 0) {
        contextData = `Campus FAQs:\n`
        for (const f of data) {
          contextData += `Q: ${f.question}\nA: ${f.answer}\n\n`
        }
      }
    }

    const systemPrompt = `You are a helpful AI assistant for two Philippine campus institutions:
- ISAP (International School of Asia and the Pacific) — located in Alimanao, Peñablanca, Cagayan
- MCNP (Medical Colleges of Northern Philippines) — same campus as ISAP

Help visitors with information about courses, tuition, enrollment, offices, and campus life.

RULES:
- Be friendly, welcoming, and concise
- Always use ₱ for peso amounts
- Use bullet points for lists
- If asked about a specific school, focus on that school
- If no data found, say so and suggest visiting the campus or contacting the help desk
- Encourage visitors to sign up for a free account for more personalized help
- Respond in the same language the visitor uses (English or Filipino)

${contextData ? `LIVE CAMPUS DATA:\n${contextData}` : 'Answer based on general Philippine university knowledge.'}`

    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood! I am the Smart Campus Help Desk AI for ISAP and MCNP. How can I help you today?' }] },
      { role: 'user', parts: [{ text: message }] }
    ]

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
    let response = ''

    for (const model of modelsToTry) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: messages,
            generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
          })
        }
      )
      if (res.ok) {
        const data = await res.json()
        response = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (response) break
      }
    }

    if (!response) {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
    }

    return NextResponse.json({ response })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}