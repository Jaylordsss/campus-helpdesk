'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Bot, Loader2, ChevronDown } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function VisitorPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/visitor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.response || 'Sorry, I could not answer that. Please try again.'
      }])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Connection issue. Please try again!'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (deferredPrompt as any).prompt()
    setDeferredPrompt(null)
    setShowInstall(false)
  }

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span>•</span><span>$1</span></div>')
      .replace(/^### (.+)$/gm, '<p style="font-weight:700;margin:10px 0 4px">$1</p>')
      .replace(/^## (.+)$/gm, '<p style="font-weight:700;margin:12px 0 4px">$1</p>')
      .split('\n\n')
      .map(p => p.trim() ? `<p style="margin:6px 0">${p}</p>` : '')
      .join('')
  }

  const SUGGESTIONS = [
    'What courses does ISAP offer?',
    'What courses does MCNP offer?',
    'How much is the tuition fee?',
    'Where is the campus located?',
  ]

  const hasMessages = messages.length > 0

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        backgroundColor: '#0f172a',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >

      {/* ── HEADER ── */}
      <div
        className="shrink-0 flex items-center justify-between"
        style={{
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
        }}
      >
        {/* Logo + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#dc2626,#2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>🎓</div>
          <div className="min-w-0">
            <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              Campus Help Desk
            </p>
            <p style={{ color: '#475569', fontSize: 11, lineHeight: 1.2 }}>ISAP &amp; MCNP</p>
          </div>
        </div>

        {/* Auth buttons — fixed sizing, no clipping */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            onClick={() => router.push('/login')}
            style={{
              color: '#94a3b8', fontSize: 13, fontWeight: 600,
              padding: '7px 12px', borderRadius: 10,
              border: '1px solid #1e293b',
              backgroundColor: 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            Log in
          </button>
          <button
            onClick={() => router.push('/signup')}
            style={{
              color: '#ffffff', fontSize: 13, fontWeight: 600,
              padding: '7px 12px', borderRadius: 10,
              background: 'linear-gradient(135deg,#dc2626,#2563eb)',
              whiteSpace: 'nowrap',
            }}
          >
            Sign up
          </button>
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '0 16px' }}
      >

        {/* Welcome — vertically centered when no messages */}
        {!hasMessages && (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ minHeight: '100%', padding: '24px 0 16px' }}
          >
            {/* Icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 20, marginBottom: 16,
              background: 'linear-gradient(135deg,#dc2626,#2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>🎓</div>

            <p style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Campus AI Assistant
            </p>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, maxWidth: 280, marginBottom: 24 }}>
              Ask anything about ISAP and MCNP — courses, tuition, enrollment, campus life, and more.
            </p>

            {/* Suggestion chips — horizontally scrollable */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                width: '100%',
                paddingBottom: 4,
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <style>{`.chips::-webkit-scrollbar{display:none}`}</style>
              <div className="chips" style={{
                display: 'flex', gap: 8, width: '100%',
                overflowX: 'auto', paddingBottom: 4,
              }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    style={{
                      flexShrink: 0,
                      padding: '8px 14px',
                      borderRadius: 20,
                      border: '1px solid #1e293b',
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      fontSize: 12,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Scroll hint */}
            <p style={{ color: '#334155', fontSize: 11, marginTop: 12 }}>
              ← swipe to see more suggestions →
            </p>
          </div>
        )}

        {/* Messages */}
        {hasMessages && (
          <div style={{ paddingTop: 16, paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>

                {msg.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                    background: 'linear-gradient(135deg,#dc2626,#2563eb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>🎓</div>
                )}

                <div style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  backgroundColor: msg.role === 'user' ? '#2563eb' : '#1e293b',
                  color: msg.role === 'user' ? '#ffffff' : '#e2e8f0',
                  fontSize: 14,
                  lineHeight: 1.6,
                  border: msg.role === 'assistant' ? '1px solid #334155' : 'none',
                }}>
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  ) : (
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg,#dc2626,#2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>🎓</div>
                <div style={{
                  padding: '12px 16px', borderRadius: '18px 18px 18px 4px',
                  backgroundColor: '#1e293b', border: '1px solid #334155',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', backgroundColor: '#475569',
                      animation: 'dotB 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                  <style>{`@keyframes dotB{0%,80%,100%{background:#475569;transform:scale(1)}40%{background:#94a3b8;transform:scale(1.4)}}`}</style>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── INPUT BAR ── */}
      <div
        className="shrink-0"
        style={{
          padding: '12px 16px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 24,
          padding: '10px 10px 10px 16px',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
            placeholder="Ask anything about ISAP or MCNP..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f1f5f9',
              fontSize: 14,
              lineHeight: 1.5,
              minWidth: 0,
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !loading
                ? 'linear-gradient(135deg,#dc2626,#2563eb)'
                : '#334155',
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {loading
              ? <Loader2 size={16} color="#64748b" className="animate-spin" />
              : <Send size={16} color={input.trim() ? '#ffffff' : '#64748b'} />
            }
          </button>
        </div>

        {/* Footer links */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 12 }}>
          <button onClick={() => router.push('/login')}
            style={{ color: '#475569', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
            Log in for full access
          </button>
          <span style={{ color: '#1e293b' }}>·</span>
          <button onClick={() => router.push('/signup')}
            style={{ color: '#2563eb', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            Create account →
          </button>
        </div>
      </div>

      {/* Install banner */}
      {showInstall && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 100,
          backgroundColor: '#1e293b', border: '1px solid #334155',
          borderRadius: 16, padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div>
            <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600 }}>Install Campus Help Desk</p>
            <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Add to Home Screen for quick access</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowInstall(false)}
              style={{ color: '#64748b', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
              Later
            </button>
            <button onClick={handleInstall}
              style={{
                color: '#fff', fontSize: 12, fontWeight: 600,
                padding: '6px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg,#dc2626,#2563eb)',
                border: 'none', cursor: 'pointer',
              }}>
              Install
            </button>
          </div>
        </div>
      )}
    </div>
  )
}