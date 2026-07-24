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

    // ── Knowledge Base ─────────────────────────────────────────────────────
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

    // ── Live campus data ───────────────────────────────────────────────────
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

    if (msg.match(/course|program|degree|nursing|medtech|bsit|criminology|pharmacy|physical therapy/)) {
      const { data } = await supabase
        .from('courses')
        .select('name, description, duration, has_intersession')
        .eq('school', school).order('name')
      if (data?.length) {
        contextData += `\nCourses offered by ${school}:\n`
        for (const c of data) {
          contextData += `- ${c.name} (${c.duration})${c.has_intersession ? ' has intersession' : ''}: ${c.description}\n`
        }
      }
    }

    if (msg.match(/where|location|office|room|building|find/)) {
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

    // ── System prompt ──────────────────────────────────────────────────────
    const systemPrompt = `You are a powerful AI assistant for the Smart Campus Help Desk of ${school} (ISAP and MCNP) in Alimanao, Penablanca, Cagayan, Philippines.

You work exactly like the real Gemini app — you search the internet in real time to answer any question.

${knowledgeContext ? `CAMPUS KNOWLEDGE BASE:\n${knowledgeContext}\n` : ''}
${contextData ? `LIVE CAMPUS DATA:\n${contextData}\n` : ''}

HOW TO ANSWER:
- For ANY question about ISAP, MCNP, or the school — search Google and give complete real-time information
- For campus-specific data like tuition and fees — use the live campus data above
- For everything else — search the internet and answer fully like Gemini
- Never say "I don't have information" — always search first
- Give detailed, complete answers with sources when available
- Use ₱ for peso amounts
- Answer in English or Filipino depending on what the user uses
- Be warm, helpful, and thorough like a real AI assistant`

    // ── Conversation history ───────────────────────────────────────────────
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      {
        role: 'model',
        parts: [{ text: `Hello! I'm your Smart Campus AI Assistant for ${school}. I can help you with anything — campus questions, homework, general knowledge, or just a chat. What would you like to know?` }]
      },
      ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ]

    // ── Try models with Google Search grounding ────────────────────────────
    const attempts = [
      {
        model: 'gemini-2.5-flash',
        body: {
          contents,
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
        }
      },
      {
        model: 'gemini-2.0-flash',
        body: {
          contents,
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
        }
      },
      {
        model: 'gemini-2.0-flash',
        body: {
          contents,
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
        }
      },
    ]

    let response = ''

    for (const attempt of attempts) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${attempt.model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attempt.body)
          }
        )

        if (res.ok) {
          const data = await res.json()
          const parts = data?.candidates?.[0]?.content?.parts || []
          response = parts
            .filter((p: { text?: string }) => p.text)
            .map((p: { text: string }) => p.text)
            .join('')
          if (response) break
        } else {
          const errText = await res.text()
          console.error(`Model ${attempt.model} failed:`, res.status, errText)
        }
      } catch (e) {
        console.error(`Model ${attempt.model} error:`, e)
        continue
      }
    }

    if (!response) {
      // Try one more time with basic gemini without any tools
      try {
        const basicRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
            })
          }
        )
        if (basicRes.ok) {
          const basicData = await basicRes.json()
          const parts = basicData?.candidates?.[0]?.content?.parts || []
          response = parts
            .filter((p: { text?: string }) => p.text)
            .map((p: { text: string }) => p.text)
            .join('')
        }
      } catch (e) {
        console.error('Final fallback failed:', e)
      }
    }

    if (!response) {
      return NextResponse.json({ error: 'AI unavailable. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ response })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}