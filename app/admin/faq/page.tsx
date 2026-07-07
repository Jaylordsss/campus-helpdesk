'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, HelpCircle } from 'lucide-react'

type FAQ = {
  id: string
  question: string
  answer: string
  category: string
  school: string
}

const emptyForm = { question: '', answer: '', category: 'General', school: 'BOTH' }
const categories = ['General', 'Enrollment', 'Tuition', 'Location', 'Registrar', 'Scholarship', 'Academic', 'Courses']
const schoolOptions = ['BOTH', 'ISAP', 'MCNP']

export default function AdminFAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'BOTH' | 'ISAP' | 'MCNP'>('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetchFAQs = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('faq').select('*').order('category').order('school')
    setFaqs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchFAQs() }, [])

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) return
    setSaving(true)
    const supabase = createClient()
    if (editId) {
      await supabase.from('faq').update(form).eq('id', editId)
    } else {
      await supabase.from('faq').insert(form)
    }
    await fetchFAQs()
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
    setSaving(false)
  }

  const handleEdit = (faq: FAQ) => {
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      school: faq.school,
    })
    setEditId(faq.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('faq').delete().eq('id', id)
    await fetchFAQs()
    setDeleteId(null)
  }

  const filtered = faqs
    .filter(f => filterSchool === 'ALL' || f.school === filterSchool)
    .filter(f => filterCategory === 'ALL' || f.category === filterCategory)
    .filter(f =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
    )

  const grouped = filtered.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = []
    acc[faq.category].push(faq)
    return acc
  }, {} as Record<string, FAQ[]>)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>FAQs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage frequently asked questions</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
        >
          <Plus size={14} />
          Add FAQ
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['ALL', 'BOTH', 'ISAP', 'MCNP'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterSchool(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterSchool === s
                  ? s === 'ISAP' ? 'bg-red-100 text-red-700'
                    : s === 'MCNP' ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 focus:border-slate-400 focus:outline-none"
        >
          <option value="ALL">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search questions..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {editId ? 'Edit FAQ' : 'Add New FAQ'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
              className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Question */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Question</label>
              <input
                value={form.question}
                onChange={e => setForm({ ...form, question: e.target.value })}
                placeholder="e.g. What are the enrollment requirements?"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Answer */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Answer</label>
              <textarea
                value={form.answer}
                onChange={e => setForm({ ...form, answer: e.target.value })}
                placeholder="Type the full answer here..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
                >
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* School */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Applies to</label>
                <div className="flex gap-2">
                  {schoolOptions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, school: s })}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        form.school === s
                          ? s === 'ISAP' ? 'border-red-400 bg-red-50 text-red-700'
                            : s === 'MCNP' ? 'border-blue-400 bg-blue-50 text-blue-700'
                            : 'border-slate-600 bg-slate-800 text-white'
                          : 'border-slate-100 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !form.question.trim() || !form.answer.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all"
            >
              <Check size={15} />
              {saving ? 'Saving...' : editId ? 'Update FAQ' : 'Add FAQ'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FAQ list grouped by category */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <HelpCircle size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No FAQs found</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                  {category} · {items.length} items
                </p>
                <div className="space-y-2">
                  {items.map(faq => (
                    <div key={faq.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              faq.school === 'ISAP' ? 'bg-red-100 text-red-700'
                                : faq.school === 'MCNP' ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {faq.school}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mb-1">
                            {faq.question}
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEdit(faq)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          >
                            <Pencil size={14} />
                          </button>
                          {deleteId === faq.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(faq.id)}
                                className="text-xs font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
                                Yes
                              </button>
                              <button onClick={() => setDeleteId(null)}
                                className="text-xs font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100">
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteId(faq.id)}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}