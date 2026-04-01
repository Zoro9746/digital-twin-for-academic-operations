import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const formatTime = (timeStr) => {
  if (!timeStr || timeStr === '—') return timeStr;
  const [h, m] = timeStr.split(':');
  if (!h || !m) return timeStr;
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const MyCourses = () => {
  const navigate = useNavigate()
  const [faculty,  setFaculty ] = useState(null)
  const [timetable, setTimetable] = useState([])
  const [loading,  setLoading ] = useState(true)
  const [csvLoading, setCsvLoad] = useState(null)
  const [error,    setError   ] = useState(null)
  const [tab,      setTab     ] = useState('today')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const fRes = await API.get('/faculty/me')
        setFaculty(fRes.data)

        const tRes = await API.get(`/timetable/faculty/${fRes.data._id}`)
        setTimetable(Array.isArray(tRes.data) ? tRes.data : [])
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load courses')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const exportCSV = async (course) => {
    try {
      setCsvLoad(course._id)
      const res = await API.get(`/attendance/course/${course._id}`)
      const records = res.data

      if (!records || records.length === 0) {
        alert('No attendance records for this course yet.')
        return
      }

      // Build CSV
      const headers = ['Date', 'Student Name', 'Roll No', 'Status', 'Locked']
      const rows = records.map(r => [
        new Date(r.date).toLocaleDateString('en-IN'),
        r.studentId?.userId?.name || r.studentId?.name || 'Unknown',
        r.studentId?.rollNo || '',
        r.status,
        r.isLocked ? 'Yes' : 'No',
      ])

      const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `attendance-${course.code}-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { setError('Failed to export CSV') }
    finally { setCsvLoad(null) }
  }

  if (loading) return (
    <Layout><div className="text-center text-gray-400 py-16">Loading...</div></Layout>
  )

  const todayName = new Date().toLocaleString('en-US', { weekday: 'long' })

  const sortByStartTime = (a, b) => {
    const [ah, am] = String(a.startTime || '0:0').split(':').map(n => Number(n) || 0)
    const [bh, bm] = String(b.startTime || '0:0').split(':').map(n => Number(n) || 0)
    return (ah * 60 + am) - (bh * 60 + bm)
  }

  const today = {
    day: todayName,
    slots: timetable.filter(t => t.day === todayName).sort(sortByStartTime),
  }

  const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const week = WEEK_DAYS.map(d => ({
    day: d,
    slots: timetable.filter(t => t.day === d).sort(sortByStartTime),
  }))

  const courseById = {}
  for (const entry of timetable) {
    const c = entry?.courseId
    if (!c?._id) continue
    const key = c._id.toString()
    if (!courseById[key]) {
      courseById[key] = { course: c, nextSlot: entry }
      continue
    }
    // Choose earliest startTime for "next" time display
    if (sortByStartTime(entry, courseById[key].nextSlot) < 0) {
      courseById[key].nextSlot = entry
    }
  }
  const courses = Object.values(courseById).map(({ course, nextSlot }) => ({
    ...course,
    nextStartTime: nextSlot?.startTime || '',
    nextEndTime: nextSlot?.endTime || '',
  }))

  return (
    <Layout><div className="mb-6"><h1 className="text-2xl font-bold text-gray-800"> My Courses</h1><p className="text-gray-400 text-sm mt-1">{courses.length} assigned courses</p></div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[['today',' Today'],['week',' This Week'],['courses',' All Courses']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TODAY'S CLASSES */}
      {tab === 'today' && (
        <div><div className="flex items-center gap-3 mb-4"><h2 className="font-semibold text-gray-700">
              {today.day}'s Classes
            </h2><span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</span></div>
          {!today.slots.length ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-4xl mb-3"></p><p className="text-gray-400 font-medium">No classes today!</p></div>
          ) : (
            <div className="space-y-3">
              {today.slots.map(slot => {
                const now   = new Date()
                const [sh, sm] = slot.startTime.split(':').map(Number)
                const [eh, em] = slot.endTime.split(':').map(Number)
                const start = new Date(); start.setHours(sh, sm, 0)
                const end   = new Date(); end.setHours(eh, em, 0)
                const isNow = now >= start && now <= end
                const isDone = now > end

                return (
                  <div key={slot._id} className={`bg-white rounded-xl border shadow-sm px-5 py-4 flex items-center gap-4 ${isNow ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'}`}><div className="text-center min-w-[72px]"><p className={`text-lg font-bold ${isNow ? 'text-blue-600' : isDone ? 'text-gray-300' : 'text-gray-700'}`}>{formatTime(slot.startTime).replace(' AM','').replace(' PM','')}</p><p className="text-xs text-gray-400">{formatTime(slot.endTime)}</p></div><div className="w-px h-12 bg-gray-200" /><div className="flex-1"><div className="flex items-center gap-2"><p className={`font-semibold text-sm ${isDone ? 'text-gray-400' : 'text-gray-800'}`}>{slot.courseId?.name}</p>
                        {isNow && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full animate-pulse"> LIVE</span>}
                        {isDone && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Done</span>}
                      </div><p className="text-xs text-gray-400">{slot.courseId?.code}{slot.room ? ` · ${slot.room}` : ''}</p></div><button
                      onClick={() => navigate(`/faculty/attendance?courseId=${slot.courseId?._id}`)}
                      className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${isDone ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      disabled={isDone}>
                       Mark Attendance
                    </button></div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* WEEK VIEW */}
      {tab === 'week' && (
        <div className="space-y-4">
          {week.map(dayData => (
            <div key={dayData.day} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"><div className="px-5 py-3 bg-gray-50 border-b border-gray-100"><h3 className="font-semibold text-gray-700">{dayData.day}</h3></div>
              {dayData.slots.length === 0 ? (
                <p className="text-center text-gray-300 py-4 text-sm">No classes</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {dayData.slots.map(slot => (
                    <div key={slot._id} className="px-5 py-3 flex items-center gap-3"><p className="text-sm font-semibold text-blue-600 w-32">{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</p><div className="flex-1"><p className="font-medium text-gray-700 text-sm">{slot.courseId?.name}</p><p className="text-xs text-gray-400">{slot.courseId?.code}{slot.room ? ` · Room ${slot.room}` : ''}</p></div></div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ALL COURSES */}
      {tab === 'courses' && (
        <div className="space-y-3">
          {courses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-4xl mb-3"></p><p className="text-gray-400">No courses assigned yet.</p></div>
          ) : courses.map(c => (
            <div key={c._id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                {c.code?.slice(0,3)}
              </div><div className="flex-1"><p className="font-semibold text-gray-800 text-sm">{c.name}</p><p className="text-xs text-gray-400">{c.code} · {c.department} · Sem {c.semester}</p><p className="text-xs text-gray-500 mt-1">Next: {c.nextStartTime ? formatTime(c.nextStartTime) : '—'} - {c.nextEndTime ? formatTime(c.nextEndTime) : '—'}</p></div><div className="flex gap-2"><button onClick={() => exportCSV(c)} disabled={csvLoading === c._id}
                  className="px-3 py-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg font-medium disabled:opacity-50">
                  {csvLoading === c._id ? '⏳' : ' CSV'}
                </button><button onClick={() => navigate(`/faculty/attendance?courseId=${c._id}`)}
                  className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-medium">
                   Attendance
                </button><button onClick={() => navigate(`/faculty/marks?courseId=${c._id}`)}
                  className="px-3 py-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg font-medium">
                   Marks
                </button></div></div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default MyCourses