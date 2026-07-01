'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Send, Bot, User, Sparkles } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'model'
  content: string
  timestamp: Date
}

type Profile = { name: string; school: string }

const quickQuestions = [
  'How much is the tuition fee?',
  'What courses are available?',
  'Where is the Registrar Office?',
  'How do I enroll?',
  'Where is the Cashier Office?',
  'What scholarships are available?',
]

function renderMessage(content: string, isISAP: boolean, isUser: boolean) {
  const lines = content.split('\n')

  return lines.map((line, i) => {
    const trimmed = line.trim()

    if (!trimmed) return <div key={i} className="h-1.5" />

    if (trimmed.match(/^\d(st|nd|rd|th)\s+Year$/i)) {
      return (
        <p key={i} className={`text-xs font-bold uppercase tracking-widest mt-3 mb-1
          ${isUser ? 'text-slate-300' : isISAP ? 'text-red-500' : 'text-blue-500'}`}>
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
          <div key={i} className={`flex items-center justify-between py-1.5 border-b last:border-0
            ${isUser ? 'border-slate-600' : 'border-slate-100'}`}>
            <span className={`text-xs ${isUser ? 'text-slate-300' : 'text-slate-500'}`}>
              {label}
            </span>
            <span className={`text-xs font-bold ml-4 ${isUser ? 'text-white' : 'text-slate-800'}`}>
              {value}
            </span>
          </div>
        )
      }
    }

    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      const clean = trimmed.replace(/^[-•]\s*/, '')
      return (
        <div key={i} className="flex items-start gap-2 py-0.5">
          <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0
            ${isUser ? 'bg-slate-400' : isISAP ? 'bg-red-400' : 'bg-blue-400'}`}
          />
          <span className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-700'}`}>
            {clean}
          </span>
        </div>
      )
    }

    return (
      <p key={i} className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-slate-800'}`}>
        {trimmed}
      </p>
    )
  })
}

export default function ChatPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const newId = () => crypto.randomUUID()

  useEffect(() => {
    const getProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles').select('name, school').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setMessages([{
          id: 'welcome',
          role: 'model',
          content: `Hi ${data.name}!\n\nI am your Smart Campus Help Desk Assistant for ${
            data.school === 'MCNP'
              ? 'Medical Colleges of Northern Philippines'
              : 'International School of Asia and the Pacific'
          }.\n\nI can help you with:\n- Course and program information\n- Tuition fees per year level\n- Office locations and directions\n- Enrollment requirements\n- Scholarships and grants\n- General campus inquiries\n\nWhat can I help you with today?`,
          timestamp: new Date()
        }])
      }
      setProfileLoading(false)
    }
    getProfile()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !profile) return

    const userMessage: Message = {
      id: newId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          school: profile.school,
          conversationHistory
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const aiMessage: Message = {
        id: newId(),
        role: 'model',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      const errorMessage: Message = {
        id: newId(),
        role: 'model',
        content: 'Sorry, I encountered an error. Please try again in a moment.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const isISAP = profile?.school === 'ISAP'
  const accentBg = isISAP ? 'bg-red-500' : 'bg-blue-500'
  const accentLight = isISAP ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
  const accentText = isISAP ? 'text-red-600' : 'text-blue-600'
  const accentBtn = isISAP ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
  const quickBtnClass = isISAP
    ? 'bg-red-50 border border-red-100 text-red-700 hover:bg-red-100'
    : 'bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100'

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">

      {/* Header */}
      <div className={`rounded-2xl border p-4 mb-4 flex items-center gap-3 ${accentLight}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accentBg}`}>
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">Campus AI Assistant</p>
          <p className={`text-xs font-medium ${accentText}`}>
            {profile?.school} · Powered by Gemini AI
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5
              ${message.role === 'model' ? accentBg : 'bg-slate-700'}`}>
              {message.role === 'model'
                ? <Bot size={15} className="text-white" />
                : <User size={15} className="text-white" />
              }
            </div>

            <div className={`max-w-[78%] rounded-2xl px-4 py-3 space-y-0.5
              ${message.role === 'model'
                ? 'bg-white border border-slate-100 rounded-tl-sm shadow-sm'
                : 'bg-slate-800 rounded-tr-sm'
              }`}>
              {renderMessage(message.content, isISAP, message.role === 'user')}
              <p className={`text-[10px] mt-2 ${
                message.role === 'model' ? 'text-slate-300' : 'text-slate-400'
              }`}>
                {message.timestamp.toLocaleTimeString('en-PH', {
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading bubble */}
        {loading && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${accentBg}`}>
              <Bot size={15} className="text-white" />
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

      {/* Quick questions */}
      {messages.length === 1 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={12} className={accentText} />
            <p className="text-xs font-semibold text-slate-400">Quick questions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className={`text-xs font-medium px-3 py-1.5 rounded-xl transition-all ${quickBtnClass}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about campus..."
          disabled={loading}
          className="flex-1 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none disabled:opacity-50 bg-transparent"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 shrink-0 ${accentBtn}`}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}