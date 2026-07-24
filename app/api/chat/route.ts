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

// ── Gemini ────────────────────────────────────────────────────────────────────
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
    body.systemInstruction = {
      parts: [{
        text: `You have access to Google Search. 
ALWAYS search Google for:
- Current news and events
- Latest information and updates  
- Any facts you are not 100% sure about
- Prices, schedules, contact info
- Anything that may have changed recently
Search multiple times if needed to get complete information.
Always cite where you found the information.`
      }]
    }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) throw new Error(`Gemini ${model} failed: ${res.status}`)
  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts || []
  const text = parts.filter((p: { text?: string }) => p.text).map((p: { text: string }) => p.text).join('')
  if (!text) throw new Error('Gemini empty response')
  return text
}

// ── Groq ──────────────────────────────────────────────────────────────────────
async function callGroq(
  systemPrompt: string,
  message: string,
  conversationHistory: { role: string; content: string }[],
  imageBase64: string | null,
  imageMimeType: string | null,
  apiKey: string
): Promise<string> {
  const model = imageBase64
    ? 'meta-llama/llama-4-scout-17b-16e-instruct'
    : 'llama-3.3-70b-versatile'

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.content,
    })),
  ]

  // Last user message with optional image
  if (imageBase64 && imageMimeType) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } },
        { type: 'text', text: message || 'Describe this image in detail.' },
      ] as unknown as string,
    })
  } else {
    messages.push({ role: 'user', content: message })
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })

  if (!res.ok) throw new Error(`Groq failed: ${res.status}`)
  const data = await res.json()
  const message_content = data?.choices?.[0]?.message
  const text = message_content?.content || 
    message_content?.reasoning_details?.map((r: { content: string }) => r.content).join('') || ''
  if (!text) throw new Error('Groq empty response')
  return text
}

// ── OpenRouter ────────────────────────────────────────────────────────────────
async function callOpenRouter(
  systemPrompt: string,
  message: string,
  conversationHistory: { role: string; content: string }[],
  imageBase64: string | null,
  imageMimeType: string | null,
  apiKey: string
): Promise<string> {
  const model = imageBase64
    ? 'google/gemini-2.0-flash-exp:free'
    : 'poolside/laguna-s-2.1:free'

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.content,
    })),
  ]

  if (imageBase64 && imageMimeType) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${imageMimeType};base64,${imageBase64}`,
            detail: 'high',
          }
        },
        {
          type: 'text',
          text: message || 'Describe this image in complete detail. Read all text visible. Analyze everything.'
        },
      ] as unknown as string,
    })
  } else {
    messages.push({ role: 'user', content: message })
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://campus-helpdesk-phi.vercel.app',
      'X-Title': 'Smart Campus Help Desk',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
      ...(model === 'poolside/laguna-s-2.1:free' && {
        reasoning: { effort: 'high' }
      }),
    }),
  })

  if (!res.ok) throw new Error(`OpenRouter failed: ${res.status}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('OpenRouter empty response')
  return text
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { message, school, conversationHistory, imageBase64, imageMimeType } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ── Knowledge Base ────────────────────────────────────────────────────
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

    // ── Live campus data ──────────────────────────────────────────────────
    const msg = (message || '').toLowerCase()
    let contextData = ''

    if (msg.match(/tuition|fee|fees|cost|price|amount|pay|how much/)) {
      const { data: tuition } = await supabase
        .from('tuition').select('year_level, semester, amount, course_id')
        .eq('school', school).order('year_level').order('semester')
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
        .from('courses').select('name, description, duration, has_intersession')
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
        .from('locations').select('office_name, building, room')
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

    // ── System prompt ─────────────────────────────────────────────────────
    const imageInstruction = imageBase64 ? `

CRITICAL — IMAGE ANALYSIS:
The user sent an image. You MUST:
- Describe everything you see in full detail
- Read ALL text visible in the image
- Answer any question about the image thoroughly
- Analyze documents, receipts, forms, photos, screenshots completely
` : ''

    const systemPrompt = `You are a powerful AI assistant for the Smart Campus Help Desk of ${school} (ISAP and MCNP) in Alimanao, Penablanca, Cagayan, Philippines.
${imageInstruction}
PRIORITY when answering:
1. FIRST — Campus Knowledge Base (use it exactly if answer is there)
2. SECOND — Live Campus Data (tuition, courses, locations, FAQs)
3. THIRD — Your own knowledge for everything else

${knowledgeContext ? `CAMPUS KNOWLEDGE BASE:\n${knowledgeContext}` : ''}
${contextData ? `\nLIVE CAMPUS DATA:\n${contextData}` : ''}

SCHOOL BACKGROUND:
${SCHOOL_INFO}

RULES:
- Knowledge base first, then use Google Search for everything else
- ALWAYS use Google Search for current events, news, prices, real-time data
- Search multiple times if needed to get complete and accurate answers
- Answer ANY question — school, homework, science, math, current events
- For school questions not in knowledge base, search Google for the answer
- Cite sources when using Google Search results
- Use ₱ for peso amounts
- Answer in English or Filipino depending on what the student uses
- Be warm, helpful, and thorough
- Never say "I don't know" — always try`

    // ── Build Gemini contents ─────────────────────────────────────────────
    const lastUserParts: object[] = []
    if (imageBase64 && imageMimeType) {
      lastUserParts.push({ inline_data: { mime_type: imageMimeType, data: imageBase64 } })
    }
    lastUserParts.push({ text: message || 'Describe this image in detail.' })

    const geminiContents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `Hello! I'm your Campus AI Assistant for ${school}. How can I help?` }] },
      ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      { role: 'user', parts: lastUserParts }
    ]

    const geminiKey = process.env.GEMINI_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    const openrouterKey = process.env.OPENROUTER_API_KEY

    let response = ''

    // ── Try Gemini first ──────────────────────────────────────────────────
    if (geminiKey) {
      const geminiAttempts = imageBase64 ? [
        { model: 'gemini-2.5-flash-image', search: false },
        { model: 'gemini-2.5-flash', search: false },
        { model: 'gemini-2.0-flash', search: false },
        { model: 'gemini-2.0-flash-lite', search: false },
      ] : [
        { model: 'gemini-2.5-flash', search: true },   // always try with search first
        { model: 'gemini-2.5-pro', search: true },      // pro with search
        { model: 'gemini-2.5-flash', search: false },
        { model: 'gemini-2.0-flash', search: true },
        { model: 'gemini-2.0-flash', search: false },
        { model: 'gemini-2.0-flash-lite', search: false },
      ]

      for (const attempt of geminiAttempts) {
        try {
          response = await callGemini(attempt.model, geminiContents, attempt.search, geminiKey)
          if (response) { console.log(`✅ Gemini: ${attempt.model}`); break }
        } catch (e) {
          console.error(`❌ Gemini ${attempt.model}:`, e)
        }
      }
    }

    // ── Fallback 1: OpenRouter (Nvidia Nemotron Ultra 253B) ───────────────
    if (!response && openrouterKey) {
      try {
        response = await callOpenRouter(
          systemPrompt, message, conversationHistory || [],
          imageBase64, imageMimeType, openrouterKey
        )
        if (response) console.log('✅ Nvidia Nemotron Ultra via OpenRouter used')
      } catch (e) {
        console.error('❌ OpenRouter failed:', e)
      }
    }

    // ── Fallback 2: Groq (Llama 3.3 70B) ─────────────────────────────────
    if (!response && groqKey) {
      try {
        response = await callGroq(
          systemPrompt, message, conversationHistory || [],
          imageBase64, imageMimeType, groqKey
        )
        if (response) console.log('✅ Groq fallback used')
      } catch (e) {
        console.error('❌ Groq failed:', e)
      }
    }

    if (!response) {
      return NextResponse.json(
        { error: 'All AI services are currently unavailable. Please try again in a moment.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ response })

  } catch (err: unknown) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}