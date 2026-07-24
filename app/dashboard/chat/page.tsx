'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  Send, Bot, Loader2, Plus, Mic,
  MessageSquare, Pencil, Trash2, Check, X,
  Search, Pin, Image, Camera
} from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  image?: string
}

type ChatSession = {
  id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
  pinned?: boolean
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<{ name: string; school: string; id: string } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [longPressId, setLongPressId] = useState<string | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showPlusMenu, setShowPlusMenu] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'

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
      // Auto-focus input on mount
      setTimeout(() => inputRef.current?.focus(), 300)
    }
    init()
  }, [fetchSessions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (showHistory && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 200)
    }
  }, [showHistory])

  const createNewSession = async () => {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase
      .from('chat_sessions')
      .insert({ user_id: profile.id, title: 'New Chat', messages: [] })
      .select().single()
    if (data) {
      setSessions(prev => [data, ...prev])
      setActiveSessionId(data.id)
      setMessages([])
      setShowHistory(false)
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }

  const loadSession = (session: ChatSession) => {
    setActiveSessionId(session.id)
    setMessages(session.messages || [])
    setShowHistory(false)
    setLongPressId(null)
    setTimeout(() => inputRef.current?.focus(), 200)
  }

  const saveMessages = useCallback(async (
    sessionId: string,
    newMessages: Message[],
    firstUserMsg?: string
  ) => {
    const supabase = createClient()
    const updateData: Record<string, unknown> = {
      messages: newMessages,
      updated_at: new Date().toISOString(),
    }
    if (firstUserMsg) {
      updateData.title = firstUserMsg.substring(0, 50) + (firstUserMsg.length > 50 ? '...' : '')
    }
    await supabase.from('chat_sessions').update(updateData).eq('id', sessionId)
    await fetchSessions()
  }, [fetchSessions])

  const deleteSession = async (id: string) => {
    const supabase = createClient()
    await supabase.from('chat_sessions').delete().eq('id', id)
    if (activeSessionId === id) {
      setActiveSessionId(null)
      setMessages([])
    }
    setLongPressId(null)
    await fetchSessions()
  }

  const renameSession = async (id: string) => {
    if (!editTitle.trim()) return
    const supabase = createClient()
    await supabase.from('chat_sessions').update({ title: editTitle.trim() }).eq('id', id)
    setEditingId(null)
    setEditTitle('')
    setLongPressId(null)
    await fetchSessions()
  }

  const togglePin = async (id: string, pinned: boolean) => {
    const supabase = createClient()
    await supabase.from('chat_sessions').update({ pinned: !pinned }).eq('id', id)
    setLongPressId(null)
    await fetchSessions()
  }

  const handleLongPressStart = (id: string) => {
    const timer = setTimeout(() => setLongPressId(id), 500)
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }

  const sendMessage = async () => {
    const userMessage = input.trim()
    if ((!userMessage && !imagePreview) || loading) return

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
    const newMsg: Message = { role: 'user', content: userMessage }
    if (imagePreview) newMsg.image = imagePreview
    setImagePreview(null)

    const newMessages: Message[] = [...messages, newMsg]
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
          message: userMessage || 'Describe this image',
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
      throw new Error('No response')
    }

    try {
      const response = await tryFetch()
      const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: response }]
      setMessages(finalMessages)
      if (sessionId) {
        await saveMessages(sessionId, finalMessages, isFirstMessage ? userMessage : undefined)
      }
    } catch {
      try {
        const fallbackRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage, school: profile?.school || 'ISAP', conversationHistory: [] }),
        })
        const fallbackData = await fallbackRes.json()
        if (fallbackData.response) {
          const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: fallbackData.response }]
          setMessages(finalMessages)
          if (sessionId) await saveMessages(sessionId, finalMessages, isFirstMessage ? userMessage : undefined)
        }
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue — please resend!' }])
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

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
    setShowPlusMenu(false)
  }

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;">$1</code>')
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

  const filteredSessions = sessions.filter(s =>
    !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const pinnedSessions = filteredSessions.filter(s => s.pinned)
  const recentSessions = filteredSessions.filter(s => !s.pinned)

  const groupedRecent = recentSessions.reduce((groups: Record<string, ChatSession[]>, s) => {
    const label = formatDate(s.updated_at)
    if (!groups[label]) groups[label] = []
    groups[label].push(s)
    return groups
  }, {})

  const SUGGESTED = [
    'What courses does this school offer?',
    'How much is the tuition fee?',
    'Enrollment requirements?',
    'Where is the Registrar?',
  ]

  return (
    <div className="flex flex-col relative" style={{ height: 'calc(100dvh - 56px)', backgroundColor: 'var(--bg)' }}>

      {/* ── HISTORY OVERLAY ── */}
      {showHistory && (
        <div
          className="absolute inset-0 z-50 flex flex-col"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          {/* History header */}
          <div className="flex items-center justify-between px-4 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-base font-bold" style={{ color: 'var(--text)' }}>Chat history</p>
            <button
              onClick={() => { setShowHistory(false); setSearchQuery(''); setLongPressId(null) }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-all"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* New chat button */}
          <button
            onClick={createNewSession}
            className="flex items-center gap-3 mx-4 mt-3 px-4 py-3 rounded-2xl transition-all hover:bg-black/5"
            style={{ border: '1px solid var(--border)' }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: accentColor }}>
              <Plus size={18} className="text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>New chat</span>
          </button>

          {/* Search */}
          <div className="px-4 mt-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
              style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
              <Search size={16} style={{ color: 'var(--text-faint)' }} />
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="flex-1 text-sm bg-transparent focus:outline-none"
                style={{ color: 'var(--text)' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X size={14} style={{ color: 'var(--text-faint)' }} />
                </button>
              )}
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto px-4 mt-3 pb-6">

            {/* Pinned */}
            {pinnedSessions.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
                  style={{ color: 'var(--text-faint)' }}>📌 Pinned</p>
                {pinnedSessions.map(session => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={activeSessionId === session.id}
                    isLongPressed={longPressId === session.id}
                    isEditing={editingId === session.id}
                    editTitle={editTitle}
                    accentColor={accentColor}
                    onTap={() => longPressId ? setLongPressId(null) : loadSession(session)}
                    onLongPressStart={() => handleLongPressStart(session.id)}
                    onLongPressEnd={handleLongPressEnd}
                    onPin={() => togglePin(session.id, !!session.pinned)}
                    onRename={() => { setEditingId(session.id); setEditTitle(session.title); setLongPressId(null) }}
                    onDelete={() => deleteSession(session.id)}
                    onEditChange={setEditTitle}
                    onEditSave={() => renameSession(session.id)}
                    onEditCancel={() => { setEditingId(null); setLongPressId(null) }}
                    onDismissLongPress={() => setLongPressId(null)}
                  />
                ))}
              </div>
            )}

            {/* Recent grouped by date */}
            {Object.entries(groupedRecent).map(([label, groupSessions]) => (
              <div key={label} className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
                  style={{ color: 'var(--text-faint)' }}>{label}</p>
                {groupSessions.map(session => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={activeSessionId === session.id}
                    isLongPressed={longPressId === session.id}
                    isEditing={editingId === session.id}
                    editTitle={editTitle}
                    accentColor={accentColor}
                    onTap={() => longPressId ? setLongPressId(null) : loadSession(session)}
                    onLongPressStart={() => handleLongPressStart(session.id)}
                    onLongPressEnd={handleLongPressEnd}
                    onPin={() => togglePin(session.id, !!session.pinned)}
                    onRename={() => { setEditingId(session.id); setEditTitle(session.title); setLongPressId(null) }}
                    onDelete={() => deleteSession(session.id)}
                    onEditChange={setEditTitle}
                    onEditSave={() => renameSession(session.id)}
                    onEditCancel={() => { setEditingId(null); setLongPressId(null) }}
                    onDismissLongPress={() => setLongPressId(null)}
                  />
                ))}
              </div>
            ))}

            {filteredSessions.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare size={32} className="mx-auto mb-3" style={{ color: 'var(--text-faint)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {searchQuery ? 'No chats found' : 'No chat history yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ backgroundColor: 'var(--bg)', borderBottom: messages.length > 0 ? '1px solid var(--border)' : 'none' }}>

        {/* History icon — Gemini style */}
        <button
          onClick={() => setShowHistory(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-black/5 relative"
          style={{ color: 'var(--text-muted)' }}
          title="Chat history"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <line x1="9" y1="10" x2="15" y2="10"/>
            <line x1="9" y1="14" x2="13" y2="14"/>
          </svg>
          {sessions.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: accentColor }}>
              {sessions.length > 9 ? '9+' : sessions.length}
            </span>
          )}
        </button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: isISAP ? '#fee2e2' : '#dbeafe' }}>
            <Bot size={14} style={{ color: accentColor }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
            Campus AI
          </p>
        </div>

        {/* New chat */}
        <button
          onClick={createNewSession}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-black/5"
          style={{ color: 'var(--text-muted)' }}
          title="New chat"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Welcome */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-5 pb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: isISAP ? '#fee2e2' : '#dbeafe' }}>
              <Bot size={32} style={{ color: accentColor }} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1.5" style={{ color: 'var(--text)' }}>
                Hi {profile?.name?.split(' ')[0] || 'there'}! 👋
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Ask me anything
              </p>
            </div>

            {/* Suggestion chips — horizontal scroll like Gemini */}
            <div className="w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-2 px-1" style={{ width: 'max-content' }}>
                {SUGGESTED.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); inputRef.current?.focus() }}
                    className="px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all hover:shadow-sm"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1"
                style={{ backgroundColor: isISAP ? '#fee2e2' : '#dbeafe' }}>
                <Bot size={14} style={{ color: accentColor }} />
              </div>
            )}
            <div className="max-w-[80%] space-y-1">
              {msg.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={msg.image} alt="uploaded" className="rounded-2xl max-w-full"
                  style={{ maxHeight: 200, objectFit: 'cover' }} />
              )}
              {msg.content && (
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
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
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} style={{ lineHeight: '1.6' }} />
                  ) : (
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  )}
                </div>
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
              style={{ backgroundColor: isISAP ? '#fee2e2' : '#dbeafe' }}>
              <Bot size={14} style={{ color: accentColor }} />
            </div>
            <div className="rounded-2xl px-4 py-3 border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderBottomLeftRadius: '6px' }}>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: accentColor, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── INPUT AREA — Gemini style ── */}
      <div className="shrink-0 px-3 pb-4 pt-2" style={{ backgroundColor: 'var(--bg)' }}>

        {/* Image preview */}
        {imagePreview && (
          <div className="relative mb-2 w-16 h-16 ml-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="preview" className="w-16 h-16 rounded-xl object-cover" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center"
            >
              <X size={10} className="text-white" />
            </button>
          </div>
        )}

        {/* Input box */}
        <div className="rounded-3xl border flex flex-col overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

          {/* Text area */}
          <div className="px-4 pt-3 pb-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              autoFocus
              className="w-full text-sm resize-none focus:outline-none bg-transparent"
              style={{ color: 'var(--text)', lineHeight: '1.5', maxHeight: '120px' }}
            />
          </div>

          {/* Bottom row — Plus | spacer | Mic/Send */}
          <div className="flex items-center justify-between px-2 pb-2">

            {/* Plus button */}
            <div className="relative">
              <button
                onClick={() => setShowPlusMenu(m => !m)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-black/5"
                style={{ color: 'var(--text-muted)' }}
              >
                <Plus size={20} />
              </button>

              {/* Plus menu — image/camera options */}
              {showPlusMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPlusMenu(false)} />
                  <div className="absolute bottom-12 left-0 z-50 rounded-2xl border overflow-hidden shadow-xl"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', minWidth: 180 }}>
                    <button
                      onClick={() => { fileRef.current?.click(); setShowPlusMenu(false) }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold hover:bg-black/5 transition-all"
                      style={{ color: 'var(--text)' }}
                    >
                      <Image size={18} style={{ color: accentColor }} />
                      Upload image
                    </button>
                    <button
                      onClick={() => { cameraRef.current?.click(); setShowPlusMenu(false) }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold hover:bg-black/5 transition-all"
                      style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
                    >
                      <Camera size={18} style={{ color: accentColor }} />
                      Take photo
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right side — Mic or Send */}
            <div className="flex items-center gap-1">
              {!input.trim() && !imagePreview ? (
                /* Mic button when nothing typed */
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-black/5"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => {
                    // Web Speech API
                    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
                      const recognition = new SpeechRecognition()
                      recognition.lang = 'en-PH'
                      recognition.onresult = (e: { results: { transcript: string }[][] }) => {
                        const transcript = e.results[0][0].transcript
                        setInput(transcript)
                        inputRef.current?.focus()
                      }
                      recognition.start()
                    }
                  }}
                >
                  <Mic size={20} />
                </button>
              ) : (
                /* Send button when typing */
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ backgroundColor: accentColor }}
                >
                  {loading
                    ? <Loader2 size={16} className="text-white animate-spin" />
                    : <Send size={16} className="text-white" />
                  }
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-center mt-2" style={{ color: 'var(--text-faint)' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display: 'none' }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleImageFile} style={{ display: 'none' }} />
    </div>
  )
}

// ── Session Item Component ────────────────────────────────────────────────────
function SessionItem({
  session, isActive, isLongPressed, isEditing, editTitle, accentColor,
  onTap, onLongPressStart, onLongPressEnd,
  onPin, onRename, onDelete,
  onEditChange, onEditSave, onEditCancel,
  onDismissLongPress,
}: {
  session: ChatSession
  isActive: boolean
  isLongPressed: boolean
  isEditing: boolean
  editTitle: string
  accentColor: string
  onTap: () => void
  onLongPressStart: () => void
  onLongPressEnd: () => void
  onPin: () => void
  onRename: () => void
  onDelete: () => void
  onEditChange: (v: string) => void
  onEditSave: () => void
  onEditCancel: () => void
  onDismissLongPress: () => void
}) {
  return (
    <div className="relative mb-1">
      {isEditing ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            value={editTitle}
            onChange={e => onEditChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onEditSave(); if (e.key === 'Escape') onEditCancel() }}
            className="flex-1 text-sm rounded-xl px-3 py-2 focus:outline-none border"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
            autoFocus
          />
          <button onClick={onEditSave} className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor }}>
            <Check size={14} className="text-white" />
          </button>
          <button onClick={onEditCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5">
            <X size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      ) : (
        <>
          <button
            onMouseDown={onLongPressStart}
            onMouseUp={onLongPressEnd}
            onMouseLeave={onLongPressEnd}
            onTouchStart={onLongPressStart}
            onTouchEnd={e => { onLongPressEnd(); e.preventDefault(); onTap() }}
            onClick={onTap}
            className="w-full text-left px-3 py-3 rounded-2xl transition-all flex items-center gap-3"
            style={{
              backgroundColor: isActive ? (accentColor === '#dc2626' ? '#fee2e2' : '#dbeafe') : isLongPressed ? 'var(--bg)' : 'transparent',
              color: isActive ? accentColor : 'var(--text)',
            }}
          >
            <MessageSquare size={15} style={{ color: isActive ? accentColor : 'var(--text-faint)', flexShrink: 0 }} />
            <span className="text-sm truncate flex-1" style={{ fontWeight: isActive ? 600 : 400 }}>
              {session.title}
            </span>
            {session.pinned && <Pin size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />}
          </button>

          {/* Long press context menu */}
          {isLongPressed && (
            <>
              <div className="fixed inset-0 z-40" onClick={onDismissLongPress} />
              <div className="absolute left-0 right-0 z-50 rounded-2xl border overflow-hidden shadow-xl mt-1"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <button onClick={onPin}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold hover:bg-black/5"
                  style={{ color: 'var(--text)' }}>
                  <Pin size={16} style={{ color: 'var(--text-muted)' }} />
                  {session.pinned ? 'Unpin conversation' : 'Pin conversation'}
                </button>
                <button onClick={onRename}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold hover:bg-black/5"
                  style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}>
                  <Pencil size={16} style={{ color: 'var(--text-muted)' }} />
                  Rename conversation
                </button>
                <button onClick={onDelete}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold hover:bg-red-50"
                  style={{ color: '#dc2626', borderTop: '1px solid var(--border)' }}>
                  <Trash2 size={16} />
                  Delete conversation
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}