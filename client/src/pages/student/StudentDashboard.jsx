import { useState, useEffect, useContext } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'
import { AuthContext } from '../../context/AuthContext'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'

const formatTime = (timeStr) => {
  if (!timeStr || timeStr === '—') return timeStr;
  const [h, m] = timeStr.split(':');
  if (!h || !m) return timeStr;
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

//  helpers 
const pctColor = (p) =>
  p >= 85 ? 'text-green-600' : p >= 80 ? 'text-yellow-500' : 'text-red-500'

const barColor = (p) =>
  p >= 85 ? '#22c55e' : p >= 80 ? '#eab308' : '#ef4444'

const riskLabel = (p) =>
  p >= 85 ? { label: 'Safe', bg: 'bg-green-100 text-green-700 border-green-200' }
    : p >= 80 ? { label: 'Borderline', bg: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
      : p >= 70 ? { label: 'At Risk', bg: 'bg-orange-100 text-orange-700 border-orange-200' }
        : { label: 'Critical', bg: 'bg-red-100 text-red-700 border-red-200' }

const MiniBar = ({ pct, color }) => (
  <div className="flex items-center gap-2 w-full"><div className="flex-1 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} /></div><span className="text-xs font-semibold w-8 text-right" style={{ color }}>{pct}%</span></div>
)

//  Academic Analysis component 
const AISuggestions = ({ studentId }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    API.get(`/suggestions/student/${studentId}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [studentId])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /><p className="text-sm text-gray-400 font-medium">Analysing your subjects...</p></div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
  )

  if (!data) return null

  const { summary, courses } = data

  const HEALTH = {
    critical: { border: 'border-red-300', bg: 'bg-red-50', dot: 'bg-red-500', label: 'Needs Urgent Attention', labelColor: 'text-red-600' },
    warning: { border: 'border-yellow-300', bg: 'bg-yellow-50', dot: 'bg-yellow-500', label: 'Needs Improvement', labelColor: 'text-yellow-600' },
    good: { border: 'border-green-200', bg: 'bg-white', dot: 'bg-green-500', label: 'On Track', labelColor: 'text-green-600' },
  }

  const SG = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    success: 'text-green-700 bg-green-50 border-green-200',
    info: 'text-blue-700 bg-blue-50 border-blue-200',
  }

  return (
    <div className="space-y-5">

      {/*  Summary header  */}
      <div className="bg-slate-800 rounded-xl p-6 text-white mb-6 shadow-sm"><div className="flex items-center gap-3 mb-5"><span className="text-2xl text-indigo-400">🎓</span><div><p className="font-serif font-bold text-xl tracking-wide">Subject-wise Academic Analysis</p><p className="text-slate-300 text-sm mt-0.5">Personalised insights for each of your courses</p></div></div><div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Avg Attendance', value: summary.avgAttendance != null ? `${summary.avgAttendance}%` : '—', sub: summary.avgAttendance >= 80 ? 'Safe' : 'At Risk' },
          { label: 'Avg Marks', value: summary.avgMarks != null ? `${summary.avgMarks}%` : '—', sub: summary.avgMarks >= 60 ? 'Good' : 'Needs Focus' },
          { label: 'Strongest', value: summary.strongestCourse?.code || '—', sub: summary.strongestCourse ? `${summary.strongestCourse.mark}%` : 'No data' },
          { label: 'Needs Focus', value: summary.weakestCourse?.code || '—', sub: summary.weakestCourse ? `${summary.weakestCourse.mark}%` : 'No data' },
        ].map(c => (
          <div key={c.label} className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 text-center transition-colors hover:bg-slate-700/50"><p className="text-xl font-bold font-mono">{c.value}</p><p className="text-slate-300 text-xs mt-1 uppercase tracking-wider">{c.label}</p><p className="text-indigo-300 text-[10px] mt-1.5 font-medium">{c.sub}</p></div>
        ))}
      </div></div>

      {/*  Per-subject cards  */}
      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100"><p className="text-4xl mb-3"></p><p className="text-gray-400">No courses found. Enrol in courses first.</p></div>
      ) : courses.map((c, idx) => {
        const hCfg = HEALTH[c.health] || HEALTH.good
        return (
          <div key={idx} className={`rounded-2xl border-2 ${hCfg.border} ${hCfg.bg} overflow-hidden`}>
            {/* Subject header */}
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100"><div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-700 font-bold text-xs border border-gray-200 flex-shrink-0">
              {c.courseCode?.slice(0, 3)}
            </div><div className="flex-1"><p className="font-bold text-gray-800">{c.courseName}</p><p className="text-xs text-gray-400">{c.courseCode} · Semester {c.semester}</p></div><div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${hCfg.dot}`} /><span className={`text-xs font-semibold ${hCfg.labelColor}`}>{hCfg.label}</span></div></div><div className="px-5 py-4 grid grid-cols-2 gap-4">
              {/* Attendance snapshot */}
              <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 mb-3"> Attendance</p>
                {c.attendance ? (
                  <><div className="flex items-end gap-1 mb-2"><p className={`text-3xl font-bold ${c.attendance.pct >= 80 ? 'text-green-600' : 'text-red-500'}`}>{c.attendance.pct}%</p><p className="text-xs text-gray-400 mb-1">{c.attendance.attended}/{c.attendance.total} classes</p></div><div className="w-full bg-gray-100 rounded-full h-2 mb-2"><div className={`h-2 rounded-full ${c.attendance.pct >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(c.attendance.pct, 100)}%` }} /></div><div className="flex items-center justify-between text-[11px]"><span className="text-gray-400">Recent: {c.attendance.recentPct}%</span><span className={c.attendance.trend === 'improving' ? 'text-green-500' : c.attendance.trend === 'declining' ? 'text-red-500' : 'text-gray-400'}>
                      {c.attendance.trend === 'improving' ? '↑' : c.attendance.trend === 'declining' ? '↓' : '→'} {c.attendance.trend}
                    </span></div><div className="mt-2 text-[10px] text-gray-300 text-center">80% minimum required</div></>
                ) : <p className="text-sm text-gray-300 text-center py-2">No records yet</p>}
              </div>

              {/* Marks snapshot */}
              <div className="bg-white rounded-xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500 mb-3"> Marks</p>
                {c.marks.length > 0 ? (
                  <><div className="flex items-end gap-1 mb-2"><p className={`text-3xl font-bold ${c.avgMark >= 50 ? 'text-blue-600' : 'text-orange-500'}`}>{c.avgMark}%</p><p className="text-xs text-gray-400 mb-1">avg</p></div><div className="space-y-1.5">
                    {c.marks.map((m, i) => (
                      <div key={i}><div className="flex justify-between text-[11px] text-gray-500 mb-0.5"><span>{m.label}</span><span className="font-semibold">{m.score}/{m.maxScore} · {m.percentage}%</span></div><div className="w-full bg-gray-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${m.percentage >= 50 ? 'bg-blue-400' : 'bg-orange-400'}`}
                        style={{ width: `${m.percentage}%` }} /></div></div>
                    ))}
                  </div></>
                ) : <p className="text-sm text-gray-300 text-center py-2">No marks yet</p>}
              </div></div>

            {/* Suggestions for this subject */}
            <div className="px-5 pb-4 space-y-2"><p className="text-xs font-semibold text-gray-500 mb-2"> Suggestions for this subject</p>
              {c.suggestions.map((s, i) => (
                <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${SG[s.type] || SG.info}`}><span className="flex-shrink-0 text-base">{s.icon}</span><p className="leading-relaxed">{s.text}</p></div>
              ))}
            </div></div>
        )
      })}
    </div>
  )
}

//  Main Dashboard 
const StudentDashboard = () => {
  const { user } = useContext(AuthContext)
  const [student, setStudent] = useState(null)
  const [attData, setAttData] = useState([])
  const [marksData, setMarksData] = useState([])
  const [predict, setPredict] = useState(null)
  const [timetable, setTimetable] = useState([])
  const [scheduleView, setScheduleView] = useState('today')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [error, setError] = useState(null)
  const [pdfLoad, setPdfLoad] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        // Step 1: get student id first (needed for other calls)
        const sRes = await API.get('/students/me')
        const s = sRes.data
        setStudent(s)

        // Step 2: fire all remaining calls in parallel
        const [attRes, marksRes, predRes, schedRes] = await Promise.all([
          API.get(`/attendance/student/${s._id}`),
          API.get(`/marks/student/${s._id}`),
          API.get(`/analytics/predict/${s._id}`).catch(() => ({ data: null })),
          API.get(`/timetable/student/${s._id}`).catch(() => ({ data: [] })),
        ])
        setAttData(Array.isArray(attRes.data) ? attRes.data : [])
        setMarksData(Array.isArray(marksRes.data) ? marksRes.data : [])
        setPredict(predRes.data)
        setTimetable(Array.isArray(schedRes.data) ? schedRes.data : [])
      } catch (e) { setError(e.response?.data?.message || 'Failed to load') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const downloadPDF = async () => {
    if (!student) return
    try {
      setPdfLoad(true)
      const token = JSON.parse(localStorage.getItem('dt_user'))?.token
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${API_URL}/reports/student/${student._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `report-${student.rollNo}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { setError('Failed to generate PDF') }
    finally { setPdfLoad(false) }
  }

  // Build merged course data
  const marksByCourseId = (() => {
    const map = {}
    for (const entry of (Array.isArray(marksData) ? marksData : [])) {
      const cid = entry?.course?._id || entry?.courseId
      if (!cid) continue
      map[cid.toString()] = Array.isArray(entry?.exams) ? entry.exams : []
    }
    return map
  })()

  const courses = attData.map(a => {
    const courseId = a.course?._id || a.courseId
    const exams = courseId ? (marksByCourseId[courseId.toString()] || []) : []
    const avgMark = exams.length
      ? Math.round(exams.reduce((s, m) => s + (m.percentage || 0), 0) / exams.length)
      : null
    const pct = a.percentage || 0
    const risk = riskLabel(pct)
    return {
      _id: courseId,
      name: a.course?.name || 'Unknown',
      code: a.course?.code || '',
      attendance: pct,
      attended: a.attended || 0,
      total: a.total || 0,
      marks: exams,
      avgMark,
      risk,
      overallScore: avgMark != null ? Math.round(pct * 0.6 + avgMark * 0.4) : pct,
    }
  })

  const overallAttendance = courses.length
    ? Math.round(courses.reduce((s, c) => s + c.attendance, 0) / courses.length)
    : 0
  const overallScore = courses.length
    ? Math.round(courses.reduce((s, c) => s + c.overallScore, 0) / courses.length)
    : 0
  const atRiskCount = courses.filter(c => c.attendance < 80).length

  // Radar chart data
  const radarData = courses.map(c => ({
    course: c.code,
    Attendance: c.attendance,
    Marks: c.avgMark || 0,
  }))

  // Bar chart attendance
  const attBarData = courses.map(c => ({ name: c.code, value: c.attendance }))

  // AI data payload
  const aiData = {
    name: student?.userId?.name || user?.name,
    department: student?.department,
    semester: student?.semester,
    overallAttendance,
    overallScore,
    courses: courses.map(c => ({
      name: c.name, code: c.code, attendance: c.attendance,
      attended: c.attended, total: c.total, risk: c.risk.label,
      marks: c.marks.map(m => ({ examType: m.examType, score: m.score, maxScore: m.maxScore, percentage: m.percentage }))
    }))
  }

  if (loading) return (
    <Layout><div className="space-y-3 animate-pulse"><div className="h-28 bg-gray-100 rounded-2xl" /><div className="grid grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
    </div><div className="h-48 bg-gray-100 rounded-2xl" /></div></Layout>
  )

  return (
    <Layout>
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-7 mb-6 text-white shadow-sm border border-slate-700"><div className="flex items-center justify-between"><div><p className="text-slate-300 text-sm mb-1 uppercase tracking-widest">Student Portal</p><h1 className="text-3xl font-bold font-serif">{student?.userId?.name || user?.name}</h1><p className="text-slate-300 text-sm mt-1.5 flex gap-2 items-center">
        <span className="bg-slate-700 px-2 py-0.5 rounded text-white font-mono text-xs shadow-inner border border-slate-600/50">{student?.rollNo}</span>
        <span>· {student?.department} · Semester {student?.semester}</span>
      </p></div><button onClick={downloadPDF} disabled={pdfLoad}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium border border-indigo-500 transition-colors shadow flex items-center gap-2">
          {pdfLoad ? 'Generating...' : 'Download Academic Report'}
        </button></div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Avg Attendance', value: `${overallAttendance}%`, ok: overallAttendance >= 80 },
            { label: 'Overall Score', value: `${overallScore}%`, ok: overallScore >= 70 },
            { label: 'Enrolled Courses', value: courses.length, ok: true },
            { label: 'At Risk Courses', value: atRiskCount, ok: atRiskCount === 0 },
          ].map(s => (
            <div key={s.label} className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-center hover:bg-slate-700/50 transition-colors"><p className={`text-2xl font-bold font-mono ${s.ok ? 'text-white' : 'text-red-400'}`}>{s.value}</p><p className="text-slate-300 text-[11px] mt-1 uppercase tracking-wider">{s.label}</p></div>
          ))}
        </div></div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap pb-4 border-b border-slate-200">
        {[['overview', 'Overview'], ['courses', 'Courses'], ['marks', 'Marks'], ['schedule', 'My Schedule'], ['ai', 'Academic Analysis']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${tab === key ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Charts row */}
          <div className="grid grid-cols-2 gap-5">
            {/* Attendance bar chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><h3 className="font-semibold text-slate-800 text-[13px] uppercase tracking-wider mb-5">Attendance Ledger</h3>
              {attBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}><BarChart data={attBarData} margin={{ top: 0, bottom: 0, left: -20, right: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip formatter={v => `${v}%`} cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {attBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= 80 ? '#4f46e5' : '#ef4444'} />
                  ))}
                </Bar></BarChart></ResponsiveContainer>
              ) : <p className="text-center text-slate-400 py-12 text-sm font-medium">No active data points</p>}
            </div>

            {/* Radar chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"><h3 className="font-semibold text-slate-800 text-[13px] uppercase tracking-wider mb-5">Performance Radar</h3>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}><RadarChart data={radarData}><PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="course" tick={{ fontSize: 10, fill: '#64748b' }} /><Radar name="Attendance" dataKey="Attendance" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} /><Radar name="Marks" dataKey="Marks" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} /><Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} /></RadarChart></ResponsiveContainer>
              ) : <p className="text-center text-slate-400 py-12 text-sm font-medium">No active data points</p>}
            </div></div>

          {/* Prediction box */}
          {predict?.predictions?.length > 0 && (() => {
            // Aggregate across all courses for overall prediction
            const preds = predict.predictions
            const avgCurrent = Math.round(preds.reduce((s, p) => s + p.overallPct, 0) / preds.length)
            const avgProjected = Math.round(preds.reduce((s, p) => s + p.projectedPct, 0) / preds.length)
            const avgRecent = Math.round(preds.reduce((s, p) => s + p.recentPct, 0) / preds.length)
            const worstRisk = preds.reduce((w, p) => {
              const o = { critical: 0, at_risk: 1, borderline: 2, safe: 3 }
              return o[p.riskLevel] < o[w] ? p.riskLevel : w
            }, 'safe')
            const riskColor = worstRisk === 'safe' ? 'bg-green-50 border-green-100'
              : worstRisk === 'critical' ? 'bg-red-50 border-red-100'
                : 'bg-orange-50 border-orange-100'
            const riskBadge = worstRisk === 'safe' ? 'bg-green-200 text-green-800'
              : worstRisk === 'critical' ? 'bg-red-200 text-red-800'
                : 'bg-orange-200 text-orange-800'
            const riskIcon = worstRisk === 'safe' ? '' : worstRisk === 'critical' ? '' : ''
            return (
              <div className={`rounded-2xl border p-5 ${riskColor}`}><div className="flex items-center gap-3 mb-4"><span className="text-2xl">{riskIcon}</span><div><p className="font-bold text-gray-800">Predictive Forecast</p><p className="text-xs text-gray-500">Based on your last 10 classes trend</p></div><span className={`ml-auto text-sm px-3 py-1 rounded-full font-semibold capitalize ${riskBadge}`}>
                {worstRisk.replace('_', ' ')}
              </span></div><div className="grid grid-cols-3 gap-3 mb-4"><div className="bg-white/60 rounded-xl p-3 text-center"><p className="text-xl font-bold text-gray-800">{avgCurrent}%</p><p className="text-xs text-gray-400">Current</p></div><div className="bg-white/60 rounded-xl p-3 text-center"><p className={`text-xl font-bold ${avgProjected >= 80 ? 'text-green-600' : 'text-red-500'}`}>{avgProjected}%</p><p className="text-xs text-gray-400">Projected</p></div><div className="bg-white/60 rounded-xl p-3 text-center"><p className="text-xl font-bold text-blue-600">{avgRecent}%</p><p className="text-xs text-gray-400">Recent Trend</p></div></div><div className="space-y-2">
                  {preds.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/50 rounded-lg px-3 py-2"><span className="text-xs font-semibold text-gray-500 w-16 flex-shrink-0">{p.course?.code}</span><div className="flex-1 bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full ${p.projectedPct >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(p.projectedPct, 100)}%` }} /></div><span className={`text-xs font-bold w-10 text-right ${p.projectedPct >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                        {p.projectedPct}%
                      </span><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize
                          ${p.riskLevel === 'safe' ? 'bg-green-100 text-green-700'
                          : p.riskLevel === 'critical' ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'}`}>
                        {p.riskLevel.replace('_', ' ')}
                      </span></div>
                  ))}
                </div></div>
            )
          })()}
        </div>
      )}

      {/* COURSES TAB */}
      {tab === 'courses' && (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200"><p className="text-slate-500 font-medium">No courses officially enrolled.</p></div>
          ) : courses.map(c => {
            const consecutiveNeeded = Math.ceil((0.8 * c.total - c.attended) / 0.2)
            const classesNeeded = c.attendance < 80 ? Math.max(0, consecutiveNeeded) : 0
            const isImpossible = consecutiveNeeded > 30 // Rough estimate of impossible schedule remaining
            return (
              <div key={c._id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-800 text-[15px]">{c.name}</p>
                    <p className="text-[12px] text-slate-500 font-mono mt-0.5">{c.code}</p>
                  </div>
                  <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-md border font-bold ${c.risk.bg}`}>
                    {c.risk.label}
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Attendance ({c.attended}/{c.total} classes)</span>
                      <span className={`font-bold ${pctColor(c.attendance)}`}>{c.attendance}%</span>
                    </div>
                    <MiniBar pct={c.attendance} color={barColor(c.attendance)} />
                  </div>
                  {c.avgMark != null && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Average Marks</span>
                        <span className={`font-bold ${c.avgMark >= 50 ? 'text-indigo-600' : 'text-red-600'}`}>{c.avgMark}%</span>
                      </div>
                      <MiniBar pct={c.avgMark} color={c.avgMark >= 50 ? '#4338ca' : '#dc2626'} />
                    </div>
                  )}
                </div>

                {c.attendance < 80 && isImpossible ? (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-[12px] text-red-700 font-medium leading-relaxed">System flag: Statistically impossible to reach 80% attendance mandate even with complete presence for remaining predicted term length.</div>
                ) : c.attendance < 80 && classesNeeded > 0 ? (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-[12px] text-red-700 leading-relaxed">Requirement: <strong>{classesNeeded} contiguous classes</strong> needed to satisfy the 80% academic threshold.</div>
                ) : null}

                {c.attendance >= 80 && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[12px] text-emerald-800 leading-relaxed">Compliant: Buffered by an allowance of <strong>{Math.floor(c.attended - 0.8 * c.total)}</strong> safety misses before falling to risk.</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MARKS TAB */}
      {tab === 'marks' && (
        <div className="space-y-4">
          {courses.filter(c => c.marks.length > 0).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-4xl mb-3"></p><p className="text-gray-400">No marks uploaded yet.</p></div>
          ) : courses.filter(c => c.marks.length > 0).map(c => (
            <div key={c._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><div className="flex items-center justify-between mb-4"><div><p className="font-semibold text-gray-800">{c.name}</p><p className="text-xs text-gray-400">{c.code}</p></div>
              {c.avgMark != null && (
                <div className="text-right"><p className={`text-2xl font-bold ${c.avgMark >= 50 ? 'text-blue-600' : 'text-red-500'}`}>{c.avgMark}%</p><p className="text-xs text-gray-400">Average</p></div>
              )}
            </div><div className="space-y-3">
                {c.marks.map(m => (
                  <div key={m._id}><div className="flex justify-between text-xs text-gray-500 mb-1"><span className="font-medium text-gray-700 capitalize">
                    {m.examType === 'internal1' ? 'Internal I' : m.examType === 'internal2' ? 'Internal II' : m.examType === 'midterm' ? 'Midterm' : m.examType}
                  </span><span>{m.score} / {m.maxScore} · <span className={m.percentage >= 50 ? 'text-blue-600 font-semibold' : 'text-red-500 font-semibold'}>{m.percentage}%</span></span></div><MiniBar pct={m.percentage} color={m.percentage >= 50 ? '#3b82f6' : '#ef4444'} /></div>
                ))}
              </div></div>
          ))}
        </div>
      )}

      {/* MY SCHEDULE TAB */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2 mb-2 flex-wrap">
            <button
              onClick={() => setScheduleView('today')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${scheduleView === 'today' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Today
            </button>
            <button
              onClick={() => setScheduleView('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${scheduleView === 'week' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              This Week
            </button>
          </div>

          {(() => {
            const todayName = new Date().toLocaleString('en-US', { weekday: 'long' })
            const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            const sortedByTime = (arr) =>
              [...arr].sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))

            const todayClasses = sortedByTime(timetable.filter(t => t?.day === todayName))

            const weekGroups = order.map(d => ({
              day: d,
              classes: sortedByTime(timetable.filter(t => t?.day === d)),
            }))

            if (scheduleView === 'today') {
              if (!todayClasses.length) {
                return (
                  <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <p className="text-gray-400 font-medium">No classes today!</p>
                  </div>
                )
              }

              return (
                <div className="space-y-3">
                  {todayClasses.map(slot => (
                    <div key={slot._id} className="bg-white rounded-xl border shadow-sm px-5 py-4 flex items-center gap-4">
                      <div className="min-w-[220px]">
                        <p className="font-semibold text-gray-800 text-sm">{slot?.course?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{slot?.faculty?.name || '—'}</p>
                      </div>
                      <div className="w-px h-10 bg-gray-200" />
                      <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {slot?.startTime ? formatTime(slot.startTime) : '—'} - {slot?.endTime ? formatTime(slot.endTime) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {weekGroups.map(group => (
                  <div key={group.day} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-700">{group.day}</h3>
                    </div>
                    {group.classes.length === 0 ? (
                      <p className="text-center text-gray-300 py-4 text-sm">No classes</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {group.classes.map(slot => (
                          <div key={slot._id} className="px-5 py-3 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm truncate">{slot?.course?.name || '—'}</p>
                              <p className="text-xs text-gray-400 truncate">{slot?.faculty?.name || '—'}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                              {slot?.startTime ? formatTime(slot.startTime) : '—'} - {slot?.endTime ? formatTime(slot.endTime) : '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* AI SUGGESTIONS TAB */}
      {tab === 'ai' && (
        <div>
          {courses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-gray-400">Enroll in courses first to get AI analysis.</p></div>
          ) : (
            <AISuggestions studentId={student?._id} />
          )}
        </div>
      )}
    </Layout>
  )
}

export default StudentDashboard
//  Suggestions component