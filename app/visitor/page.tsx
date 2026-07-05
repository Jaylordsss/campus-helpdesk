'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, Bot, BookOpen, CreditCard,
  MapPin, HelpCircle, MessageSquare, Send,
  Sparkles, User, ChevronDown, ChevronUp,
  Clock, Megaphone, Bell, ArrowDown,
  Maximize2, Minimize2
} from 'lucide-react'

const quickQuestions = [
  'What courses does ISAP offer?',
  'What courses does MCNP offer?',
  'How much is the tuition fee?',
  'What are the enrollment requirements?',
  'Where is the Registrar Office?',
  'What scholarships are available?',
]

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

type CourseData = {
  name: string
  description: string
  duration: string
  school: string
  has_intersession: boolean
}

type TuitionData = {
  id: string
  course_name: string
  year_level: string
  semester: string
  amount: number
  school: string
  course_id: string
}

type LocationData = {
  id: string
  office_name: string
  building: string
  room: string
  school: string
}

type FAQData = {
  id: string
  question: string
  answer: string
  category: string
}

type AnnouncementData = {
  id: string
  title: string
  content: string
  type: string
  school: string
  created_at: string
  expires_at: string | null
}

function renderMessage(content: string) {
  const lines = content.split('\n')
  return lines.map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={i} className="h-1.5" />
    if (trimmed.match(/^\d(st|nd|rd|th)\s+Year$/i)) {
      return (
        <p key={i} className="text-xs font-bold uppercase tracking-widest mt-3 mb-1 text-slate-500">
          {trimmed}
        </p>
      )
    }
    if ((trimmed.startsWith('-') || trimmed.startsWith('•')) && trimmed.includes(':')) {
      const clean = trimmed.replace(/^[-•]\s*/, '')
      const colonIndex = clean.indexOf(':')
      const label = clean.substring(0, colonIndex).trim()
      const value = clean.substring(colonIndex + 1).trim()
      if (label && value) {
        return (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-bold text-slate-800 ml-4">{value}</span>
          </div>
        )
      }
    }
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      const clean = trimmed.replace(/^[-•]\s*/, '')
      return (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          <span className="text-sm text-slate-700 leading-relaxed">{clean}</span>
        </div>
      )
    }
    return <p key={i} className="text-sm leading-relaxed text-slate-800">{trimmed}</p>
  })
}

const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
  urgent: { label: 'Urgent', bg: 'bg-red-100', text: 'text-red-700' },
  enrollment: { label: 'Enrollment', bg: 'bg-blue-100', text: 'text-blue-700' },
  event: { label: 'Event', bg: 'bg-violet-100', text: 'text-violet-700' },
  holiday: { label: 'Holiday', bg: 'bg-amber-100', text: 'text-amber-700' },
  general: { label: 'Announcement', bg: 'bg-slate-100', text: 'text-slate-700' },
}

function InstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!installPrompt || installed) return null

  return (
    <div className="mx-4 mb-4 bg-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-xl">📱</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Install App</p>
          <p className="text-xs text-slate-400 mt-0.5">Add to home screen · works offline</p>
        </div>
      </div>
      <button
        onClick={async () => {
          if (!installPrompt) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (installPrompt as any).prompt()
          setInstallPrompt(null)
        }}
        className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-xl shrink-0"
      >
        Install
      </button>
    </div>
  )
}

export default function VisitorPage() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: 'Hello! Welcome to the Smart Campus Help Desk for ISAP and MCNP.\n\nI can help you with:\n- Course and program information\n- Tuition fees\n- Enrollment requirements\n- Office locations\n- Scholarships and grants\n- General campus questions\n\nWhat would you like to know?',
      timestamp: new Date(0)
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [sectionSchool, setSectionSchool] = useState<'ISAP' | 'MCNP'>('ISAP')
  const [sectionData, setSectionData] = useState<Record<string, unknown>[]>([])
  const [sectionLoading, setSectionLoading] = useState(false)
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [chatExpanded, setChatExpanded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (chatExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, chatExpanded])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { createClient } = await import('@/src/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3)
      const valid = (data || []).filter((a: AnnouncementData) =>
        !a.expires_at || new Date(a.expires_at) >= new Date()
      )
      setAnnouncements(valid)
    }
    fetchAnnouncements()
  }, [])

  const fetchSectionData = useCallback(async (section: string, school: string) => {
    setSectionLoading(true)
    setSectionData([])
    const { createClient } = await import('@/src/lib/supabase/client')
    const supabase = createClient()

    if (section === 'courses') {
      const { data } = await supabase.from('courses').select('name, description, duration, school, has_intersession').eq('school', school).order('name')
      setSectionData((data || []) as unknown as Record<string, unknown>[])
    } else if (section === 'tuition') {
      const { data: courses } = await supabase.from('courses').select('id, name').eq('school', school)
      const { data: tuition } = await supabase.from('tuition').select('*').eq('school', school)
      const map: Record<string, string> = {}
      courses?.forEach((c: { id: string; name: string }) => { map[c.id] = c.name })
      const merged = (tuition || []).map((t: Record<string, unknown>) => ({ ...t, course_name: map[t.course_id as string] || 'Unknown' }))
      setSectionData(merged)
    } else if (section === 'locations') {
      const { data } = await supabase.from('locations').select('id, office_name, building, room, school').order('school').order('office_name')
      setSectionData((data || []) as unknown as Record<string, unknown>[])
    } else if (section === 'faq') {
      const { data } = await supabase.from('faq').select('id, question, answer, category').or(`school.eq.${school},school.eq.BOTH`).order('category')
      setSectionData((data || []) as unknown as Record<string, unknown>[])
    }
    setSectionLoading(false)
  }, [])

  useEffect(() => {
    if (!activeSection) return
    fetchSectionData(activeSection, sectionSchool)
  }, [activeSection, sectionSchool, fetchSectionData])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setChatExpanded(true)
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/visitor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() })
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        content: data.response || 'Sorry, I could not process that. Please try again.',
        timestamp: new Date()
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const formatTime = (date: Date) => {
    if (!mounted) return ''
    return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }

  const timeAgo = (date: string) => {
    const diff = new Date().getTime() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sections = [
    { id: 'courses', label: 'Courses', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'tuition', label: 'Tuition Fees', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'locations', label: 'Offices', icon: MapPin, color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'faq', label: 'FAQs', icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Sticky Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-100 to-blue-100 rounded-xl flex items-center justify-center">
              <GraduationCap size={16} className="text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Smart Campus Help Desk</p>
              <p className="text-[10px] text-slate-400">ISAP & MCNP · Visitor Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
            >
              Log in
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded-xl transition-all"
            >
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION — full viewport height ── */}
      <section
        ref={chatRef}
        className={`flex flex-col transition-all duration-300 ${
          fullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : ''
        }`}
        style={!fullscreen ? { minHeight: 'calc(100vh - 52px)' } : { height: '100vh' }}
      >
        <div className={`flex flex-col w-full ${
          fullscreen
            ? 'flex-1 p-0 overflow-hidden'
            : 'flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-8'
        }`}>
          {/* Welcome hero text — only show when no conversation yet and not fullscreen */}
          {!chatExpanded && !fullscreen && (
            <div className="text-center mb-8 mt-4">
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                  <span className="text-xs font-bold text-red-700">ISAP</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span className="text-xs font-bold text-blue-700">MCNP</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                How can I help you?
              </h1>
              <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
                Ask anything about courses, tuition, enrollment, and campus life. No account needed.
              </p>
            </div>
          )}

          {/* Chat box */}
          <div className={`flex flex-col bg-white overflow-hidden ${
            fullscreen
              ? 'flex-1 rounded-none border-none h-full'
              : 'flex-1 rounded-2xl border border-slate-200 shadow-sm'
          }`}>

            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
              <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Campus AI Assistant</p>
                <p className="text-[10px] text-slate-400">Powered by Gemini AI · ISAP & MCNP</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs text-slate-400 font-medium">Online</span>
                </div>
                <button
                  onClick={() => setFullscreen(f => !f)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-all"
                  title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {fullscreen
                    ? <Minimize2 size={15} className="text-slate-500" />
                    : <Maximize2 size={15} className="text-slate-500" />
                  }
                </button>
              </div>
            </div>

            {/* Messages — grows to fill space */}
            <div
              className="flex-1 overflow-y-auto p-5 space-y-4"
              style={{
                flex: fullscreen ? '1' : undefined,
                minHeight: fullscreen ? '0' : chatExpanded ? '280px' : '200px',
                maxHeight: fullscreen ? 'none' : chatExpanded ? '420px' : '220px',
                overflowY: 'auto',
                backgroundColor: '#f8fafc',
              }}
            >
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'ai' ? 'bg-slate-800' : 'bg-slate-700'
                  }`}>
                    {msg.role === 'ai'
                      ? <Bot size={14} className="text-white" />
                      : <User size={14} className="text-white" />
                    }
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'ai'
                      ? 'bg-white border border-slate-100 rounded-tl-sm'
                      : 'bg-slate-800 rounded-tr-sm'
                  }`}>
                    {msg.role === 'ai'
                      ? renderMessage(msg.content)
                      : <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                    }
                    {mounted && msg.timestamp.getTime() !== 0 && (
                      <p className={`text-[10px] mt-1.5 ${
                        msg.role === 'ai' ? 'text-slate-300' : 'text-slate-400'
                      }`} suppressHydrationWarning>
                        {formatTime(msg.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick questions — only show before conversation starts */}
            {messages.length === 1 && !chatExpanded && (
              <div className="px-5 py-3 border-t border-slate-100 bg-white shrink-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={12} className="text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400">Try asking</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border border-slate-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-4 bg-white border-t border-slate-100 shrink-0">
              <form
                onSubmit={e => { e.preventDefault(); sendMessage(input) }}
                className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask anything about ISAP or MCNP..."
                  disabled={loading}
                  className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 bg-transparent"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-slate-800 hover:bg-slate-900 transition-all disabled:opacity-40 shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>

          {/* Scroll down indicator */}
          {!chatExpanded && !fullscreen && (
            <button
              onClick={scrollToContent}
              className="flex flex-col items-center gap-1 mt-6 text-slate-400 hover:text-slate-600 transition-all animate-bounce mx-auto"
            >
              <span className="text-xs font-medium">Explore Campus Info</span>
              <ArrowDown size={16} />
            </button>
          )}
        </div>
      </section>

      {/* ── CONTENT SECTION — appears when scrolling down ── */}
      <div ref={contentRef} className="bg-slate-50">

        {/* Announcements banner */}
        {announcements.length > 0 && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-2">
            {announcements.map(a => {
              const cfg = typeConfig[a.type] || typeConfig.general
              return (
                <div key={a.id} className={`rounded-xl px-4 py-3 flex items-start gap-3 ${cfg.bg}`}>
                  <Megaphone size={14} className={`shrink-0 mt-0.5 ${cfg.text}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
                      <span className="text-xs font-bold text-slate-700">{a.title}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{a.content}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(a.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* Explore sections */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Explore Campus Info
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sections.map(s => {
                const Icon = s.icon
                const isActive = activeSection === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(isActive ? null : s.id)}
                    className={`bg-white rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                      isActive ? 'border-slate-300 shadow-sm' : 'border-slate-100'
                    }`}
                  >
                    <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2.5`}>
                      <Icon size={17} className={s.color} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isActive ? 'Click to close' : 'Click to view'}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Section content */}
            {activeSection && (
              <div className="mt-4 bg-white rounded-2xl border border-slate-100 overflow-hidden">
                {activeSection !== 'locations' && (
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Show:</span>
                    {(['ISAP', 'MCNP'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setSectionSchool(s)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          sectionSchool === s
                            ? s === 'ISAP' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-5">
                  {sectionLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                    </div>
                  ) : activeSection === 'courses' ? (
                    <div className="space-y-3">
                      {(sectionData as unknown as CourseData[]).map((c, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                            <BookOpen size={15} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{c.description}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-slate-400">{c.duration}</span>
                              {c.has_intersession && (
                                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                  Has intersession
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeSection === 'tuition' ? (
                    <div className="space-y-4">
                      {Array.from(new Set((sectionData as unknown as TuitionData[]).map(t => t.course_name))).map((courseName, ci) => {
                        const courseRecords = (sectionData as unknown as TuitionData[]).filter(t => t.course_name === courseName)
                        const yearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year']
                        const semOrder = ['1st Semester', '2nd Semester', 'Intersession']
                        const availableYears = yearOrder.filter(y => courseRecords.some(r => r.year_level === y))
                        const isISAPSchool = sectionSchool === 'ISAP'
                        const accentBg = isISAPSchool ? 'bg-red-50' : 'bg-blue-50'
                        const accentText = isISAPSchool ? 'text-red-700' : 'text-blue-700'
                        const accentBorder = isISAPSchool ? 'border-red-100' : 'border-blue-100'
                        return (
                          <div key={`course-${ci}`} className={`border ${accentBorder} rounded-2xl overflow-hidden`}>
                            <div className={`px-5 py-3 ${accentBg} border-b ${accentBorder}`}>
                              <p className={`text-sm font-bold ${accentText}`}>{courseName}</p>
                            </div>
                            {availableYears.map((year, yi) => {
                              const yearRecords = courseRecords
                                .filter(r => r.year_level === year)
                                .sort((a, b) => semOrder.indexOf(a.semester) - semOrder.indexOf(b.semester))
                              const regularTotal = yearRecords
                                .filter(r => r.semester !== 'Intersession')
                                .reduce((sum, r) => sum + Number(r.amount), 0)
                              return (
                                <div key={`year-${yi}`} className="border-b border-slate-50 last:border-0">
                                  <div className="px-5 py-2 bg-slate-50 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{year}</span>
                                    <span className="text-xs text-slate-400">
                                      Annual: <span className={`font-bold ${accentText}`}>₱{regularTotal.toLocaleString()}</span>
                                    </span>
                                  </div>
                                  {yearRecords.map((r, ri) => (
                                    <div key={`sem-${ri}`} className="flex items-center justify-between px-5 py-3 border-t border-slate-50 hover:bg-slate-50">
                                      <div className="flex items-center gap-2 pl-3">
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                          r.semester === 'Intersession' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                        }`}>{r.semester}</span>
                                      </div>
                                      <span className="text-sm font-bold text-slate-900">₱{Number(r.amount).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ) : activeSection === 'locations' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(sectionData as unknown as LocationData[]).map((l, i) => (
                        <div key={l.id || i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${l.school === 'ISAP' ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <MapPin size={15} className={l.school === 'ISAP' ? 'text-red-600' : 'text-blue-600'} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{l.office_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{l.building}</p>
                            {l.room && <p className="text-xs text-slate-400">{l.room}</p>}
                            <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${l.school === 'ISAP' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                              {l.school}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : activeSection === 'faq' ? (
                    <div className="space-y-2">
                      {(sectionData as unknown as FAQData[]).map((f, i) => (
                        <div key={f.id || i} className="border border-slate-100 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            className="w-full flex items-start justify-between gap-4 px-4 py-3.5 text-left hover:bg-slate-50"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${openFaq === i ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                <HelpCircle size={13} className={openFaq === i ? 'text-white' : 'text-slate-400'} />
                              </div>
                              <p className="text-sm font-semibold text-slate-800 leading-snug">{f.question}</p>
                            </div>
                            {openFaq === i ? <ChevronUp size={16} className="text-slate-400 shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-slate-400 shrink-0 mt-0.5" />}
                          </button>
                          {openFaq === i && (
                            <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                              <p className="text-sm text-slate-600 leading-relaxed pt-3">{f.answer}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Latest Announcements */}
          {announcements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                Latest Announcements
              </p>
              <div className="space-y-3">
                {announcements.map(a => {
                  const cfg = typeConfig[a.type] || typeConfig.general
                  return (
                    <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <Bell size={15} className={cfg.text} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{a.title}</p>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{a.content}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Clock size={11} className="text-slate-400" />
                            <p className="text-xs text-slate-400">{timeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* PWA Install */}
          <InstallBanner />

          {/* CTA */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={22} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Need more help?</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Create a free account to submit inquiries, track responses, view your full tuition schedule, and get personalized campus assistance.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => router.push('/signup')}
                className="bg-white text-slate-900 text-sm font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-all"
              >
                Create free account
              </button>
              <button
                onClick={() => router.push('/login')}
                className="text-slate-300 hover:text-white text-sm font-semibold px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-all"
              >
                Log in
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pb-4">
            <p className="text-xs text-slate-400">
              Smart Campus Help Desk · ISAP and MCNP
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Alimanao, Penablanca, Cagayan, Philippines
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}