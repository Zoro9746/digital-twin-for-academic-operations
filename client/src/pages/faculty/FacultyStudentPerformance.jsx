import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const RISK = {
  critical:   { label: 'Critical',   color: 'bg-red-50 text-red-700 border-red-200',         bar: 'bg-red-600'    },
  at_risk:    { label: 'At Risk',    color: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-500' },
  borderline: { label: 'Borderline', color: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' },
  safe:       { label: 'Safe',       color: 'bg-emerald-50 text-emerald-700 border-emerald-200',    bar: 'bg-emerald-600'  },
}

const getRisk = (pct) => pct >= 85 ? 'safe' : pct >= 80 ? 'borderline' : pct >= 70 ? 'at_risk' : 'critical'

const Bar = ({ pct, colorClass }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
    <span className="text-sm font-medium w-8 text-right text-slate-500">{pct}%</span>
  </div>
)

const FacultyStudentPerformance = () => {
  const [courses,         setCourses        ] = useState([])
  const [selectedCourse,  setSelectedCourse ] = useState(null)
  const [students,        setStudents       ] = useState([])
  const [loading,         setLoading        ] = useState(false)
  const [courseLoading,   setCourseLoading  ] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [filter,          setFilter         ] = useState('all')
  const [search,          setSearch         ] = useState('')
  const [sortBy,          setSortBy         ] = useState('name')
  const [error,           setError          ] = useState(null)

  useEffect(() => {
    API.get('/faculty/me')
      .then(r => setCourses(r.data.assignedCourses || []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load courses'))
      .finally(() => setCourseLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    setLoading(true)
    setStudents([])
    setSelectedStudent(null)

    Promise.all([
      API.get('/students', { params: { courseId: selectedCourse._id, limit: 500 } }),
      API.get(`/attendance/summary/${selectedCourse._id}`),
      API.get(`/marks/course/${selectedCourse._id}`),
    ]).then(([stuRes, attRes, marksRes]) => {
      const attMap = {}
      for (const a of (attRes.data || [])) {
        const sid = a.student?._id?.toString()
        if (sid) attMap[sid] = a
      }
      const marksMap = {}
      for (const m of (marksRes.data || [])) {
        const sid = (m.studentId?._id || m.studentId)?.toString()
        if (!marksMap[sid]) marksMap[sid] = []
        marksMap[sid].push(m)
      }

      const enrolled = stuRes.data?.students || []

      const merged = enrolled.map(s => {
        const sid     = s._id?.toString()
        const att     = attMap[sid]
        const marks   = marksMap[sid] || []
        const attPct  = att ? att.percentage : 0
        const avgMark = marks.length
          ? Math.round(marks.reduce((sum, m) => sum + (m.percentage || 0), 0) / marks.length)
          : null
        return {
          student:      { _id: s._id, userId: s.userId, rollNo: s.rollNo, department: s.department },
          attendance:   attPct,
          attended:     att?.attended || 0,
          total:        att?.total || 0,
          marks,
          avgMark,
          risk:         getRisk(attPct),
          overallScore: avgMark != null ? Math.round(attPct * 0.6 + avgMark * 0.4) : attPct,
        }
      })
      setStudents(merged)
    }).catch(e => setError(e.response?.data?.message || 'Failed to load'))
    .finally(() => setLoading(false))
  }, [selectedCourse])

  const filtered = students
    .filter(s => filter === 'all' ? true : s.risk === filter)
    .filter(s => {
      if (!search) return true
      const name   = s.student?.userId?.name?.toLowerCase() || ''
      const rollNo = s.student?.rollNo?.toLowerCase() || ''
      return name.includes(search.toLowerCase()) || rollNo.includes(search.toLowerCase())
    })
    .sort((a, b) => {
      if (sortBy === 'attendance') return b.attendance - a.attendance
      if (sortBy === 'marks')      return (b.avgMark || 0) - (a.avgMark || 0)
      if (sortBy === 'overall')    return b.overallScore - a.overallScore
      return (a.student?.userId?.name || '').localeCompare(b.student?.userId?.name || '')
    })

  const counts = {
    all:        students.length,
    safe:       students.filter(s => s.risk === 'safe').length,
    borderline: students.filter(s => s.risk === 'borderline').length,
    at_risk:    students.filter(s => s.risk === 'at_risk').length,
    critical:   students.filter(s => s.risk === 'critical').length,
  }

  const avgAtt  = students.length ? Math.round(students.reduce((s, x) => s + x.attendance, 0) / students.length) : 0
  const avgMark = students.filter(s => s.avgMark != null).length
    ? Math.round(students.filter(s => s.avgMark != null).reduce((s, x) => s + x.avgMark, 0) / students.filter(s => s.avgMark != null).length)
    : null

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800 font-serif pb-1">Student Performance Analytics</h1>
        <p className="text-sm text-slate-500">Review attendance and academic marks for your courses.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {error}
      </div>}

      {/* Course Selection Toolbar */}
      {courseLoading ? (
        <div className="text-slate-500 font-medium py-4 text-sm">Loading Your Courses...</div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-4">
          {courses.length === 0 && <p className="text-slate-500 text-sm">No courses assigned to you yet.</p>}
          {courses.map(c => (
            <button key={c._id} onClick={() => setSelectedCourse(c)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                selectedCourse?._id === c._id
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
              {c.name} <span className={`text-[11px] ml-1 ${selectedCourse?._id === c._id ? 'text-indigo-200' : 'text-slate-400'}`}>({c.code})</span>
            </button>
          ))}
        </div>
      )}

      {!selectedCourse && !courseLoading && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
          <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-slate-700 font-medium text-base">Please select a course</p>
          <p className="text-slate-500 text-sm mt-1">To view the performance metrics for your students.</p>
        </div>
      )}

      {selectedCourse && (
        <>
          {!loading && students.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Enrolled', value: students.length, color: 'text-slate-800' },
                { label: 'Avg Attendance', value: `${avgAtt}%`,    color: avgAtt >= 80 ? 'text-emerald-700' : 'text-red-600' },
                { label: 'Avg Marks',      value: avgMark != null ? `${avgMark}%` : '—', color: 'text-indigo-900' },
                { label: 'Critical / At Risk', value: counts.at_risk + counts.critical, color: 'text-amber-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center sm:text-left">
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">{card.label}</p>
                  <p className={`text-2xl font-bold font-serif ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by student name or roll number..."
                className="w-full bg-transparent border-none text-sm text-slate-700 py-2 pl-9 pr-4 focus:outline-none placeholder-slate-400" />
            </div>

            <div className="hidden md:block h-5 w-px bg-slate-200 mx-2"></div>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-transparent border-none text-slate-600 text-[13px] font-medium py-2 outline-none cursor-pointer">
              <option value="name">Sort by Name</option>
              <option value="attendance">Sort by Attendance</option>
              <option value="marks">Sort by Marks</option>
              <option value="overall">Sort by Overall</option>
            </select>

            <div className="hidden md:block h-5 w-px bg-slate-200 mx-2"></div>

            <div className="flex gap-1 flex-wrap overflow-x-auto pb-1 md:pb-0">
              {[['all','All'],['safe','Safe'],['borderline','Border'],['at_risk','At Risk'],['critical','Critical']].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors ${
                    filter === val ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-50'
                  }`}>
                  {label} <span className={`ml-1 text-[11px] ${filter === val ? 'text-slate-500' : 'text-slate-400'}`}>({counts[val]})</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
             <div className="text-center text-slate-500 font-medium py-16 text-sm">Loading Student Metrics...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm"><p className="text-slate-500 font-medium">No students found matching your criteria.</p></div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map(s => {
                const rCfg  = RISK[s.risk]
                const isOpen = selectedStudent === s.student._id
                const name   = s.student?.userId?.name || 'Unknown'
                return (
                  <div key={s.student._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header Row */}
                    <button className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-none" onClick={() => setSelectedStudent(isOpen ? null : s.student._id)}>
                      <div className="flex items-center gap-4 w-1/3 min-w-0">
                        <div className="min-w-0 pr-4 border-l-2 pl-3 py-1" style={{ borderColor: rCfg.bar.replace('bg-', '') }}>
                          <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{s.student?.rollNo}</p>
                        </div>
                      </div>

                      <div className="hidden lg:flex items-center gap-6 w-1/2">
                        <div className="flex-1">
                          <p className="text-[11px] text-slate-400 font-medium mb-1">Attendance</p>
                          <Bar pct={s.attendance} colorClass={rCfg.bar} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] text-slate-400 font-medium mb-1">Average Marks</p>
                          {s.avgMark != null ? <Bar pct={s.avgMark} colorClass="bg-indigo-900" /> : <p className="text-[11px] text-slate-400 mt-1 italic">Pending inputs</p>}
                        </div>
                        <div className="w-24 flex justify-end">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded font-medium border ${rCfg.color}`}>{rCfg.label}</span>
                        </div>
                      </div>

                      <div className="w-8 flex items-center justify-end text-slate-400">
                        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Content View */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          
                          {/* Attendance Info */}
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h4 className="font-semibold text-slate-800 text-[13px] mb-3 border-b border-slate-100 pb-2">
                              Attendance Details
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-[13px]">
                                <span className="text-slate-500">Classes Attended</span>
                                <span className="font-medium text-slate-800">{s.attended} <span className="text-slate-400 mx-1">/</span> {s.total}</span>
                              </div>
                              <div className="flex justify-between items-center text-[13px]">
                                <span className="text-slate-500">Percentage</span>
                                <span className={`font-semibold ${s.attendance >= 80 ? 'text-emerald-700' : 'text-red-600'}`}>{s.attendance}%</span>
                              </div>
                              <div className="pt-1">
                                <Bar pct={s.attendance} colorClass={rCfg.bar} />
                              </div>
                              
                              <div className="pt-2">
                                {s.attendance < 80 ? (
                                  <div className="bg-red-50 border border-red-100 rounded p-2.5 text-[12px] text-red-700 leading-relaxed">
                                    Attendance is below the 80% mark. Requires <strong>{Math.ceil((0.8 * s.total - s.attended) / 0.2)}</strong> more consecutive classes to reach compliance.
                                  </div>
                                ) : (
                                  <div className="bg-emerald-50 border border-emerald-100 rounded p-2.5 text-[12px] text-emerald-800">
                                    Meeting all basic attendance requirements.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Marks Info */}
                          <div className="bg-white rounded-lg border border-slate-200 p-4">
                            <h4 className="font-semibold text-slate-800 text-[13px] mb-3 border-b border-slate-100 pb-2">
                              Academic Record
                            </h4>
                            {s.marks.length === 0 ? (
                              <div className="h-32 flex flex-col items-center justify-center text-center">
                                <p className="text-[13px] text-slate-500 italic">No grades recorded.</p>
                              </div>
                            ) : (
                              <div className="space-y-3 mt-2">
                                {s.marks.map(m => (
                                  <div key={m._id} className="border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[12px] font-medium text-slate-600">
                                        {m.examType === 'internal1' ? 'Internal I' : m.examType === 'internal2' ? 'Internal II' : m.examType === 'midterm' ? 'Midterm' : m.examType}
                                      </span>
                                      <div className="text-right flex items-baseline gap-2">
                                        <span className="text-[12px] font-medium text-slate-800">{m.score}<span className="text-slate-400 text-[10px] font-normal">/{m.maxScore}</span></span>
                                        <span className={`text-[12px] font-semibold w-8 text-right ${m.percentage >= 50 ? 'text-indigo-900' : 'text-red-600'}`}>{m.percentage}%</span>
                                      </div>
                                    </div>
                                    <Bar pct={m.percentage} colorClass={m.percentage >= 50 ? 'bg-indigo-300' : 'bg-red-400'} />
                                  </div>
                                ))}
                                
                                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                                  <span className="text-[13px] font-semibold text-slate-700">Course Average</span>
                                  <span className={`font-bold text-base ${s.avgMark >= 50 ? 'text-indigo-900' : 'text-red-700'}`}>{s.avgMark}%</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Overall Score Info */}
                          <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col pt-6">
                            <div className="flex flex-col items-center justify-center flex-1">
                              {/* Minimal ring */}
                              <div className="relative w-20 h-20 mb-3">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className={`${s.overallScore >= 80 ? 'text-emerald-500' : s.overallScore >= 60 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000`} strokeDasharray={`${Math.max(0, s.overallScore * 2.26)} 226`} />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <p className="text-xl font-bold font-serif text-slate-800 leading-none">{s.overallScore}</p>
                                </div>
                              </div>
                              
                              <h4 className="font-semibold text-slate-800 text-[13px] mb-1 text-center">
                                Overall Assessment
                              </h4>
                              
                              <p className="text-[11px] text-slate-500 text-center mb-3">
                                Weighted (60% Att. + 40% Marks)
                              </p>
                              
                              <span className={`text-[12px] px-3 py-1 rounded font-medium border ${rCfg.color}`}>
                                {s.overallScore >= 80 ? 'Excellent Status' : s.overallScore >= 60 ? 'Satisfactory Status' : 'Critical Action Required'}
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}

export default FacultyStudentPerformance