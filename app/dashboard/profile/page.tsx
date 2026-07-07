'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import {
  User, Camera, Check, Loader2,
  GraduationCap, Mail, IdCard, BookOpen
} from 'lucide-react'

type Profile = {
  id: string
  name: string
  email: string
  school: string
  student_id: string | null
  course: string | null
  year_level: string | null
  photo_url: string | null
}

const yearOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year']

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setName(data.name || '')
        setYearLevel(data.year_level || '1st Year')
        setPhotoUrl(data.photo_url ? `${data.photo_url}?v=${Date.now()}` : null)
      }
      setLoading(false)
    }
    getData()
  }, [])

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be less than 5MB'); return }
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const ext = file.type === 'image/png' ? 'png' : 'jpg'
      const path = `${profile.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('profiles').update({ photo_url: publicUrl }).eq('id', profile.id)
      if (updateError) throw updateError
      const displayUrl = `${publicUrl}?v=${Date.now()}`
      setPhotoUrl(displayUrl)
      setProfile(prev => prev ? { ...prev, photo_url: publicUrl } : null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Upload failed:', err)
      setError('Failed to upload photo. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!profile || !name.trim()) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: name.trim(), year_level: yearLevel })
        .eq('id', profile.id)
      if (updateError) throw updateError
      setSuccess(true)
      setProfile(prev => prev ? { ...prev, name: name.trim(), year_level: yearLevel } : null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Save failed:', err)
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isISAP = profile?.school === 'ISAP'
  const accentColor = isISAP ? '#dc2626' : '#2563eb'
  const accentBg = isISAP ? 'bg-red-50' : 'bg-blue-50'
  const accentText = isISAP ? 'text-red-600' : 'text-blue-600'
  const accentBorder = isISAP ? 'border-red-200' : 'border-blue-200'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Update your profile information and photo</p>
      </div>

      {/* Profile banner card */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>

        {/* Gradient banner */}
        <div className="h-24 sm:h-32 w-full" style={{
          background: isISAP
            ? 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)'
            : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
        }} />

        <div className="px-4 sm:px-6 pb-6">

          {/* Avatar row — only avatar pulls up, not the name */}
          <div className="flex items-end justify-between -mt-12 sm:-mt-16">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 overflow-hidden flex items-center justify-center"
                style={{ borderColor: 'var(--bg-card)', backgroundColor: 'var(--bg)' }}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={24} className="text-slate-400 animate-spin" />
                    <span className="text-[10px] text-slate-400">Uploading...</span>
                  </div>
                ) : photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" onError={() => setPhotoUrl(null)} />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <User size={28} className="text-slate-300" />
                    <span className="text-[10px] text-slate-300 font-medium">No photo</span>
                  </div>
                )}
              </div>

              {/* Camera button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-md transition-all hover:scale-110 active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
            </div>

            {/* Change photo — desktop only, sits at bottom of banner area */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${accentBorder} ${accentBg} ${accentText}`}
            >
              <Camera size={15} />
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>

          {/* Name + info — fully in white area below banner */}
          <div className="mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                {profile?.name}
              </h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${accentBg} ${accentText}`}>
                {profile?.school}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{profile?.email}</p>
            {profile?.course && (
              <p className="text-xs text-slate-500 mt-1">
                {profile.course} · {profile.year_level}
              </p>
            )}
          </div>

          {/* Change photo — mobile only */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={`mt-3 sm:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${accentBorder} ${accentBg} ${accentText}`}
          >
            <Camera size={15} />
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: IdCard, label: 'Student ID', value: profile?.student_id || 'Not assigned' },
          { icon: BookOpen, label: 'Course', value: profile?.course || 'Not assigned' },
          { icon: GraduationCap, label: 'Year Level', value: profile?.year_level || 'Not set' },
          { icon: Mail, label: 'School', value: profile?.school || '' },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${accentBg}`}>
                <Icon size={15} className={accentText} />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">{item.label}</p>
              <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{item.value}</p>
            </div>
          )
        })}
      </div>

      {/* Edit form */}
      <div className="rounded-2xl border p-5 sm:p-6 space-y-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Edit Profile</h3>
          <p className="text-xs text-slate-400 mt-0.5">Update your display name and year level</p>
        </div>

        {/* Full name */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>

        {/* Year level */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Year Level</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {yearOptions.map(y => (
              <button
                key={y}
                type="button"
                onClick={() => setYearLevel(y)}
                className="py-2.5 rounded-xl border-2 text-xs font-semibold transition-all"
                style={{
                  borderColor: yearLevel === y ? accentColor : 'var(--border)',
                  backgroundColor: yearLevel === y ? `${accentColor}18` : 'var(--bg)',
                  color: yearLevel === y ? accentColor : 'var(--text-muted)',
                }}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <Check size={14} className="text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-700">Profile updated successfully!</p>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {saving
            ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" />Saving...</span>
            : 'Save Changes'
          }
        </button>
      </div>

      {/* Read-only note */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold text-slate-500 mb-2">Cannot be changed here:</p>
        <div className="space-y-1">
          {[
            'Student ID — assigned by admin office',
            'Course — contact admin to change',
            'Email — contact admin to update',
            'School — ISAP or MCNP',
          ].map((note, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
              <p className="text-xs text-slate-400">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}