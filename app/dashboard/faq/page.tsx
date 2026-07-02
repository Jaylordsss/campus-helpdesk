'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/src/lib/supabase/client'
import { HelpCircle, Search, ChevronDown, ChevronUp } from 'lucide-react'

type FAQ = {
  id: string
  question: string
  answer: string
  category: string
  school: string
}

export default function FAQPage() {
  const router = useRouter()
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    const getData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('school')
          .eq('id', user.id)
          .single()
        if (!profile) return
        setSchool(profile.school)
        const schoolFilter = 'school.eq.' + profile.school + ',school.eq.BOTH'
        const { data } = await supabase
          .from('faq')
          .select('*')
          .or(schoolFilter)
          .order('category')
          .order('question')
        setFaqs(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    getData()
  }, [])

  const isISAP = school === 'ISAP'
  const accentText = isISAP ? 'text-red-600' : 'text-blue-600'
  const accentBg = isISAP ? 'bg-red-500' : 'bg-blue-500'
  const accentLight = isISAP ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
  const accentBorder = isISAP
    ? 'border-red-400 bg-red-50 text-red-700'
    : 'border-blue-400 bg-blue-50 text-blue-700'
  const accentFocus = isISAP ? 'focus:border-red-400' : 'focus:border-blue-400'

  const categories = [
    'ALL',
    ...Array.from(new Set(faqs.map(f => f.category).filter(Boolean))),
  ]

  const filtered = faqs
    .filter(f => activeCategory === 'ALL' || f.category === activeCategory)
    .filter(f =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
    )

  const grouped = filtered.reduce((acc, faq) => {
    const cat = faq.category || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(faq)
    return acc
  }, {} as Record<string, FAQ[]>)

  const toggleFaq = (id: string) => {
    setOpenId(prev => (prev === id ? null : id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Common questions about{' '}
          <span className={`font-semibold ${accentText}`}>{school}</span>
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setActiveCategory('ALL')
          }}
          placeholder="Search questions..."
          className={`w-full rounded-2xl border border-slate-200 pl-11 pr-4 py-3 text-sm focus:outline-none ${accentFocus}`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat)
              setSearch('')
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
              activeCategory === cat
                ? accentBorder
                : 'border-slate-100 text-slate-500 hover:border-slate-200 bg-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <HelpCircle size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No FAQs found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              {activeCategory === 'ALL' && (
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${accentBg}`} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {category}
                  </p>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-xs text-slate-300">{items.length}</span>
                </div>
              )}

              <div className="space-y-2">
                {items.map(faq => {
                  const isOpen = openId === faq.id
                  return (
                    <div
                      key={faq.id}
                      className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                        isOpen
                          ? 'border-slate-200 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleFaq(faq.id)}
                        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isOpen ? accentBg : 'bg-slate-100'}`}>
                            <HelpCircle
                              size={13}
                              className={isOpen ? 'text-white' : 'text-slate-400'}
                            />
                          </div>
                          <p className={`text-sm font-semibold leading-snug ${isOpen ? 'text-slate-900' : 'text-slate-700'}`}>
                            {faq.question}
                          </p>
                        </div>
                        <div className="shrink-0 mt-0.5">
                          {isOpen
                            ? <ChevronUp size={16} className={accentText} />
                            : <ChevronDown size={16} className="text-slate-400" />
                          }
                        </div>
                      </button>

                      {isOpen && (
                        <div className={`mx-5 mb-4 rounded-xl p-4 border ${accentLight}`}>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {faq.answer}
                          </p>
                          {faq.school !== 'BOTH' && (
                            <span className={`inline-block mt-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                              faq.school === 'ISAP'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {faq.school}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-2xl border p-5 ${accentLight}`}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accentBg}`}>
            <HelpCircle size={16} className="text-white" />
          </div>
          <div>
            <p className={`text-sm font-bold ${accentText}`}>
              Still have questions?
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Ask the AI Assistant or submit an inquiry.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => router.push('/dashboard/chat')}
                className={`text-xs font-semibold text-white px-3 py-2 rounded-xl hover:opacity-90 transition-all ${accentBg}`}
              >
                Ask AI Assistant
              </button>
              <button
                onClick={() => router.push('/dashboard/inquiries')}
                className="text-xs font-semibold text-slate-600 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Submit Inquiry
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}