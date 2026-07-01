'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { BookOpen, Clock } from 'lucide-react'

type Course = {
  id: string
  name: string
  description: string
  duration: string
  school: string
  has_intersession: boolean
}

export default function CoursesPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('school')
        .eq('id', user.id)
        .single()
      if (!profile) return
      setSchool(profile.school)
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('school', profile.school)
        .order('name')
      setCourses(coursesData || [])
      setLoading(false)
    }
    getData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <p className="text-sm text-gray-500 mt-1">
          Programs offered at {school}
        </p>
      </div>

      <div className="grid gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{course.name}</h3>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    course.school === 'MCNP'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {course.school}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{course.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock size={13} />
                    {course.duration}
                  </div>
                  {course.has_intersession && (
                    <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      Has Intersession
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
