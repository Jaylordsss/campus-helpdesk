import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    try { new URL(url) } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const hostname = new URL(url).hostname

    // Step 1 — Try to fetch the page directly
    let pageText = ''
    let pageTitle = hostname
    try {
      const fetchRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: AbortSignal.timeout(15000),
      })

      if (fetchRes.ok) {
        const html = await fetchRes.text()

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) pageTitle = titleMatch[1].trim()

        // Clean HTML to text
        pageText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
          .replace(/<meta[^>]*>/gi, ' ')
          .replace(/<link[^>]*>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s{3,}/g, '\n')
          .trim()
      }
    } catch {
      // fetch failed, will use Gemini search instead
    }

    // Step 2 — Use Gemini to process + enrich content
    const prompt = pageText.length > 500
      ? `You are a content extractor and organizer.

I fetched this webpage: ${url}
Page title: ${pageTitle}

Here is the raw extracted text from the page:
---
${pageText.substring(0, 6000)}
---

Please organize and clean this content into a well-structured knowledge base entry.
Extract and present:
- Main information and purpose of this page
- All important details (fees, requirements, schedules, contacts, programs, etc.)
- Any lists, tables, or structured data
- Contact information, addresses, office hours
- Any announcements or news

Format it clearly with sections. Keep ALL information — do not remove anything important.`
      : `You are a research assistant. Use Google Search to find and extract ALL content from this webpage: ${url}

Extract everything from the page:
- Main content and purpose
- All programs, courses, or services offered
- Fees, requirements, schedules
- Contact information, addresses, office hours
- News, announcements, events
- History, vision, mission if present
- Any other important information

This is the official website of ${hostname}. Get as much detail as possible.
Format clearly with sections and bullet points.`

    // Try gemini-2.5-flash first, then fallback
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash']
    let content = ''

    for (const model of models) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: prompt }]
              }],
              tools: [{ google_search: {} }],
              generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.1,
              }
            })
          }
        )

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          const parts = geminiData?.candidates?.[0]?.content?.parts || []
          content = parts
            .filter((p: { text?: string }) => p.text)
            .map((p: { text: string }) => p.text)
            .join('')
          if (content) break
        }
      } catch {
        continue
      }
    }

    if (!content) {
      // Last resort — return raw extracted text if we have it
      if (pageText.length > 200) {
        return NextResponse.json({
          title: pageTitle,
          content: `Source: ${url}\n\n${pageText.substring(0, 8000)}`,
          url,
          charCount: pageText.length,
        })
      }
      return NextResponse.json({
        error: 'Could not extract content from this URL. The website may be blocking access.'
      }, { status: 400 })
    }

    // Extract title from first line of content
    const firstLine = content.split('\n').find((l: string) => l.trim())
    const extractedTitle = firstLine?.replace(/^#+\s*/, '').trim() || pageTitle

    const finalContent = `Source: ${url}\n\n${content}`

    return NextResponse.json({
      title: extractedTitle,
      content: finalContent,
      url,
      charCount: finalContent.length,
    })

  } catch (err) {
    console.error('URL extraction error:', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to extract content'
    }, { status: 500 })
  }
}