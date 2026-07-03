import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SCHOOL_INFO = `
=== MCNP HISTORY ===
In December 1971, Dr. Ronald Pagela Guzman, a medical doctor, established the Holy Infant Clinic, a 15-bed capacity health care facility situated at Centro Uno, Tuao, Cagayan. This was his way of serving the people of Tuao, where he was born and where he and his wife, Wilma Roa, a nurse, resided for quite some time after graduating from college.

It was a community hospital with a family-centered care setup. Patients brought their own linens and other necessities without paying for accommodation fees. A detached kitchen was available where patients' nutrition was prepared by family members. The clinic rendered services from birth to death.

In 1994, Dr. Ronald envisioned that education is the antidote to ignorance, poverty, and disease. With this advocacy, he established the Medical Colleges of Northern Philippines (MCNP), which eventually led to the founding in 1998 of another school, the International School of Asia and the Pacific (ISAP).

Through the years, MCNP and ISAP earned reputations as two of the most prestigious and top-performing schools in the country. On March 18, 2008, MCNP was granted an Award of Recognition as a Category A(t), Mature Teaching Institution under IQUAME, making it one of only three HEIs assessed nationwide and the only HEI in Region 2.

Today, Dr. Christopher Mark R. Guzman (orthopedic surgeon), Dr. Charles Ronald R. Guzman (internist and lung specialist), Dr. Aileen (pediatrician), Atty. Cristina Guzman and Atty. Olivia Olalia-Guzman, children of the founders, serve as the second generation of medical practitioners and legal counsels.

In October 2010, the Dr. Ronald P. Guzman Medical Center emerged — a 250-bed capacity tertiary hospital with MRI, CT scans, ultrasound, X-ray, dialysis, and a 150-bed PhilHealth department, the first in Region 2.

The two schools benefit 32% of students through scholarships and financial support, assisting student orphans, indigenous peoples, honor students, children of teachers, children of rebel returnees, members of the PNP and AFP, and other groups.

=== MCNP VISION ===
The Medical Colleges of Northern Philippines (MCNP) aims to be the premier school in the country in the allied health discipline producing globally competent health care professionals contributing significantly to the upliftment of the quality of life of the individual, family, community and the whole humanity.

=== MCNP MISSION ===
The mission of Medical Colleges of Northern Philippines is the holistic development of the person – a man conscious of his eternal destiny, aware of the dynamics of change, challenged by the needs of daily living, cognizant of national and international development initiatives and ready to meet the demands of life in the pursuit of his objectives in whatever socio-economic level he belongs.

=== MCNP PURPOSE ===
"Caring for the Filipino and the People of the World"

=== MCNP PHILOSOPHY ===
God has bestowed man with different gifts and potentials, which are inherently good. These gifts, which vary from one person to another when given proper inspiration, can be developed for his own good, for his fellowmen, and for and in the glory of God.

=== MCNP CORE VALUES ===
G - GODLINESS, N - NATIONALISM, T - TRUSTWORTHINESS, I - INDUSTRY, P - PATIENCE

=== MCNP HYMN ===
With all the joys that crown the glorious strife Beloved MCNP you were born.
Amidst the comfort and the deafening need, you were conceived to be born to serve.
What matters if the winding road be rough, your mission-vision will carry you out to bring about the quality of life wherever may your graduates reside.
All hail, all hail the Medical Colleges, The Medical Colleges of Northern Philippines, Your sons and daughters pledge to thee. Their loyalty Deum et Patriam.
Long live, long live beloved MCNP. Deum et Patriam Serviam. To our beloved God and Country, we pledge to serve dear MCNP.

=== MCNP INSTITUTIONAL OBJECTIVES ===
1. Develop continuously our stakeholders and to imbue them with passion for excellence
2. Offer enriched and relevant curricular and co-curricular programs
3. Produce board topnotchers and register high passing rates in licensure examinations
4. Evolve dynamic and quality-driven scholarship program and other innovative programs for student development
5. Evolve a research and development culture
6. Establish linkages both locally and abroad to ensure opportunities for relevant experiences and employment

=== MCNP GRADUATE ATTRIBUTES ===
1. God-Fearing, 2. Good Citizen, 3. Mighty Eagle, 4. Service-oriented, 5. Caring and Compassionate, 6. Innovative Researcher, 7. Competent and Skilled

=== ISAP VISION ===
The International School of Asia and the Pacific is a distinctive institution with multi-disciplinary and integrated academic approaches producing exceptionally-skilled and values-oriented professionals thereby uplifting the quality of life and empowering self-sustaining communities of Asia-Pacific Region.

=== ISAP MISSION ===
The International School of Asia and the Pacific works for the holistic development of the person - a socially responsible, virtuous and versatile individual challenged by the demands of the society, responding to the individualized needs of the global community for its productivity and sustainability.

=== ISAP PURPOSE ===
"Transforming Lives through Selfless Service"

=== ISAP PHILOSOPHY ===
God created man in his image with distinct talent and skills integral to human progression. These talents, once given adequate appreciation and encouragement, can foster holistic development for his benefit and betterment of his fellowmen for the glory of God.

=== ISAP CORE VALUES ===
I - INTEGRITY, S - SPIRITUAL UPRIGHTNESS, A - ALTRUISM, P - PATIENCE, I - INNOVATIVENESS, A - ADAPTIVENESS, N - NATIONALISM

=== ISAP HYMN ===
International School of Asia and the Pacific your name we will uphold as one who shapes our hearts and minds in the Kingship of the Lord.
We will always strive for excellence as our symbol and our shields we'll always strive for justice, peace, and love for our nation and for the world.
International School of Asia and the Pacific wherever we may roam. The teachings of our dear beloved school is our guide forevermore.
ISAPians the world awaits you go forth and start to serve remember the teachings of our beloved school now and forevermore.

=== ISAP INSTITUTIONAL OUTCOMES ===
1. Demonstrates through institutional mechanisms, quality standards and code of good practice
2. Practices spiritual values and ethical behaviors which promote and inspire greater harmony
3. Exhibits life-long learning and global competency proficient in entrepreneurial skills
4. Manifests self-discipline, self-direction and adaptability in dealing with life's situations and challenges
5. Mobilizes community resources to foster and sustain institutional programs for community development

=== ISAP GRADUATE ATTRIBUTES ===
1. Role Model, 2. Research Enthusiast, 3. Exceptional Professional, 4. Altruistic, 5. Life-long Learner, 6. Mighty Eagle, 7. Spiritually Upright

=== FOUNDER ===
Dr. Ronald Pagela Guzman founded both MCNP (1994) and ISAP (1998). He is a visionary medical doctor who believed education is the antidote to ignorance, poverty, and disease. His wife is Wilma Roa, a nurse. Their children who serve as second generation: Dr. Christopher Mark R. Guzman (orthopedic surgeon), Dr. Charles Ronald R. Guzman (internist and lung specialist), Dr. Aileen (pediatrician), Atty. Cristina Guzman, and Atty. Olivia Olalia-Guzman.

=== LOCATION ===
Both MCNP and ISAP are located in Alimanao, Peñablanca, Cagayan, Philippines.

=== DR. RONALD P. GUZMAN MEDICAL CENTER ===
A 250-bed capacity tertiary hospital with MRI, CT scans, ultrasound, X-ray, dialysis. Includes a 150-bed PhilHealth department, the first in Region 2, serving disadvantaged and marginalized sectors.
`

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
    else if (msg.match(/history|founded|founder|guzman|vision|mission|hymn|core values|philosophy|purpose|objective|outcome|graduate|attribute/)) intent = 'SCHOOL_INFO'

    let contextData = ''

    if (intent === 'COURSES') {
      const { data } = await supabase
        .from('courses')
        .select('name, description, duration, school, has_intersession')
        .order('school')
        .order('name')
      if (data && data.length > 0) {
        contextData = `All courses offered:\n`
        for (const c of data) {
          contextData += `- [${c.school}] ${c.name} (${c.duration})${c.has_intersession ? ' - has intersession' : ''}: ${c.description}\n`
        }
      }
    }

    if (intent === 'TUITION') {
      const { data: tuition } = await supabase
        .from('tuition')
        .select('year_level, semester, amount, course_id, school')
        .order('school')
        .order('year_level')
        .order('semester')
      const { data: courses } = await supabase
        .from('courses')
        .select('id, name')
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
        .from('locations')
        .select('office_name, building, room, school')
        .order('office_name')
      if (data && data.length > 0) {
        contextData = `Campus offices:\n`
        for (const l of data) {
          contextData += `- [${l.school}] ${l.office_name}: ${l.building}${l.room ? ', ' + l.room : ''}\n`
        }
      }
    }

    if (intent === 'ENROLLMENT' || intent === 'GENERAL' || intent === 'SCHOOL_INFO') {
      const { data } = await supabase
        .from('faq')
        .select('question, answer')
        .eq('school', 'BOTH')
        .order('category')
      if (data && data.length > 0) {
        contextData = `Campus FAQs:\n`
        for (const f of data) {
          contextData += `Q: ${f.question}\nA: ${f.answer}\n\n`
        }
      }
    }

    const systemPrompt = `You are a knowledgeable and friendly AI assistant for the Smart Campus Help Desk, serving visitors of:
- MCNP (Medical Colleges of Northern Philippines)
- ISAP (International School of Asia and the Pacific)

Both schools are located in Alimanao, Peñablanca, Cagayan, Philippines. You are talking to a visitor who may be a prospective student, parent, or guest.

You have deep knowledge about both schools including their complete history, vision, mission, purpose, philosophy, core values, hymns, institutional objectives, institutional outcomes, and graduate attributes. You can answer questions about the founder Dr. Ronald Pagela Guzman and his family.

COMPREHENSIVE SCHOOL INFORMATION:
${SCHOOL_INFO}

${contextData ? `LIVE CAMPUS DATA FROM DATABASE:\n${contextData}` : ''}

RULES:
- Be warm, welcoming and professional to visitors
- Always use ₱ for Philippine Peso amounts
- Use bullet points for lists
- When asked about history, vision, mission, hymn, core values, philosophy, founder, or other school information, provide detailed and accurate answers
- You can answer about both MCNP and ISAP
- Respond in the same language the visitor uses (English or Filipino)
- Encourage visitors to sign up for a free account for personalized help
- Never make up information not provided above`

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood! I am the Smart Campus Help Desk AI for MCNP and ISAP. I have comprehensive knowledge about both schools. How can I help you today?' }]
      },
      {
        role: 'user',
        parts: [{ text: message }]
      }
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
    console.error('Visitor chat error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}