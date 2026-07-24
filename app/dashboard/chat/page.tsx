'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  Send, Bot, Loader2, Trash2, Plus,
  MessageSquare, Pencil, Check, X
} from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatSession = {
  id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<{ name: string; school: string; id: string } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'
  const accentBg = isISAP ? '#fee2e2' : '#dbeafe'

  // ── Fetch sessions ──────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
    setSessions(data || [])
  }, [])

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles').select('name, school, id').eq('id', user.id).single()
      if (data) setProfile({ ...data, id: user.id })
      await fetchSessions()
    }
    init()
  }, [fetchSessions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Create new session ──────────────────────────────────────────────────
  const createNewSession = async () => {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: profile.id,
        title: 'New Chat',
        messages: [],
      })
      .select().single()
    if (data) {
      setSessions(prev => [data, ...prev])
      setActiveSessionId(data.id)
      setMessages([])
    }
  }

  // ── Load session ─────────────────────────────────────────────────────────
  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id)
    setMessages(session.messages || [])
    setDeleteConfirmId(null)
    setEditingId(null)
  }

  // ── Auto-save messages to DB ─────────────────────────────────────────────
  const saveMessages = useCallback(async (
    sessionId: string,
    newMessages: Message[],
    firstUserMsg?: string
  ) => {
    const supabase = createClient()
    const title = firstUserMsg
      ? firstUserMsg.substring(0, 50) + (firstUserMsg.length > 50 ? '...' : '')
      : undefined

    const updateData: Record<string, unknown> = {
      messages: newMessages,
      updated_at: new Date().toISOString(),
    }
    if (title) updateData.title = title

    await supabase.from('chat_sessions').update(updateData).eq('id', sessionId)
    await fetchSessions()
  }, [fetchSessions])

  // ── Delete session ───────────────────────────────────────────────────────
  const deleteSession = async (id: string) => {
    const supabase = createClient()
    await supabase.from('chat_sessions').delete().eq('id', id)
    if (activeSessionId === id) {
      setActiveSessionId(null)
      setMessages([])
    }
    setDeleteConfirmId(null)
    await fetchSessions()
  }

  // ── Rename session ───────────────────────────────────────────────────────
  const renameSession = async (id: string) => {
    if (!editTitle.trim()) return
    const supabase = createClient()
    await supabase.from('chat_sessions').update({ title: editTitle.trim() }).eq('id', id)
    setEditingId(null)
    setEditTitle('')
    await fetchSessions()
  }

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const userMessage = input.trim()
    if (!userMessage || loading) return

    // Create session if none active
    let sessionId = activeSessionId
    if (!sessionId) {
      if (!profile) return
      const supabase = createClient()
      const { data } = await supabase
        .from('chat_sessions')
        .insert({ user_id: profile.id, title: 'New Chat', messages: [] })
        .select().single()
      if (!data) return
      sessionId = data.id
      setActiveSessionId(sessionId)
      setSessions(prev => [data, ...prev])
    }

    setInput('')
    const isFirstMessage = messages.length === 0
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
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
      const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: response }]
      setMessages(finalMessages)
      if (sessionId) {
        await saveMessages(
          sessionId,
          finalMessages,
          isFirstMessage ? userMessage : undefined
        )
      }
    } catch {
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
          const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: fallbackData.response }]
          setMessages(finalMessages)
          if (sessionId) await saveMessages(sessionId, finalMessages, isFirstMessage ? userMessage : undefined)
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Connection issue — please resend your message!'
          }])
        }
      } catch {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Connection issue — please resend your message!'
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

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;">$1</code>')
      .replace(/^### (.+)$/gm, '<p style="font-weight:700;font-size:14px;margin:12px 0 4px;">$1</p>')
      .replace(/^## (.+)$/gm, '<p style="font-weight:700;font-size:15px;margin:14px 0 6px;">$1</p>')
      .replace(/^# (.+)$/gm, '<p style="font-weight:700;font-size:16px;margin:16px 0 8px;">$1</p>')
      .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0;"><span>•</span><span>$1</span></div>')
      .split('\n\n')
      .map((para: string) => para.trim() ? `<p style="margin:8px 0;">${para}</p>` : '')
      .join('')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups: Record<string, ChatSession[]>, session) => {
    const label = formatDate(session.updated_at)
    if (!groups[label]) groups[label] = []
    groups[label].push(session)
    return groups
  }, {})

  const SUGGESTED = [
    'What courses does this school offer?',
    'How much is the tuition fee?',
    'What are the enrollment requirements?',
    'Where is the Registrar Office?',
  ]

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* ── SIDEBAR ── */}
      <div
        className="shrink-0 flex flex-col border-r transition-all duration-300 overflow-hidden"
        style={{
          width: sidebarOpen ? '260px' : '0px',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar header */}
            <div className="px-3 py-3 border-b flex items-center justify-between shrink-0"
              style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
                Chat History
              </p>
              <button
                onClick={createNewSession}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-black/5"
                style={{ color: 'var(--text-muted)' }}
                title="New Chat"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto py-2">
              {sessions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <MessageSquare size={20} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>No chats yet</p>
                </div>
              ) : (
                Object.entries(groupedSessions).map(([label, groupSessions]) => (
                  <div key={label}>
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-faint)' }}>
                      {label}
                    </p>
                    {groupSessions.map(session => (
                      <div key={session.id}
                        className="group relative mx-2 mb-0.5"
                      >
                        {editingId === session.id ? (
                          <div className="flex items-center gap-1 px-2 py-1.5">
                            <input
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') renameSession(session.id)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                              className="flex-1 text-xs rounded-lg px-2 py-1 focus:outline-none border"
                              style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                              autoFocus
                            />
                            <button onClick={() => renameSession(session.id)}
                              className="w-6 h-6 flex items-center justify-center text-emerald-600">
                              <Check size={12} />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="w-6 h-6 flex items-center justify-center"
                              style={{ color: 'var(--text-faint)' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => loadSession(session)}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all"
                            style={{
                              backgroundColor: activeSessionId === session.id
                                ? isISAP ? '#fee2e2' : '#dbeafe'
                                : 'transparent',
                              color: activeSessionId === session.id
                                ? accentColor
                                : 'var(--text-muted)',
                              fontWeight: activeSessionId === session.id ? 600 : 400,
                            }}
                          >
                            <p className="truncate leading-snug">{session.title}</p>
                          </button>
                        )}

                        {/* Hover actions */}
                        {editingId !== session.id && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5">
                            {deleteConfirmId === session.id ? (
                              <>
                                <button onClick={() => deleteSession(session.id)}
                                  className="text-[10px] font-bold text-red-600 px-1.5 py-0.5 rounded bg-red-50">
                                  Del
                                </button>
                                <button onClick={() => setDeleteConfirmId(null)}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ color: 'var(--text-faint)' }}>
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={e => { e.stopPropagation(); setEditingId(session.id); setEditTitle(session.title) }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-black/10 transition-all"
                                  style={{ color: 'var(--text-faint)' }}
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); setDeleteConfirmId(session.id) }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 transition-all"
                                  style={{ color: 'var(--text-faint)' }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── MAIN CHAT AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Chat header */}
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-black/5"
              style={{ color: 'var(--text-muted)' }}
              title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                {sidebarOpen && <line x1="15" y1="9" x2="12" y2="12"/>}
                {sidebarOpen && <line x1="12" y1="12" x2="15" y2="15"/>}
              </svg>
            </button>

            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: accentBg }}>
              <Bot size={16} style={{ color: accentColor }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                Campus AI Assistant
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                Powered by Gemini · Answers anything
              </p>
            </div>
          </div>

          <button
            onClick={createNewSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-black/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Plus size={13} />
            New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* Welcome screen */}
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
                  Ask me anything — campus questions, homework, or general knowledge.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTED.map((q, i) => (
                  <button key={i}
                    onClick={() => { setInput(q); inputRef.current?.focus() }}
                    className="text-left px-4 py-3 rounded-2xl border text-xs font-semibold transition-all hover:shadow-sm"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1"
                  style={{ backgroundColor: accentBg }}>
                  <Bot size={14} style={{ color: accentColor }} />
                </div>
              )}
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
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1 text-white text-xs font-bold"
                  style={{ backgroundColor: accentColor }}>
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
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
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: accentColor, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
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
              style={{ color: 'var(--text)', lineHeight: '1.5', maxHeight: '120px' }}
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
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}