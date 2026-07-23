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

    // ── Knowledge Base ─────────────────────────────────────────────────────
    const { data: knowledge } = await supabase
      .from('knowledge_base')
      .select('title, content, category')
      .eq('is_active', true)
      .eq('school', 'BOTH')
      .order('category')

    let knowledgeContext = ''
    if (knowledge && knowledge.length > 0) {
      knowledgeContext = '\n\nCAMPUS KNOWLEDGE BASE:\n'
      for (const k of knowledge) {
        knowledgeContext += `\n[${k.category}] ${k.title}:\n${k.content}\n`
      }
    }

    // ── Campus data ────────────────────────────────────────────────────────
    const msg = message.toLowerCase()
    let contextData = ''

    if (msg.match(/tuition|fee|cost|price|how much/)) {
      const { data: tuition } = await supabase
        .from('tuition').select('year_level, semester, amount, course_id, school')
        .order('school').order('year_level')
      const { data: courses } = await supabase.from('courses').select('id, name')
      const map: Record<string, string> = {}
      courses?.forEach(c => { map[c.id] = c.name })
      if (tuition?.length) {
        contextData += `Tuition fees:\n`
        for (const t of tuition) {
          contextData += `- [${t.school}] ${map[t.course_id] || 'Unknown'} | ${t.year_level} | ${t.semester}: ₱${Number(t.amount).toLocaleString()}\n`
        }
      }
    }

    if (msg.match(/course|program|degree/)) {
      const { data } = await supabase.from('courses')
        .select('name, description, duration, school').order('school').order('name')
      if (data?.length) {
        contextData += `\nAll courses:\n`
        for (const c of data) {
          contextData += `- [${c.school}] ${c.name} (${c.duration}): ${c.description}\n`
        }
      }
    }

    const { data: faqs } = await supabase.from('faq')
      .select('question, answer').eq('school', 'BOTH').order('category')
    if (faqs?.length) {
      contextData += `\nFAQs:\n`
      for (const f of faqs) {
        contextData += `Q: ${f.question}\nA: ${f.answer}\n\n`
      }
    }

    // ── System prompt ──────────────────────────────────────────────────────
    const systemPrompt = `You are a powerful AI assistant for the Smart Campus Help Desk of ISAP and MCNP in Alimanao, Penablanca, Cagayan, Philippines.

Both schools were founded by Dr. Ronald Pagela Guzman — MCNP in 1994, ISAP in 1998.

You are like Gemini, ChatGPT, and Kimi combined — you can answer ANY question on ANY topic.
${knowledgeContext}
${contextData ? `\nLIVE CAMPUS DATA:\n${contextData}` : ''}

YOUR CAPABILITIES:
- Answer school questions using campus data above
- Answer ANY general knowledge question — science, math, history, technology, etc.
- Search and use real-time information from the web
- Help with homework, research, explanations, calculations, writing
- Answer in English or Filipino
- Be warm, helpful, and thorough

RULES:
- For campus questions: use the knowledge base and campus data
- For everything else: use full knowledge + web search
- Never refuse unless harmful or illegal
- Give complete detailed answers
- Encourage visitors to create an account for personalized help
- Always use ₱ for peso amounts`

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      {
        role: 'model',
        parts: [{ text: 'Hello! I\'m the Smart Campus AI Assistant for ISAP and MCNP. I can help you with campus questions or anything else you want to know. What can I help you with?' }]
      },
      { role: 'user', parts: [{ text: message }] }
    ]

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
        }
      } catch {
        continue
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