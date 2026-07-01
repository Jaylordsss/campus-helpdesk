'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { CreditCard, ChevronDown } from 'lucide-react'

type TuitionRecord = {
  id: string
  year_level: string
  semester: string
  amount: number
  school: string
  courses: { name: string; school: string }
}

export default function TuitionPage() {
  const [tuition, setTuition] = useState<TuitionRecord[]>([])
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

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

        const { data } = await supabase
          .from('tuition')
          .select('*, courses(name, school)')
          .eq('school', profile.school)
          .order('year_level')
          .order('semester')

        setTuition(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    getData()
  }, [])

  const isISAP = school === 'ISAP'
  const semOrder = ['1st Semester', '2nd Semester', 'Intersession']
  const yearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year']

  // Get unique course names from tuition data
  const availableCourses = Array.from(
    new Set(tuition.map(t => t.courses?.name).filter(Boolean))
  )

  // Get year levels available for selected course
  const availableYears = yearOrder.filter(y =>
    tuition.some(t => t.courses?.name === selectedCourse && t.year_level === y)
  )

  // Get tuition records for selected course + year
  const filteredRecords = tuition.filter(t =>
    t.courses?.name === selectedCourse && t.year_level === selectedYear
  )

  const sorted = [...filteredRecords].sort(
    (a, b) => semOrder.indexOf(a.semester) - semOrder.indexOf(b.semester)
  )

  const regularRecords = sorted.filter(r => r.semester !== 'Intersession')
  const intersessionRecord = sorted.find(r => r.semester === 'Intersession')
  const annualTotal = regularRecords.reduce((sum, r) => sum + r.amount, 0)

  const handleCourseChange = (course: string) => {
    setSelectedCourse(course)
    setSelectedYear('') // reset year when course changes
  }

  const accentBorder = isISAP ? 'border-red-200 text-red-700 focus:border-red-400' : 'border-blue-200 text-blue-700 focus:border-blue-400'
  const accentChevron = isISAP ? 'text-red-400' : 'text-blue-400'
  const accentHeader = isISAP ? 'bg-red-50' : 'bg-blue-50'
  const accentIcon = isISAP ? 'bg-red-100' : 'bg-blue-100'
  const accentIconColor = isISAP ? 'text-red-600' : 'text-blue-600'
  const accentTotal = isISAP ? 'text-red-700' : 'text-blue-700'
  const accentTotalBg = isISAP ? 'bg-red-50' : 'bg-blue-50'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tuition Fees</h1>
        <p className="text-sm text-slate-500 mt-1">
          Fee schedule for{' '}
          <span className={`font-semibold ${isISAP ? 'text-red-600' : 'text-blue-600'}`}>
            {school}
          </span>{' '}
          programs
        </p>
      </div>

      {/* Step 1 — Select Course */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Step 1 — Select Course
          </label>
          {availableCourses.length === 0 ? (
            <p className="text-sm text-slate-400">No tuition data available yet.</p>
          ) : (
            <div className="relative max-w-md">
              <select
                value={selectedCourse}
                onChange={e => handleCourseChange(e.target.value)}
                className={`w-full appearance-none rounded-xl border-2 px-4 py-3 text-sm font-semibold focus:outline-none pr-10 cursor-pointer bg-white transition-all ${accentBorder}`}
              >
                <option value="">-- Select your course --</option>
                {availableCourses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${accentChevron}`} />
            </div>
          )}
        </div>

        {/* Step 2 — Select Year Level (only show after course is selected) */}
        {selectedCourse && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Step 2 — Select Year Level
            </label>
            {availableYears.length === 0 ? (
              <p className="text-sm text-slate-400">No year level data for this course yet.</p>
            ) : (
              <div className="relative max-w-md">
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className={`w-full appearance-none rounded-xl border-2 px-4 py-3 text-sm font-semibold focus:outline-none pr-10 cursor-pointer bg-white transition-all ${accentBorder}`}
                >
                  <option value="">-- Select your year level --</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${accentChevron}`} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prompt states */}
      {!selectedCourse && (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <CreditCard size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Select your course to view tuition fees</p>
        </div>
      )}

      {selectedCourse && !selectedYear && (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <CreditCard size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Now select your year level</p>
        </div>
      )}

      {/* Tuition result */}
      {selectedCourse && selectedYear && (
        <div>
          {sorted.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <CreditCard size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No tuition data for {selectedCourse} — {selectedYear}</p>
              <p className="text-xs text-slate-300 mt-1">Contact admin to update fee information</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

              {/* Course + year header */}
              <div className={`px-5 py-4 border-b border-slate-100 flex items-center gap-3 ${accentHeader}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accentIcon}`}>
                  <CreditCard size={16} className={accentIconColor} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{selectedCourse}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedYear} · {school}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-50">

                {/* Regular semesters */}
                {regularRecords.map(record => (
                  <div key={record.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-slate-300 rounded-full" />
                      <span className="text-sm text-slate-700 font-medium">
                        {record.semester}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      ₱{record.amount.toLocaleString()}
                    </span>
                  </div>
                ))}

                {/* Annual total */}
                <div className={`px-5 py-4 flex items-center justify-between ${accentTotalBg}`}>
                  <span className="text-sm font-semibold text-slate-600">
                    Annual Total
                    {intersessionRecord ? ' (excl. intersession)' : ''}
                  </span>
                  <span className={`text-base font-bold ${accentTotal}`}>
                    ₱{annualTotal.toLocaleString()}
                  </span>
                </div>

                {/* Intersession — only if exists */}
                {intersessionRecord && (
                  <div className="px-5 py-4 flex items-center justify-between bg-amber-50">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 bg-amber-400 rounded-full" />
                      <div>
                        <p className="text-sm text-amber-800 font-medium">
                          Intersession / Summer Class
                        </p>
                        <p className="text-xs text-amber-500 mt-0.5">
                          Only if enrolled in summer class
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-700">
                      ₱{intersessionRecord.amount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}