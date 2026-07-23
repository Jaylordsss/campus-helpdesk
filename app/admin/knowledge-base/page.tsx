'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  Plus, Pencil, Trash2, Check, X,
  BookOpen, FileText, Upload, Eye, EyeOff, Loader2
} from 'lucide-react'

type KnowledgeEntry = {
  id: string
  title: string
  content: string
  category: string
  school: string
  is_active: boolean
  created_at: string
}

const emptyForm = {
  title: '',
  content: '',
  category: 'General',
  school: 'BOTH',
  is_active: true,
}

const CATEGORIES = [
  'General',
  'Enrollment',
  'Tuition & Fees',
  'Courses & Programs',
  'Campus Policies',
  'Student Services',
  'Events & Activities',
  'Scholarships',
  'Requirements',
  'Contact & Offices',
]

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<KnowledgeEntry | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'ISAP' | 'MCNP' | 'BOTH'>('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchEntries = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('category').order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => {
  const fetchEntries = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('knowledge_base')
      .select('*')
      .order('category')
      .order('created_at', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }
  fetchEntries()
}, [])

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      setForm(prev => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
        content: text,
      }))
    } catch {
      setError('Failed to read file')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.content.trim()) { setError('Content is required'); return }
    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        school: form.school,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }
      if (editItem) {
        const { error: err } = await supabase
          .from('knowledge_base').update(payload).eq('id', editItem.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('knowledge_base').insert(payload)
        if (err) throw err
      }
      setSuccess(editItem ? 'Entry updated!' : 'Entry added to knowledge base!')
      setTimeout(() => setSuccess(''), 3000)
      setShowForm(false)
      setEditItem(null)
      setForm(emptyForm)
      await fetchEntries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditItem(entry)
    setForm({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      school: entry.school,
      is_active: entry.is_active,
    })
    setError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('knowledge_base').delete().eq('id', id)
    setDeleteId(null)
    setSuccess('Entry deleted!')
    setTimeout(() => setSuccess(''), 3000)
    await fetchEntries()
  }

  const toggleActive = async (entry: KnowledgeEntry) => {
    const supabase = createClient()
    await supabase
      .from('knowledge_base')
      .update({ is_active: !entry.is_active })
      .eq('id', entry.id)
    await fetchEntries()
  }

  const filtered = entries.filter(e => {
    const matchSchool = filterSchool === 'ALL' || e.school === filterSchool || e.school === 'BOTH'
    const matchCategory = filterCategory === 'ALL' || e.category === filterCategory
    return matchSchool && matchCategory
  })

  const activeCount = entries.filter(e => e.is_active).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>AI Knowledge Base</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Add information the AI assistant will use to answer student questions
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setError('') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shrink-0"
        >
          <Plus size={14} />
          Add Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Entries', value: entries.length, color: 'var(--text)' },
          { label: 'Active (used by AI)', value: activeCount, color: '#10b981' },
          { label: 'Hidden', value: entries.length - activeCount, color: '#64748b' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <BookOpen size={15} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>How the AI uses this</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              When a student asks a question, the AI searches all active entries here first.
              Matching entries are sent to the AI as context — so it answers using your exact information.
              Only <span className="font-semibold text-emerald-600">active</span> entries are used.
              Entries marked as Hidden are ignored by the AI.
            </p>
          </div>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <Check size={14} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">{success}</p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {editItem ? 'Edit Entry' : 'Add Knowledge Entry'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              style={{ color: 'var(--text-faint)' }}>
              <X size={18} />
            </button>
          </div>

          {/* File import */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Import from file
              <span className="font-normal ml-1" style={{ color: 'var(--text-faint)' }}>
                (.txt, .md, .csv — content will be imported into the text box below)
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all hover:bg-black/5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {importing ? 'Importing...' : 'Choose File'}
              </button>
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                Supported: .txt, .md, .csv, .json
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,.json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Title * <span className="font-normal" style={{ color: 'var(--text-faint)' }}>
                  (helps the AI find the right info)
                </span>
              </label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. BSIT Tuition Fees 2025-2026, Enrollment Requirements, Scholarship Guidelines"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Content */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Content *
                <span className="font-normal ml-1" style={{ color: 'var(--text-faint)' }}>
                  (paste text, tables, lists, or any information you want the AI to know)
                </span>
              </label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder={`Example:\n\nBSIT Tuition Fee for 1st Year:\n- 1st Semester: ₱18,500\n- 2nd Semester: ₱18,500\n- Intersession: ₱5,000\n\nInclusions:\n- Miscellaneous fees\n- Lab fees\n- Library fee`}
                rows={10}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y font-mono"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                {form.content.length} characters
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* School */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Applies to
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'BOTH', label: 'Both' },
                  { value: 'ISAP', label: 'ISAP' },
                  { value: 'MCNP', label: 'MCNP' },
                ].map(s => (
                  <button key={s.value} type="button"
                    onClick={() => setForm({ ...form, school: s.value })}
                    className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all"
                    style={{
                      borderColor: form.school === s.value
                        ? s.value === 'ISAP' ? '#dc2626' : s.value === 'MCNP' ? '#2563eb' : '#1e293b'
                        : 'var(--border)',
                      backgroundColor: form.school === s.value
                        ? s.value === 'ISAP' ? '#fee2e2' : s.value === 'MCNP' ? '#dbeafe' : '#f1f5f9'
                        : 'var(--bg)',
                      color: form.school === s.value
                        ? s.value === 'ISAP' ? '#b91c1c' : s.value === 'MCNP' ? '#1d4ed8' : '#1e293b'
                        : 'var(--text-muted)',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className="relative w-11 h-6 rounded-full transition-all"
                style={{ backgroundColor: form.is_active ? '#10b981' : '#e2e8f0' }}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${form.is_active ? 'left-[22px]' : 'left-[2px]'}`} />
              </button>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {form.is_active ? '✅ Active — AI will use this information' : '⛔ Hidden — AI will ignore this'}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add to Knowledge Base'}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              className="px-5 py-2.5 rounded-xl border text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
            <button key={s} onClick={() => setFilterSchool(s)}
              className="px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                backgroundColor: filterSchool === s
                  ? s === 'ISAP' ? '#b91c1c' : s === 'MCNP' ? '#1d4ed8' : '#1e293b'
                  : 'var(--bg)',
                color: filterSchool === s ? '#fff' : 'var(--text-muted)',
              }}>
              {s === 'ALL' ? 'All Schools' : s}
            </button>
          ))}
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          {filtered.length} of {entries.length} entries
        </p>
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <BookOpen size={28} className="mx-auto mb-2" style={{ color: 'var(--text-faint)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No entries yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
            Add information the AI should know about
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl"
          >
            Add First Entry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => (
            <div key={entry.id}
              className="rounded-2xl border p-5 transition-all"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)',
                opacity: entry.is_active ? 1 : 0.6,
              }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {entry.category}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        entry.school === 'ISAP' ? 'bg-red-100 text-red-700'
                        : entry.school === 'MCNP' ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                      }`}>
                        {entry.school}
                      </span>
                      {entry.is_active ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          ✓ Active
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{entry.title}</p>
                    <p className="text-xs mt-1 line-clamp-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                      {entry.content}
                    </p>
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-faint)' }}>
                      {entry.content.length} chars ·{' '}
                      {new Date(entry.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(entry)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-black/5 transition-all"
                    style={{ color: 'var(--text-muted)' }}>
                    {entry.is_active ? <><EyeOff size={13} />Hide</> : <><Eye size={13} />Show</>}
                  </button>
                  <button onClick={() => handleEdit(entry)}
                    className="p-1.5 rounded-lg hover:bg-black/5 transition-all"
                    style={{ color: 'var(--text-muted)' }}>
                    <Pencil size={14} />
                  </button>
                  {deleteId === entry.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(entry.id)}
                        className="text-[10px] font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
                        Yes
                      </button>
                      <button onClick={() => setDeleteId(null)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg"
                        style={{ color: 'var(--text-muted)' }}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all"
                      style={{ color: 'var(--text-faint)' }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}