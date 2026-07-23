import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SCHOOL_INFO = `
MCNP was founded in 1994 and ISAP in 1998, both by Dr. Ronald Pagela Guzman.
Both located in Alimanao, Penablanca, Cagayan, Philippines.

MCNP VISION: Premier school in the country in allied health discipline producing globally competent health care professionals.
MCNP MISSION: Holistic development of the person conscious of his eternal destiny.
MCNP PURPOSE: "Caring for the Filipino and the People of the World"
MCNP CORE VALUES: G-GODLINESS, N-NATIONALISM, T-TRUSTWORTHINESS, I-INDUSTRY, P-PATIENCE
MCNP HYMN: With all the joys that crown the glorious strife Beloved MCNP you were born...

ISAP VISION: Distinctive institution producing exceptionally-skilled and values-oriented professionals.
ISAP MISSION: Holistic development of the person - socially responsible, virtuous and versatile.
ISAP PURPOSE: "Transforming Lives through Selfless Service"
ISAP CORE VALUES: I-INTEGRITY, S-SPIRITUAL UPRIGHTNESS, A-ALTRUISM, P-PATIENCE, I-INNOVATIVENESS, A-ADAPTIVENESS, N-NATIONALISM
ISAP HYMN: International School of Asia and the Pacific your name we will uphold...

FOUNDER: Dr. Ronald Pagela Guzman (medical doctor). Wife: Wilma Roa (nurse).
Children (second generation): Dr. Christopher Mark R. Guzman (orthopedic surgeon), Dr. Charles Ronald R. Guzman (internist and lung specialist), Dr. Aileen (pediatrician), Atty. Cristina Guzman, Atty. Olivia Olalia-Guzman.

DR. RONALD P. GUZMAN MEDICAL CENTER: 250-bed capacity tertiary hospital with MRI, CT scans, ultrasound, X-ray, dialysis. 150-bed PhilHealth department - first in Region 2.
`

export async function POST(request: Request) {
  try {
    const { message, school, conversationHistory } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── Fetch Knowledge Base first ─────────────────────────────────────────
    const { data: knowledge } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .eq('is_active', true)
      .or(`school.eq.${school},school.eq.BOTH`)
      .order('category')

    let knowledgeContext = ''
    if (knowledge && knowledge.length > 0) {
      knowledgeContext = '\n\nADMIN KNOWLEDGE BASE (use this information to answer questions):\n'
      for (const k of knowledge) {
        knowledgeContext += `\n[${k.category}] ${k.title}:\n${k.content}\n`
      }
    }

    // ── Detect intent ──────────────────────────────────────────────────────
    const msg = message.toLowerCase()
    let intent = 'GENERAL'
    if (msg.match(/where|location|office|room|building|find|direction/)) intent = 'LOCATION'
    else if (msg.match(/tuition|fee|fees|cost|price|amount|pay|how much/)) intent = 'TUITION'
    else if (msg.match(/course|program|degree|nursing|medtech|pharmacy|bsit|criminology|social work|computer engineering|physical therapy/)) intent = 'COURSES'
    else if (msg.match(/enroll|enrollment|register|admission|requirement|apply/)) intent = 'ENROLLMENT'
    else if (msg.match(/history|founded|founder|guzman|vision|mission|hymn|core values|philosophy|purpose|objective|outcome|graduate|attribute/)) intent = 'SCHOOL_INFO'

    let contextData = ''

    if (intent === 'COURSES') {
      const { data } = await supabase
        .from('courses')
        .select('name, description, duration, school, has_intersession')
        .eq('school', school)
        .order('name')
      if (data?.length) {
        contextData = `Courses offered by ${school}:\n`
        for (const c of data) {
          contextData += `- ${c.name} (${c.duration})${c.has_intersession ? ' - has intersession' : ''}: ${c.description}\n`
        }
      }
    }

    if (intent === 'TUITION') {
      const { data: tuition } = await supabase
        .from('tuition')
        .select('year_level, semester, amount, course_id, school')
        .eq('school', school)
        .order('year_level')
        .order('semester')
      const { data: courses } = await supabase
        .from('courses')
        .select('id, name')
        .eq('school', school)
      const map: Record<string, string> = {}
      courses?.forEach(c => { map[c.id] = c.name })
      if (tuition?.length) {
        contextData = `Tuition fees for ${school}:\n`
        for (const t of tuition) {
          contextData += `- ${map[t.course_id] || 'Unknown'} | ${t.year_level} | ${t.semester}: ₱${Number(t.amount).toLocaleString()}\n`
        }
      }
    }

    if (intent === 'LOCATION') {
      const { data } = await supabase
        .from('locations')
        .select('office_name, building, room, school')
        .eq('school', school)
        .order('office_name')
      if (data?.length) {
        contextData = `Office locations for ${school}:\n`
        for (const l of data) {
          contextData += `- ${l.office_name}: ${l.building}${l.room ? ', ' + l.room : ''}\n`
        }
      }
    }

    if (intent === 'ENROLLMENT' || intent === 'GENERAL' || intent === 'SCHOOL_INFO') {
      const { data } = await supabase
        .from('faq')
        .select('question, answer')
        .or(`school.eq.${school},school.eq.BOTH`)
        .order('category')
      if (data?.length) {
        contextData = `Campus FAQs:\n`
        for (const f of data) {
          contextData += `Q: ${f.question}\nA: ${f.answer}\n\n`
        }
      }
    }

    // ── Build system prompt ────────────────────────────────────────────────
    const systemPrompt = `You are a helpful AI assistant for the Smart Campus Help Desk serving ${school} students at ISAP and MCNP in Alimanao, Penablanca, Cagayan, Philippines.

SCHOOL INFORMATION:
${SCHOOL_INFO}
${knowledgeContext}
${contextData ? `\nLIVE CAMPUS DATA:\n${contextData}` : ''}

RULES:
- Always prioritize information from the ADMIN KNOWLEDGE BASE when answering questions
- Be warm, friendly, and helpful
- Always use ₱ for peso amounts
- Use bullet points for lists
- Respond in the same language the student uses (English or Filipino/Tagalog)
- If a student asks in Filipino, reply in Filipino
- Never make up information not provided above
- If you don't know the answer, suggest the student visit the relevant office or submit an inquiry through the Help Desk`

    // ── Build conversation ─────────────────────────────────────────────────
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      {
        role: 'model',
        parts: [{ text: `Understood! I am the Smart Campus Help Desk AI for ${school}. How can I help you today?` }]
      },
      ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ]

    // ── Call Gemini ────────────────────────────────────────────────────────
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']
    let response = ''

    for (const model of modelsToTry) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
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