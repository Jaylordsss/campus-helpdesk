import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message: string = body.message
    const school: string = body.school
    const conversationHistory: { role: string; content: string }[] = body.conversationHistory || []

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const msg = message.toLowerCase()

    let intent = 'GENERAL'
    if (msg.match(/where|location|office|room|building|find|direction|how to get/)) {
      intent = 'LOCATION'
    } else if (msg.match(/tuition|fee|fees|payment|cost|price|amount|pay|semester|intersession|year level|how much/)) {
      intent = 'TUITION'
    } else if (msg.match(/course|program|degree|subject|curriculum|bsit|nursing|medtech|pharmacy|criminology|social work|computer engineering|physical therapy/)) {
      intent = 'COURSES'
    } else if (msg.match(/enroll|enrollment|register|registration|admission|requirement|apply/)) {
      intent = 'ENROLLMENT'
    }

    let contextData = ''

    if (intent === 'TUITION') {
      const { data: tuitionData } = await supabase
        .from('tuition')
        .select('year_level, semester, amount, course_id')
        .eq('school', school)
        .order('year_level')
        .order('semester')

      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, name')
        .eq('school', school)

      if (tuitionData && tuitionData.length > 0) {
        const courseMap: Record<string, string> = {}
        if (coursesData) {
          for (const c of coursesData) {
            courseMap[c.id] = c.name
          }
        }
        let lines = `Tuition Fee Schedule for ${school}:\n`
        for (const t of tuitionData) {
          const courseName = courseMap[t.course_id] || 'Unknown Course'
          lines += `- ${courseName} | ${t.year_level} | ${t.semester}: ₱${Number(t.amount).toLocaleString()}\n`
        }
        contextData = lines
      } else {
        contextData = `No tuition data found for ${school}.`
      }
    }

    if (intent === 'COURSES') {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('name, description, duration, has_intersession')
        .eq('school', school)
        .order('name')

      if (coursesData && coursesData.length > 0) {
        let lines = `Courses offered at ${school}:\n`
        for (const c of coursesData) {
          lines += `- ${c.name} (${c.duration})${c.has_intersession ? ' — has intersession' : ''}: ${c.description}\n`
        }
        contextData = lines
      }
    }

    if (intent === 'LOCATION') {
      const { data: locationsData } = await supabase
        .from('locations')
        .select('office_name, building, room, school')
        .order('office_name')

      if (locationsData && locationsData.length > 0) {
        let lines = `Campus Offices and Locations:\n`
        for (const l of locationsData) {
          lines += `- ${l.office_name}: ${l.building}${l.room ? ', ' + l.room : ''} (${l.school})\n`
        }
        contextData = lines
      }
    }

    if (intent === 'ENROLLMENT' || intent === 'GENERAL') {
      const { data: faqData } = await supabase
        .from('faq')
        .select('question, answer')
        .or(`school.eq.${school},school.eq.BOTH`)
        .order('category')

      if (faqData && faqData.length > 0) {
        let lines = `Campus FAQs:\n`
        for (const f of faqData) {
          lines += `Q: ${f.question}\nA: ${f.answer}\n\n`
        }
        contextData = lines
      }
    }

    const schoolFull = school === 'MCNP'
      ? 'Medical Colleges of Northern Philippines (MCNP)'
      : 'International School of Asia and the Pacific (ISAP)'

    const systemPrompt = `You are a helpful Smart Campus Help Desk AI assistant for ${schoolFull}.

Help students with tuition fees, locations, courses, enrollment, scholarships, and general campus questions.

FORMATTING RULES - VERY IMPORTANT:
- Never use markdown symbols like **, *, ##, or __
- For lists use a clean dash and space: "- item"
- For section headers just write the header text alone on its own line with no symbols
- Separate sections with a blank line
- Keep responses short and scannable
- Use the peso sign for amounts like: P18,000
- Be warm and friendly
- Respond in the same language the student uses

RESPONSE FORMAT EXAMPLE for tuition:
Here are the tuition fees for [Course Name]:

1st Year
- 1st Semester: P18,000
- 2nd Semester: P18,000
- Intersession: P8,000 (if enrolled)

2nd Year
- 1st Semester: P20,000
- 2nd Semester: P22,000

RESPONSE FORMAT EXAMPLE for courses:
Here are the courses offered at [School]:

- Bachelor of Science in Information Technology (4 years)
- Bachelor of Science in Criminology (4 years)

RESPONSE FORMAT EXAMPLE for locations:
The Registrar Office is located at:

- Building: Administration Building
- Room: Room 101

${contextData ? `LIVE DATABASE DATA:\n${contextData}` : 'No specific data found. Answer based on general Philippine university knowledge.'}`

    const messages = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: `Understood! I am the Smart Campus Help Desk AI for ${schoolFull}. How can I help you today?` }]
      }
    ]

    for (const m of conversationHistory) {
      messages.push({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })
    }

    messages.push({
      role: 'user',
      parts: [{ text: message }]
    })

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
    ]

    let response = ''
    let lastError = ''

    for (const modelName of modelsToTry) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: messages,
            generationConfig: {
              maxOutputTokens: 1000,
              temperature: 0.7
            }
          })
        }
      )

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json()
        response = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (response) {
          console.log(`Success with model: ${modelName}`)
          break
        }
      } else {
        const errText = await geminiRes.text()
        console.error(`Model ${modelName} failed:`, geminiRes.status, errText)
        lastError = `${modelName}: ${geminiRes.status}`
        continue
      }
    }

    if (!response) {
      console.error('All models failed. Last error:', lastError)
      return NextResponse.json(
        { error: 'AI service is temporarily unavailable. Please try again in a few minutes.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ response, intent })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response'
    console.error('Chat API error:', err)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}