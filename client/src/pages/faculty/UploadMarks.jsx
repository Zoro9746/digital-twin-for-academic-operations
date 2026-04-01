import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'
import { getStudents } from '../../services/api'

const EXAM_TYPES = [
  { value: 'internal1', label: 'Internal 1', max: 50 },
  { value: 'internal2', label: 'Internal 2', max: 50 },
  { value: 'midterm',   label: 'Midterm',    max: 100 },
  { value: 'final',     label: 'Final',      max: 100 },
]

const UploadMarks = () => {
  const [courses,         setCourses        ] = useState([])
  const [selectedCourse,  setSelectedCourse ] = useState('')
  const [courseLoading,   setCourseLoading  ] = useState(true)
  const [examType,        setExamType       ] = useState('internal1')
  const [maxScore,        setMaxScore       ] = useState(50)
  const [students,        setStudents       ] = useState([])
  const [scores,          setScores         ] = useState({})
  const [loading,         setLoading        ] = useState(false)
  const [submitting,      setSubmitting     ] = useState(false)
  const [error,           setError          ] = useState(null)
  const [success,         setSuccess        ] = useState(null)
  const [existingMarks,   setExistingMarks  ] = useState({})

  useEffect(() => {
    API.get('/faculty/me')
      .then(({ data }) => setCourses(data.assignedCourses || []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load courses'))
      .finally(() => setCourseLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    const load = async () => {
      try {
        setLoading(true)
        const res = await getStudents({ courseId: selectedCourse, limit: 500 })
        const allStudents = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.students) ? res.data.students : [])
        setStudents(allStudents)

        // Load existing marks for this course
        const { data: marks } = await API.get(`/marks/course/${selectedCourse}`)
        const map = {}
        marks.forEach(m => {
          const key = `${m.studentId._id || m.studentId}-${m.examType}`
          map[key] = m.score
        })
        setExistingMarks(map)

        // Pre-fill scores
        const defaults = {}
        allStudents.forEach(s => {
          const key = `${s._id}-${examType}`
          defaults[s._id] = map[key] ?? ''
        })
        setScores(defaults)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [selectedCourse])

  // Update pre-filled scores when exam type changes
  useEffect(() => {
    if (!students.length) return
    const defaults = {}
    students.forEach(s => {
      const key = `${s._id}-${examType}`
      defaults[s._id] = existingMarks[key] ?? ''
    })
    setScores(defaults)
    const found = EXAM_TYPES.find(e => e.value === examType)
    if (found) setMaxScore(found.max)
  }, [examType, existingMarks])

  const handleSubmit = async () => {
    setError(null); setSuccess(null)
    const records = students
      .filter(s => scores[s._id] !== '' && scores[s._id] !== undefined)
      .map(s => ({ studentId: s._id, score: Number(scores[s._id]) }))

    if (!records.length) return setError('Please enter at least one score')

    const invalid = records.find(r => r.score < 0 || r.score > maxScore)
    if (invalid) return setError(`Scores must be between 0 and ${maxScore}`)

    try {
      setSubmitting(true)
      await API.post('/marks/upload-bulk', { courseId: selectedCourse, examType, maxScore, records })
      setSuccess(` Marks uploaded for ${records.length} students systematically.`)
      // Refresh existing marks
      const { data: marks } = await API.get(`/marks/course/${selectedCourse}`)
      const map = {}
      marks.forEach(m => { map[`${m.studentId._id || m.studentId}-${m.examType}`] = m.score })
      setExistingMarks(map)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload marks')
    } finally { setSubmitting(false) }
  }

  const filledCount = Object.values(scores).filter(v => v !== '').length

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 font-serif pb-1">Upload Marks</h1>
          <p className="text-sm text-slate-500">Record assessment scores directly into the academic ledger.</p>
        </div>
      </div>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2"><svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2"><svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{success}</div>}

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

      {selectedCourse && (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center pl-4">
          <div className="flex-1 flex gap-4 items-center">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Assessment Term</label>
            <select value={examType} onChange={e => setExamType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900 min-w-[140px]">
              {EXAM_TYPES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
          <div className="flex items-center gap-3 pr-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Max Capacity</label>
            <input type="number" value={maxScore} min={1} onChange={e => setMaxScore(Number(e.target.value))}
              className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 text-center focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900" />
          </div>
        </div>
      )}

      {loading && <div className="text-center text-slate-500 font-medium py-16 text-sm">Initializing Student Ledger...</div>}

      {!selectedCourse && !loading && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <svg className="w-10 h-10 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-slate-700 font-medium text-sm">Select a course above</p>
          <p className="text-slate-500 text-xs mt-1">To unlock the grading inputs.</p>
        </div>
      )}

      {!loading && selectedCourse && students.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm"><p className="text-slate-500 font-medium text-sm">No students currently enrolled.</p></div>
      )}

      {!loading && students.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <p className="text-[13px] font-semibold text-slate-800 tracking-wide">
              {EXAM_TYPES.find(e => e.value === examType)?.label} Ledger — Graded out of {maxScore}
            </p>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-200/50 text-slate-600 border border-slate-200">
              {filledCount} / {students.length} Entries
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {students.map((student, idx) => {
              const pct = scores[student._id] !== '' && scores[student._id] !== undefined
                ? Math.round((Number(scores[student._id]) / maxScore) * 100)
                : null
              return (
                <div key={student._id} className="flex items-center px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="w-10 text-[11px] text-slate-400 font-medium font-mono">{String(idx + 1).padStart(2, '0')}</div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-slate-800">{student.userId?.name || student.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{student.rollNo}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {pct !== null && (
                      <span className={`text-[12px] font-bold w-10 text-right ${pct >= 50 ? 'text-indigo-800' : 'text-red-600'}`}>
                        {pct}%
                      </span>
                    )}
                    <div className="relative flex items-center">
                      <input
                        type="number" min={0} max={maxScore}
                        value={scores[student._id] ?? ''}
                        onChange={e => setScores(prev => ({ ...prev, [student._id]: e.target.value }))}
                        placeholder="—"
                        className="w-20 px-3 py-1.5 border border-slate-200 bg-white rounded-md text-[13px] text-center font-medium focus:outline-none focus:border-indigo-900 focus:ring-1 focus:ring-indigo-900"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">/ {maxScore}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button onClick={handleSubmit} disabled={submitting}
              className="px-6 py-2.5 bg-indigo-900 hover:bg-slate-800 text-white font-medium rounded-lg text-[13px] transition-colors shadow-sm disabled:opacity-60">
              {submitting ? 'Committing Ledger...' : `Confirm Upload — ${EXAM_TYPES.find(e => e.value === examType)?.label}`}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default UploadMarks
