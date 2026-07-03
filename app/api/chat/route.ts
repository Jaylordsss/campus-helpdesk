import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SCHOOL_INFO = `
=== MCNP HISTORY ===
In December 1971, Dr. Ronald Pagela Guzman, a medical doctor, established the Holy Infant Clinic, a 15-bed capacity health care facility situated at Centro Uno, Tuao, Cagayan. This was his way of serving the people of Tuao, where he was born and where he and his wife, Wilma Roa, a nurse, resided for quite some time after graduating from college.

It was a community hospital with a family-centered care setup. Patients brought their own linens and other necessities without paying for accommodation fees. A detached kitchen was available where patients' nutrition was prepared by family members. The clinic rendered services from birth to death.

Geographically, Tuao at that time had no link to the rest of the municipalities, as it was surrounded by the Chico River, a tributary of the Cagayan River. During the rainy season, the river would overflow, making it impossible for motorboats to cross. As a result, appendectomies and caesarean sections had to be done in emergency cases at the Tuao Emergency Hospital.

Dr. Guzman trained a community worker to perform embalming services to help community members honor their departed loved ones. House calls and home visits were done for those unable to come to the clinic. Tuberculosis was prevalent, and management was carried out during home visits following initial assessment and diagnosis at the clinic.

The Holy Infant Clinic in Tuao operated as a satellite facility when a 35-bed capacity Holy Infant Clinic in Tuguegarao was established on July 7, 1980. Dr. Evelyn Duque served as the resident physician, while Grace and Filomena Roa led the group of nurses and caregivers who continued caring for the community.

This setup continued for two years, allowing Tuao to eventually produce its own doctors, ensuring continuity of care from private practitioners. Dr. and Mrs. Ronald P. Guzman also spent two years in Nigeria, where they worked at Bendel State Hospital in Benin City, Bendel State.

Upon their return to the Philippines, Holy Infant Clinic Tuguegarao was re-established. Over the years, it prospered and expanded its hospital services with the addition of the Medical, Surgical, Pediatric, and OB-GYNE Departments. It was also complemented by the addition of diagnostic services such as X-ray, ultrasound, laboratory services with drug testing facilities, and a pharmacy.

In 1994, Dr. Ronald envisioned that education is the antidote to ignorance, poverty, and disease. With this advocacy, he established the Medical Colleges of Northern Philippines (MCNP), which eventually led to the founding in 1998 of another school, the International School of Asia and the Pacific (ISAP), offering relevant and responsive courses to local, national, and global demands.

Through the years, MCNP and ISAP earned reputations as two of the most prestigious and top-performing schools in the country, producing global professionals. On March 18, 2008, MCNP was granted an Award of Recognition as a Category A(t), Mature Teaching Institution under the Institutional Monitoring and Evaluation for Quality Assurance (IQUAME), making it one of only three higher education institutions assessed nationwide and the only HEI in Region 2.

Today, Dr. Christopher Mark R. Guzman, an orthopedic surgeon; Dr. Charles Ronald R. Guzman, an internist and lung specialist; Dr. Aileen, a pediatrician; along with Atty. Cristina Guzman and Atty. Olivia Olalia-Guzman, children of the founders, serve as the second generation of medical practitioners and legal counsels for the institutions.

In October 2010, the humble beginnings of Holy Infant Clinic culminated in the emergence of the Dr. Ronald P. Guzman Medical Center — a 250-bed capacity tertiary hospital. It boasts state-of-the-art facilities including MRI, CT scans, ultrasound, X-ray, dialysis, and the latest in patient care, trauma, and diagnostics, all manned by specialists.

The hospital includes a 150-bed PhilHealth department — the first in the region — to serve the disadvantaged and marginalized sectors of society, in line with the founders' principle of preferential option for the poor.

The two schools have produced board topnotchers and have consistently ranked at the top in licensure examinations, both regionally and nationally. The schools have grown rapidly, now holding the second-largest tertiary-level enrollment in the region.

Dr. and Mrs. Guzman's generosity is demonstrated by their scholarship and financial support programs, which benefit 32% of the student population — primarily composed of children from poor families. The school also provides assistance to special groups such as student orphans, indigenous peoples, honor students, children of teachers, children of rebel returnees, members of the PNP and AFP, and other groups in need.

=== MCNP VISION ===
The Medical Colleges of Northern Philippines (MCNP) aims to be the premier school in the country in the allied health discipline producing globally competent health care professionals contributing significantly to the upliftment of the quality of life of the individual, family, community and the whole humanity.

=== MCNP MISSION ===
The mission of Medical Colleges of Northern Philippines is the holistic development of the person – a man conscious of his eternal destiny, aware of the dynamics of change, challenged by the needs of daily living, cognizant of national and international development initiatives and ready to meet the demands of life in the pursuit of his objectives in whatever socio-economic level he belongs.

=== MCNP PURPOSE ===
"Caring for the Filipino and the People of the World"

=== MCNP PHILOSOPHY ===
God has bestowed man with different gifts and potentials, which are inherently good. These gifts, which vary from one person to another when given proper inspiration, can be developed for his own good, for his fellowmen, and for and in the glory of God.

=== MCNP CORE VALUES ===
G - GODLINESS
N - NATIONALISM
T - TRUSTWORTHINESS
I - INDUSTRY
P - PATIENCE

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
6. Establish linkages both locally and abroad to ensure opportunities for relevant experiences and employment as well as boost up community extension programs

=== MCNP INSTITUTIONAL OUTCOMES ===
1. Demonstrates love for God, country and humanity in carrying out his duties and responsibilities concomitant to his profession
2. Utilize advancement in technology, available data and past and present discoveries for the solutions of problems emanating from various social structures, events and scenarios
3. Manifest fearlessly, self-discipline, self-direction and adaptability in dealing with life's situation and challenges
4. Uphold and practice selfless service, responsibility and citizenship; genuine love and concern for others
5. Demonstrate skills and competencies acquired from various learning experience in the practice of his profession

=== MCNP GRADUATE ATTRIBUTES ===
1. God-Fearing – one who keeps the Laws of God primary in all his undertakings
2. Good Citizen – imbued with self-discipline rooted from constitutional provisions, social norms and other regulations
3. Mighty Eagle – fearless to dream and pursue his goals, strong and confident to deal with challenges
4. Service-oriented – imbued with outpouring love for the poor and underprivileged
5. Caring and Compassionate – overflowing with concern for the health and well-being of man
6. Innovative Researcher – skilled and motivated to discover new ideas and introduce novel approaches
7. Competent and Skilled – equipped with the attributes required of his professional field

=== ISAP HISTORY ===
In December 1971, Dr. Ronald Pagela Guzman, a medical doctor, established the Holy Infant Clinic, a 15-bed capacity health care facility situated at Centro Uno, Tuao, Cagayan.

In 1994, Dr. Ronald envisioned that education is the antidote to ignorance, poverty and disease. With this advocacy, he established Medical Colleges of Northern Philippines (MCNP), a school that led to the fruition in 1998 of another school which is the International School of Asia and the Pacific (ISAP), offering courses that are relevant and responsive to local, national and global demands.

Through the years, MCNP and ISAP have earned the reputation as two of the most prestigious and top performing schools in the country producing global professionals.

MCNP was granted an Award of Recognition for being assessed as Category A(t), Mature Teaching Institution under the Institutional Monitoring and Evaluation for Quality Assurance (IQUAME), as one of the three Higher Education Institutions assessed nationwide and the only HEI in Region 2 on March 18, 2008.

Today, Dr. Christopher Mark R. Guzman, an ortho-surgeon, Dr. Charles Ronald R. Guzman, Internist-lung specialist, Dr. Aileen, a Pediatrician together with Atty. Cristina Guzman and Atty. Olivia Olalia-Guzman, children of the founders, are second generation medical practitioners and legal counsels of the institutions.

In October 2010, the Dr. Ronald P. Guzman Medical Center emerged as a 250 bed-capacity Tertiary Hospital with state-of-the-art facility including MRI, CT scans, ultrasound, X-ray, dialysis and the latest in patient care and trauma and diagnostic center manned by specialists. The 150 bed PhilHealth department is the first in the region that caters to the needs of the disadvantaged and marginalized sector of society.

The two schools have produced board topnotchers and are adjudged as top rankers in the licensure examination both in the regional and national level. The schools have the 2nd largest enrollment in the tertiary level in the region.

Dr. and Mrs. Guzman extended scholarship and financial support to 32% of the school's student population composed mostly of children of poor families. The school has provided assistance to the following special groups: student orphans, indigenous people, honor students, children of elementary and high school teachers, children of rebel returnees, members of the PNP and AFP, and other groups needing assistance.

=== ISAP VISION ===
The International School of Asia and the Pacific is a distinctive institution with multi-disciplinary and integrated academic approaches producing exceptionally-skilled and values-oriented professionals thereby uplifting the quality of life and empowering self-sustaining communities of Asia-Pacific Region.

=== ISAP MISSION ===
The International School of Asia and the Pacific works for the holistic development of the person - a socially responsible, virtuous and versatile individual challenged by the demands of the society, responding to the individualized needs of the global community for its productivity and sustainability.

=== ISAP PURPOSE ===
"Transforming Lives through Selfless Service"

=== ISAP PHILOSOPHY ===
God created man in his image with distinct talent and skills integral to human progression. These talents, once given adequate appreciation and encouragement, can foster holistic development for his benefit and betterment of his fellowmen for the glory of God.

=== ISAP CORE VALUES ===
I - INTEGRITY
S - SPIRITUAL UPRIGHTNESS
A - ALTRUISM
P - PATIENCE
I - INNOVATIVENESS
A - ADAPTIVENESS
N - NATIONALISM

=== ISAP HYMN ===
International School of Asia and the Pacific your name we will uphold as one who shapes our hearts and minds in the Kingship of the Lord.
We will always strive for excellence as our symbol and our shields we'll always strive for justice, peace, and love for our nation and for the world.
International School of Asia and the Pacific wherever we may roam. The teachings of our dear beloved school is our guide forevermore.
ISAPians the world awaits you go forth and start to serve remember the teachings of our beloved school now and forevermore.

=== ISAP INSTITUTIONAL OUTCOMES ===
1. Demonstrates through institutional mechanisms, quality standards and code of good practice which are reflective of equal participatory decision making and accountability
2. Practices spiritual values and ethical behaviors which promote and inspire greater harmony to project a credible image in the society
3. Exhibits life-long learning and global competency proficient in entrepreneurial skills, selfless innovative, mindset and socio-civic services
4. Manifests self-discipline, self-direction and adaptability in dealing with life's situations and challenges
5. Mobilizes community resources to foster and sustain institutional programs for community development

=== ISAP GRADUATE ATTRIBUTES ===
1. Role Model – imbued with self-discipline rooted from constitutional provisions, social norms and other regulations
2. Research Enthusiast – skilled and motivated to discover new ideas and introduce novel approaches and strategies
3. Exceptional Professional – provided with sufficient learning experiences and exposures both locally and globally
4. Altruistic – imbued with outpouring love of the poor and underprivileged, the welfare of communities
5. Life-long Learner – a professional of both formal and informal learning opportunities throughout people's lives
6. Mighty Eagle – fearless to dream and pursue his goals, strong and confident to deal with challenges
7. Spiritually Upright – one who keeps the laws of God primary in all his undertakings

=== FOUNDER ===
Dr. Ronald Pagela Guzman founded both MCNP and ISAP. He is a visionary medical doctor who believed education is the antidote to ignorance, poverty, and disease. His wife is Wilma Roa, a nurse. Their children who serve as second generation: Dr. Christopher Mark R. Guzman (orthopedic surgeon), Dr. Charles Ronald R. Guzman (internist and lung specialist), Dr. Aileen (pediatrician), Atty. Cristina Guzman, and Atty. Olivia Olalia-Guzman.

=== LOCATION ===
Both MCNP and ISAP are located in Alimanao, Peñablanca, Cagayan, Philippines.

=== DR. RONALD P. GUZMAN MEDICAL CENTER ===
A 250-bed capacity tertiary hospital with state-of-the-art facilities including MRI, CT scans, ultrasound, X-ray, dialysis. Includes a 150-bed PhilHealth department, the first in Region 2, serving disadvantaged and marginalized sectors of society.
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
      if (data && data.length > 0) {
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
      if (tuition && tuition.length > 0) {
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
      if (data && data.length > 0) {
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
      if (data && data.length > 0) {
        contextData = `Campus FAQs:\n`
        for (const f of data) {
          contextData += `Q: ${f.question}\nA: ${f.answer}\n\n`
        }
      }
    }

    const systemPrompt = `You are a knowledgeable and friendly AI assistant for the Smart Campus Help Desk, serving students and visitors of:
- MCNP (Medical Colleges of Northern Philippines)
- ISAP (International School of Asia and the Pacific)

Both schools are located in Alimanao, Peñablanca, Cagayan, Philippines. You are currently helping a ${school} student.

You have deep knowledge about both schools including their complete history, vision, mission, purpose, philosophy, core values, hymns, institutional objectives, institutional outcomes, and graduate attributes. You can answer questions about the founder Dr. Ronald Pagela Guzman and his family.

SCHOOL INFORMATION:
${SCHOOL_INFO}

${contextData ? `LIVE CAMPUS DATA FROM DATABASE:\n${contextData}` : ''}

RULES:
- Be warm, friendly, and professional
- Always use ₱ for Philippine Peso amounts
- Use bullet points for lists
- When asked about history, vision, mission, hymn, core values, philosophy, or other school information, provide detailed and accurate answers from the school information above
- If asked about the other school (not the student's school), you can still answer
- Respond in the same language the student uses (English or Filipino)
- For questions not covered, suggest visiting the campus or contacting the help desk
- Never make up information not provided above`

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: `Understood! I am the Smart Campus Help Desk AI for ${school}. I have comprehensive knowledge about both MCNP and ISAP including their history, vision, mission, core values, hymns, and more. How can I help you today?` }]
      },
      ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
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
    console.error('Chat error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}