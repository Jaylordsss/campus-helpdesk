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
  courses: { name: string }
}

export default function TuitionPage() {
  const [tuition, setTuition] = useState<TuitionRecord[]>([])
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState('')

  useEffect(() => {
    const getData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from('profiles').select('school').eq('id', user.id).single()
        if (!profile) return
        setSchool(profile.school)
        const { data } = await supabase
          .from('tuition')
          .select('*, courses(name)')
          .eq('school', profile.school)
          .order('year_level').order('semester')
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

  const availableYears = yearOrder.filter(y => tuition.some(t => t.year_level === y))

  const grouped = tuition.reduce((acc, item) => {
    const courseName = item.courses?.name || 'Unknown'
    if (!acc[courseName]) acc[courseName] = {}
    if (!acc[courseName][item.year_level]) acc[courseName][item.year_level] = []
    acc[courseName][item.year_level].push(item)
    return acc
  }, {} as Record<string, Record<string, TuitionRecord[]>>)

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
        <p className="text-sm text-slate-500 mt-1">Fee schedule for {school} programs</p>
      </div>

      {/* Dropdown */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
          Select Year Level
        </label>
        <div className="relative max-w-xs">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className={`w-full appearance-none rounded-xl border-2 px-4 py-3 text-sm font-semibold focus:outline-none pr-10 cursor-pointer bg-white
              ${isISAP
                ? 'border-red-200 text-red-700 focus:border-red-400'
                : 'border-blue-200 text-blue-700 focus:border-blue-400'
              }`}
          >
            <option value="">-- Select year level --</option>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none
              ${isISAP ? 'text-red-400' : 'text-blue-400'}`}
          />
        </div>
      </div>

      {/* No selection */}
      {!selectedYear && (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <CreditCard size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Select a year level to view fees</p>
        </div>
      )}

      {/* Tuition cards */}
      {selectedYear && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([courseName, byYear]) => {
            const records = byYear[selectedYear]
            if (!records) return null

            const sorted = [...records].sort(
              (a, b) => semOrder.indexOf(a.semester) - semOrder.indexOf(b.semester)
            )
            const total = sorted
              .filter(r => r.semester !== 'Intersession')
              .reduce((sum, r) => sum + r.amount, 0)
            const intersession = sorted.find(r => r.semester === 'Intersession')

            return (
              <div key={courseName} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">

                {/* Course header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                    ${isISAP ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <CreditCard size={16} className={isISAP ? 'text-red-500' : 'text-blue-500'} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{courseName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedYear}</p>
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-50">
                  {sorted.map(record => (
                    <div key={record.id} className="px-5 py-3 flex items-center justify-between">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        record.semester === 'Intersession'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {record.semester}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        ₱{record.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}

                  {/* Annual total */}
                  <div className={`px-5 py-3 flex items-center justify-between
                    ${isISAP ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <span className="text-xs font-semibold text-slate-500">
                      Annual total{intersession ? ' (excl. intersession)' : ''}
                    </span>
                    <span className={`text-sm font-bold
                      ${isISAP ? 'text-red-600' : 'text-blue-600'}`}>
                      ₱{total.toLocaleString()}
                    </span>
                  </div>

                  {/* Intersession */}
                  {intersession && (
                    <div className="px-5 py-3 flex items-center justify-between bg-amber-50">
                      <span className="text-xs font-semibold text-amber-600">
                        + Intersession / Summer class
                      </span>
                      <span className="text-sm font-bold text-amber-700">
                        ₱{intersession.amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {Object.values(grouped).every(byYear => !byYear[selectedYear]) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <CreditCard size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No tuition data for {selectedYear} yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}