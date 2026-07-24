'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Send, Bot, User, Loader2, Trash2 } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<{ name: string; school: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'
  const accentBg = isISAP ? '#fee2e2' : '#dbeafe'

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('name, school')
        .eq('id', user.id)
        .single()
      if (data) setProfile(data)
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    const userMessage = input.trim()
    if (!userMessage || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    const history = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      content: m.content,
    }))

    const tryFetch = async (retryCount = 0): Promise<string> => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          school: profile?.school || 'ISAP',
          conversationHistory: history,
        }),
      })

      const data = await res.json()

      if (data.response) return data.response

      if (retryCount < 2) {
        await new Promise(r => setTimeout(r, 1000))
        return tryFetch(retryCount + 1)
      }

      throw new Error(data.error || 'No response')
    }

    try {
      const response = await tryFetch()
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch {
      // Final fallback — try one more time with a simpler request
      try {
        const fallbackRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            school: profile?.school || 'ISAP',
            conversationHistory: [],
          }),
        })
        const fallbackData = await fallbackRes.json()
        if (fallbackData.response) {
          setMessages(prev => [...prev, { role: 'assistant', content: fallbackData.response }])
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'I had a connection issue. Please resend your message and I\'ll answer right away!'
          }])
        }
      } catch {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Connection issue. Please resend your message!'
        }])
      }
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => setMessages([])

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;">$1</code>')
      .replace(/^### (.+)$/gm, '<p style="font-weight:700;font-size:14px;margin:12px 0 4px;">$1</p>')
      .replace(/^## (.+)$/gm, '<p style="font-weight:700;font-size:15px;margin:14px 0 6px;">$1</p>')
      .replace(/^# (.+)$/gm, '<p style="font-weight:700;font-size:16px;margin:16px 0 8px;">$1</p>')
      .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0;"><span>•</span><span>$1</span></div>')
      .replace(/^\d+\. (.+)$/gm, (_, p1, offset, str) => {
        const linesBefore = str.substring(0, offset).split('\n')
        const num = linesBefore.filter((l: string) => /^\d+\./.test(l)).length + 1
        return `<div style="display:flex;gap:8px;margin:3px 0;"><span style="min-width:16px;">${num}.</span><span>${p1}</span></div>`
      })
      .split('\n\n')
      .map((para: string) => para.trim() ? `<p style="margin:8px 0;">${para}</p>` : '')
      .join('')
  }

  const SUGGESTED = [
    'What courses does this school offer?',
    'How much is the tuition fee?',
    'What are the enrollment requirements?',
    'Where is the Registrar Office?',
  ]

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: accentBg }}>
            <Bot size={18} style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              Campus AI Assistant
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
              Powered by Gemini · Can answer anything
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-black/5 transition-all"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Welcome */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: accentBg }}>
              <Bot size={32} style={{ color: accentColor }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                Hi {profile?.name?.split(' ')[0] || 'there'}! 👋
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                I can answer anything — campus questions, homework, general knowledge, or just chat.
              </p>
            </div>

            {/* Suggested questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="text-left px-4 py-3 rounded-2xl border text-xs font-semibold transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

            {/* AI avatar */}
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1"
                style={{ backgroundColor: accentBg }}>
                <Bot size={14} style={{ color: accentColor }} />
              </div>
            )}

            {/* Bubble */}
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={msg.role === 'user' ? {
                backgroundColor: accentColor,
                color: '#ffffff',
                borderBottomRightRadius: '6px',
              } : {
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderBottomLeftRadius: '6px',
              }}
            >
              {msg.role === 'assistant' ? (
                <div
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  style={{ lineHeight: '1.6' }}
                />
              ) : (
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              )}
            </div>

            {/* User avatar */}
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1 text-white text-xs font-bold"
                style={{ backgroundColor: accentColor }}>
                {profile?.name?.charAt(0)?.toUpperCase() || <User size={14} />}
              </div>
            )}
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: accentBg }}>
              <Bot size={14} style={{ color: accentColor }} />
            </div>
            <div className="rounded-2xl px-4 py-3 border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderBottomLeftRadius: '6px' }}>
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" style={{ color: accentColor }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t shrink-0"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-end gap-2 rounded-2xl border px-4 py-3"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            rows={1}
            className="flex-1 text-sm resize-none focus:outline-none bg-transparent"
            style={{
              color: 'var(--text)',
              lineHeight: '1.5',
              maxHeight: '120px',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            {loading
              ? <Loader2 size={15} className="text-white animate-spin" />
              : <Send size={15} className="text-white" />
            }
          </button>
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-faint)' }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}