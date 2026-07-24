import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SCHOOL_INFO = `
MCNP was founded in 1994 and ISAP in 1998, both by Dr. Ronald Pagela Guzman.
Both located in Alimanao, Penablanca, Cagayan, Philippines.

MCNP VISION: Premier school in the country in allied health discipline producing globally competent health care professionals.
MCNP MISSION: Holistic development of the person conscious of his eternal destiny.
MCNP PURPOSE: "Caring for the Filipino and the People of the World"
MCNP CORE VALUES: G-GODLINESS, N-NATIONALISM, T-TRUSTWORTHINESS, I-INDUSTRY, P-PATIENCE

ISAP VISION: Distinctive institution producing exceptionally-skilled and values-oriented professionals.
ISAP MISSION: Holistic development of the person - socially responsible, virtuous and versatile.
ISAP PURPOSE: "Transforming Lives through Selfless Service"
ISAP CORE VALUES: I-INTEGRITY, S-SPIRITUAL UPRIGHTNESS, A-ALTRUISM, P-PATIENCE, I-INNOVATIVENESS, A-ADAPTIVENESS, N-NATIONALISM

FOUNDER: Dr. Ronald Pagela Guzman (medical doctor). Wife: Wilma Roa (nurse).
DR. RONALD P. GUZMAN MEDICAL CENTER: 250-bed capacity tertiary hospital with MRI, CT scans, ultrasound, X-ray, dialysis.
`

async function callGemini(
  model: string,
  contents: object[],
  useSearch: boolean,
  apiKey: string,
  maxTokens = 2048
): Promise<string> {
  const body: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  }
  if (useSearch) {
    body.tools = [{ google_search: {} }]
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${model} failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts || []
  const text = parts
    .filter((p: { text?: string }) => p.text)
    .map((p: { text: string }) => p.text)
    .join('')

  if (!text) throw new Error(`${model} returned empty response`)
  return text
}

export async function POST(request: Request) {
  try {
    const { message, school, conversationHistory, imageBase64, imageMimeType } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const apiKey = process.env.GEMINI_API_KEY

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── 1. Knowledge Base ─────────────────────────────────────────────────
    const { data: knowledge } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .eq('is_active', true)
      .or(`school.eq.${school},school.eq.BOTH`)
      .order('category')

    let knowledgeContext = ''
    if (knowledge && knowledge.length > 0) {
      knowledgeContext = '\n\nCAMPUS KNOWLEDGE BASE:\n'
      for (const k of knowledge) {
        knowledgeContext += `\n[${k.category}] ${k.title}:\n${k.content}\n`
      }
    }

    // ── 2. Live campus data ───────────────────────────────────────────────
    const msg = message.toLowerCase()
    let contextData = ''

    if (msg.match(/tuition|fee|fees|cost|price|amount|pay|how much/)) {
      const { data: tuition } = await supabase
        .from('tuition')
        .select('year_level, semester, amount, course_id')
        .eq('school', school)
        .order('year_level').order('semester')
      const { data: courses } = await supabase
        .from('courses').select('id, name').eq('school', school)
      const map: Record<string, string> = {}
      courses?.forEach(c => { map[c.id] = c.name })
      if (tuition?.length) {
        contextData += `Tuition fees for ${school}:\n`
        for (const t of tuition) {
          contextData += `- ${map[t.course_id] || 'Unknown'} | ${t.year_level} | ${t.semester}: ₱${Number(t.amount).toLocaleString()}\n`
        }
      }
    }

    if (msg.match(/course|program|degree|nursing|medtech|bsit|criminology|pharmacy|physical therapy|social work/)) {
      const { data } = await supabase
        .from('courses')
        .select('name, description, duration, has_intersession')
        .eq('school', school).order('name')
      if (data?.length) {
        contextData += `\nCourses offered by ${school}:\n`
        for (const c of data) {
          contextData += `- ${c.name} (${c.duration})${c.has_intersession ? ' - has intersession' : ''}: ${c.description}\n`
        }
      }
    }

    if (msg.match(/where|location|office|room|building|find|direction/)) {
      const { data } = await supabase
        .from('locations')
        .select('office_name, building, room')
        .eq('school', school).order('office_name')
      if (data?.length) {
        contextData += `\nOffice locations for ${school}:\n`
        for (const l of data) {
          contextData += `- ${l.office_name}: ${l.building}${l.room ? ', ' + l.room : ''}\n`
        }
      }
    }

    const { data: faqs } = await supabase
      .from('faq').select('question, answer')
      .or(`school.eq.${school},school.eq.BOTH`).order('category')
    if (faqs?.length) {
      contextData += `\nFAQs:\n`
      for (const f of faqs) {
        contextData += `Q: ${f.question}\nA: ${f.answer}\n\n`
      }
    }

    // ── 3. System prompt ──────────────────────────────────────────────────
    const systemPrompt = `You are a powerful AI assistant for the Smart Campus Help Desk of ${school} (ISAP and MCNP) in Alimanao, Penablanca, Cagayan, Philippines.

You work like the real Gemini app — smart, thorough, and can answer anything.

PRIORITY ORDER when answering:
1. FIRST — Check the CAMPUS KNOWLEDGE BASE. If the answer is there, use it exactly.
2. SECOND — Check LIVE CAMPUS DATA for tuition, courses, locations, FAQs.
3. THIRD — Use your own knowledge and Google Search for everything else.

${knowledgeContext ? `
━━━━━━━━━━━━━━━━━━━━━━━━
CAMPUS KNOWLEDGE BASE (CHECK THIS FIRST):
━━━━━━━━━━━━━━━━━━━━━━━━
${knowledgeContext}
━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

${contextData ? `LIVE CAMPUS DATA:\n${contextData}` : ''}

SCHOOL BACKGROUND:
${SCHOOL_INFO}

RULES:
- Always check knowledge base first — if the answer is there, use it
- For questions not in the knowledge base, search Google and answer fully
- Answer ANY question — school, homework, science, math, current events, anything
- Use ₱ for peso amounts
- Answer in English or Filipino depending on what the student uses
- Be warm, helpful, detailed, and thorough like the real Gemini app
- Never say "I don't know" — always try to find the answer`

    // ── 4. Build conversation ─────────────────────────────────────────────
    // Build the last user message — support image
    const lastUserParts: object[] = []
    if (imageBase64 && imageMimeType) {
      lastUserParts.push({
        inline_data: {
          mime_type: imageMimeType,
          data: imageBase64,
        }
      })
    }
    if (message) {
      lastUserParts.push({ text: message })
    }
    if (lastUserParts.length === 0) {
      lastUserParts.push({ text: 'Describe what you see in this image.' })
    }

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      {
        role: 'model',
        parts: [{ text: `Hello! I'm your Campus AI Assistant for ${school}. I can help with campus questions, homework, or anything else. What would you like to know?` }]
      },
      ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: lastUserParts }
    ]

    // ── 5. Try models in order ────────────────────────────────────────────
    let response = ''

    const attempts = [
      { model: 'gemini-2.5-flash', search: true },
      { model: 'gemini-2.5-flash', search: false },
      { model: 'gemini-2.0-flash', search: true },
      { model: 'gemini-2.0-flash', search: false },
      { model: 'gemini-1.5-flash', search: false },
      { model: 'gemini-1.5-pro', search: false },
    ]

    for (const attempt of attempts) {
      try {
        response = await callGemini(
          attempt.model,
          contents,
          attempt.search,
          apiKey
        )
        if (response) break
      } catch (e) {
        console.error(`Attempt failed (${attempt.model}, search=${attempt.search}):`, e)
        continue
      }
    }

    // ── 6. Absolute last resort — bare minimum request ────────────────────
    if (!response) {
      try {
        response = await callGemini(
          'gemini-1.5-flash',
          [{ role: 'user', parts: [{ text: message }] }],
          false,
          apiKey,
          1024
        )
      } catch (e) {
        console.error('Last resort failed:', e)
      }
    }

    if (!response) {
      return NextResponse.json(
        { error: 'AI unavailable — please try again in a moment.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ response })

  } catch (err: unknown) {
    console.error('Chat API error:', err)
    const msg = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}