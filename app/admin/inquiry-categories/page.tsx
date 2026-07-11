'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react'

type Category = {
  id: string
  label: string
  icon: string
  description: string
  office_key: string | null
  is_active: boolean
  sort_order: number
}

const emptyForm = {
  label: '',
  icon: '💬',
  description: '',
  office_key: '',
  is_active: true,
}

const QUICK_ICONS = ['💬', '📋', '💰', '👤', '🎓', '🤝', '💻', '📚', '🏛️', '📖', '🖥️', '⚙️', '🏥', '📝', '🔧', '📞']

export default function InquiryCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Category | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const fetchCategories = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('inquiry_categories')
      .select('*')
      .order('sort_order')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Label is required'); return }
    if (!form.icon.trim()) { setError('Icon is required'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()
    if (editItem) {
      const { error: err } = await supabase
        .from('inquiry_categories')
        .update({
          label: form.label.trim(),
          icon: form.icon.trim(),
          description: form.description.trim(),
          office_key: form.office_key.trim() || null,
          is_active: form.is_active,
        })
        .eq('id', editItem.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0
      const { error: err } = await supabase
        .from('inquiry_categories')
        .insert({
          label: form.label.trim(),
          icon: form.icon.trim(),
          description: form.description.trim(),
          office_key: form.office_key.trim() || null,
          is_active: form.is_active,
          sort_order: maxOrder + 1,
        })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setSuccess(editItem ? 'Category updated!' : 'Category added!')
    setTimeout(() => setSuccess(''), 3000)
    setShowForm(false)
    setEditItem(null)
    setForm(emptyForm)
    await fetchCategories()
    setSaving(false)
  }

  const handleEdit = (cat: Category) => {
    setEditItem(cat)
    setForm({
      label: cat.label,
      icon: cat.icon,
      description: cat.description || '',
      office_key: cat.office_key || '',
      is_active: cat.is_active,
    })
    setError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('inquiry_categories').delete().eq('id', id)
    setDeleteId(null)
    setSuccess('Category deleted!')
    setTimeout(() => setSuccess(''), 3000)
    await fetchCategories()
    setDeleting(false)
  }

  const toggleActive = async (cat: Category) => {
    const supabase = createClient()
    await supabase
      .from('inquiry_categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id)
    await fetchCategories()
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Inquiry Categories</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage the offices and departments students can send inquiries to
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditItem(null); setForm(emptyForm); setError('') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
        >
          <Plus size={14} />
          Add Category
        </button>
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
              {editItem ? 'Edit Category' : 'Add New Category'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              style={{ color: 'var(--text-faint)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Icon picker */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Icon
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {QUICK_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm({ ...form, icon: ic })}
                    className="w-9 h-9 rounded-xl border-2 text-lg flex items-center justify-center transition-all"
                    style={{
                      borderColor: form.icon === ic ? '#1e293b' : 'var(--border)',
                      backgroundColor: form.icon === ic ? '#1e293b' : 'var(--bg)',
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                  placeholder="Or paste any emoji"
                  className="w-32 rounded-xl border px-3 py-2 text-sm focus:outline-none text-center"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <span className="text-2xl">{form.icon}</span>
              </div>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Label / Name *
              </label>
              <input
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Library, Clinic, NSTP Office"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Description
              </label>
              <input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Book borrowing, library concerns"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Office key */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Linked Office Account <span className="font-normal" style={{ color: 'var(--text-faint)' }}>
                  (must match the Office field of the admin account exactly)
                </span>
              </label>
              <input
                value={form.office_key}
                onChange={e => setForm({ ...form, office_key: e.target.value })}
                placeholder="e.g. Library, Registrar, CITE - College of Information Technology"
                className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
                Leave blank to send to main admin only
              </p>
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
                {form.is_active ? 'Active — students can see this' : 'Hidden from students'}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Check size={15} />
              }
              {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Add Category'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditItem(null); setError('') }}
              className="px-5 py-2.5 rounded-xl border text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No categories yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add your first inquiry category above</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-bold uppercase tracking-widest"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>
            <div className="col-span-1"></div>
            <div className="col-span-3">Label</div>
            <div className="col-span-4 hidden sm:block">Description</div>
            <div className="col-span-2 hidden sm:block">Linked Office</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Actions</div>
          </div>

          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className="grid grid-cols-12 gap-3 px-5 py-4 items-center transition-all hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderBottom: i < categories.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              {/* Icon */}
              <div className="col-span-1 text-xl">{cat.icon}</div>

              {/* Label */}
              <div className="col-span-3">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{cat.label}</p>
              </div>

              {/* Description */}
              <div className="col-span-4 hidden sm:block">
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{cat.description || '—'}</p>
              </div>

              {/* Office key */}
              <div className="col-span-2 hidden sm:block">
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{cat.office_key || '—'}</p>
              </div>

              {/* Active toggle */}
              <div className="col-span-1">
                <button
                  onClick={() => toggleActive(cat)}
                  className="relative w-9 h-5 rounded-full transition-all"
                  style={{ backgroundColor: cat.is_active ? '#10b981' : '#e2e8f0' }}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${cat.is_active ? 'left-[18px]' : 'left-[2px]'}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex items-center gap-1">
                <button
                  onClick={() => handleEdit(cat)}
                  className="p-1.5 rounded-lg transition-all hover:bg-black/5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Pencil size={14} />
                </button>

                {deleteId === cat.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={deleting}
                      className="text-[10px] font-bold text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      {deleting ? '...' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteId(cat.id)}
                    className="p-1.5 rounded-lg transition-all hover:bg-red-50 hover:text-red-500"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          How it works
        </p>
        <div className="space-y-2">
          {[
            'Active categories appear in the student inquiry form.',
            'The "Linked Office" must exactly match the Office field of the admin account.',
            'If no office is linked, inquiries go to the main admin only.',
            'Toggle the switch to hide/show a category without deleting it.',
            'The student sees the icon, label, and description when choosing where to send their inquiry.',
          ].map((note, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-1.5" />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}