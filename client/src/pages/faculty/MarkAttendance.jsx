import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import { markAttendance, getStudents } from '../../services/api'
import API from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLORS = {
  present: 'bg-emerald-600 text-white border-transparent',
  absent:  'bg-red-600 text-white border-transparent',
  late:    'bg-amber-500 text-white border-transparent',
}

const MarkAttendance = () => {
  const { user } = useAuth()

  const [courses,         setCourses        ] = useState([])
  const [selectedCourse,  setSelectedCourse ] = useState('')
  const [courseLoading,   setCourseLoading  ] = useState(true)
  const [date,            setDate           ] = useState(new Date().toISOString().slice(0, 10))
  const [students,        setStudents       ] = useState([])
  const [attendance,      setAttendance     ] = useState({})
  const [loading,         setLoading        ] = useState(false)
  const [submitting,      setSubmitting     ] = useState(false)
  const [error,           setError          ] = useState(null)
  const [success,         setSuccess        ] = useState(false)
  const [alreadyMarked,   setAlreadyMarked  ] = useState(false)

  // Load this faculty's assigned courses using /faculty/me
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const { data } = await API.get('/faculty/me')
        setCourses(data.assignedCourses || [])
      } catch (err) {
        console.error('Could not load courses:', err)
      } finally {
        setCourseLoading(false)
      }
    }
    loadCourses()
  }, [user])

  // Load enrolled students when a course is selected
  useEffect(() => {
    if (!selectedCourse) return
    const loadStudents = async () => {
      try {
        setLoading(true)
        setError(null)
        setSuccess(false)
        setAlreadyMarked(false)

        const res = await getStudents({ courseId: selectedCourse, limit: 500 })
        const allStudents = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.students) ? res.data.students : [])
        setStudents(allStudents)

        const defaults = {}
        allStudents.forEach(s => { defaults[s._id] = 'present' })
        setAttendance(defaults)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load students')
      } finally {
        setLoading(false)
      }
    }
    loadStudents()
  }, [selectedCourse])

  const toggleStatus = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status) => {
    const all = {}
    students.forEach(s => { all[s._id] = status })
    setAttendance(all)
  }

  const handleSubmit = async () => {
    if (!selectedCourse || !date || !students.length) return
    try {
      setSubmitting(true)
      setError(null)
      const records = students.map(s => ({
        studentId: s._id,
        status:    attendance[s._id] || 'absent',
      }))
      await markAttendance({ courseId: selectedCourse, date, records })
      setSuccess(true)
      setAlreadyMarked(true)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark attendance'
      if (msg.toLowerCase().includes('already')) setAlreadyMarked(true)
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const absentCount  = Object.values(attendance).filter(s => s === 'absent').length
  const lateCount    = Object.values(attendance).filter(s => s === 'late').length

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 font-serif pb-1">Mark Attendance</h1>
          <p className="text-sm text-slate-500">Record daily logs for your academic sessions.</p>
        </div>
      </div>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2"><svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2"><svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Attendance roster committed securely!</div>}

      {/* Course Selection Toolbar (Matching Performance Tab) */}
      {courseLoading ? (
        <div className="text-slate-500 font-medium py-4 text-sm">Loading Your Courses...</div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-4">
          {courses.length === 0 && <p className="text-slate-500 text-sm">No active courses assigned.</p>}
          {courses.map(c => (
            <button key={c._id} onClick={() => setSelectedCourse(c._id)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                selectedCourse === c._id
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              {c.name} <span className={`text-[11px] ml-1 ${selectedCourse === c._id ? 'text-indigo-200' : 'text-slate-400'}`}>({c.code})</span>
            </button>
          ))}
        </div>
      )}

      {/* Date Selector Row */}
      {selectedCourse && (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-6 flex items-center max-w-sm">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-2 pr-4">Session Date</label>
          <div className="flex-1 border-l border-slate-200 pl-4">
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900 font-mono"
            />
          </div>
        </div>
      )}

      {loading && <div className="text-center text-slate-500 font-medium py-16 text-sm">Loading Student Directory...</div>}

      {!selectedCourse && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <svg className="w-10 h-10 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-slate-700 font-medium text-sm">Select a course module</p>
          <p className="text-slate-500 text-xs mt-1">To view the active attendance directory.</p>
        </div>
      )}

      {!loading && selectedCourse && students.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm"><p className="text-slate-500 font-medium text-sm">No students found associated with this record.</p></div>
      )}

      {!loading && students.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">

          {/* Header with bulk actions + summary */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex gap-2.5">
              <button disabled={alreadyMarked} onClick={() => markAll('present')} className="px-3 py-1.5 text-[12px] bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                 Set All Present
              </button>
              <button disabled={alreadyMarked} onClick={() => markAll('absent')} className="px-3 py-1.5 text-[12px] bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                 Set All Absent
              </button>
            </div>
            <div className="flex gap-4.5 text-[13px] font-medium bg-white px-4 py-1.5 border border-slate-200 rounded-md shadow-sm">
              <span className="text-emerald-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{presentCount} Present</span>
              <span className="text-red-600 flex items-center gap-1.5 ml-2"><span className="w-2 h-2 rounded-full bg-red-500"></span>{absentCount} Absent</span>
              <span className="text-amber-600 flex items-center gap-1.5 ml-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span>{lateCount} Late</span>
            </div>
          </div>

          {/* Student rows */}
          <div className="divide-y divide-slate-100">
            {students.map((student, idx) => (
              <div key={student._id} className="flex items-center px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-10 text-[11px] text-slate-400 font-medium font-mono">{String(idx + 1).padStart(2, '0')}</div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-800">{student.userId?.name || student.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{student.rollNo}</p>
                </div>

                {/* Status toggles */}
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/50">
                  {['present', 'absent', 'late'].map(s => {
                    const isSelected = attendance[student._id] === s
                    return (
                      <button
                        key={s}
                        disabled={alreadyMarked}
                        onClick={() => toggleStatus(student._id, s)}
                        className={`w-8 h-7 flex items-center justify-center rounded text-[11px] font-bold transition-all border ${
                          isSelected
                            ? STATUS_COLORS[s]
                            : 'bg-transparent text-slate-500 hover:bg-white hover:text-slate-800 border-transparent hover:border-slate-300 hover:shadow-sm'
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                        title={s.charAt(0).toUpperCase() + s.slice(1)}
                      >
                        {s.charAt(0).toUpperCase()}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit button */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || alreadyMarked}
              className="px-6 py-2.5 bg-indigo-900 hover:bg-slate-800 text-white font-medium rounded-lg text-[13px] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Committing...'
               : alreadyMarked ? 'Roster Already Finalized'
               : `Finalize Log for Selected Date`}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default MarkAttendance
