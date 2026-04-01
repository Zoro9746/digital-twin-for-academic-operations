import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

const AdminAnalytics = () => {
  const [overview, setOverview] = useState(null)
  const [atRisk, setAtRisk] = useState([])
  const [deptData, setDeptData] = useState([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [ovRes, riskRes, deptRes] = await Promise.all([
          API.get('/analytics/overview'),
          API.get('/analytics/at-risk'),
          API.get('/analytics/department'),
        ])
        setOverview(ovRes.data)
        setAtRisk(Array.isArray(riskRes.data) ? riskRes.data : [])
        setDeptData(Array.isArray(deptRes.data) ? deptRes.data : [])
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  // Pie chart data: above vs below 80%
  const pieData = overview ? [
    { name: 'Above 80%', value: (overview.totalStudents || 0) - (overview.atRiskCount || 0) },
    { name: 'Below 80%', value: overview.atRiskCount || 0 },
  ] : []

  if (loading) return (
    <Layout><div className="text-center text-gray-400 py-20">Loading analytics...</div></Layout>
  )

  return (
    <Layout><div className="mb-6"><h1 className="text-2xl font-bold text-gray-800"> Analytics</h1><p className="text-gray-500 text-sm mt-1">Real-time academic intelligence.</p></div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Stat cards */}
      {overview && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'AVG ATTENDANCE', value: `${overview.avgAttendance ?? 0}%`, color: overview.avgAttendance >= 80 ? 'text-green-600' : 'text-red-500' },
            { label: 'AT-RISK', value: overview.atRiskCount ?? 0, color: 'text-orange-500' },
            { label: 'TOTAL STUDENTS', value: overview.totalStudents ?? 0, color: 'text-gray-800' },
            { label: 'UNREAD ALERTS', value: overview.unreadAlerts ?? 0, color: 'text-yellow-600' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"><p className="text-xs font-semibold text-gray-400 tracking-wide mb-2">{card.label}</p><p className={`text-3xl font-bold ${card.color}`}>{card.value}</p></div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[['overview', ' Overview'], ['atRisk', ' At Risk'], ['dept', ' By Department']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-6"><div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"><h3 className="font-semibold text-gray-700 mb-4">Attendance Risk Distribution</h3>
          {pieData[0]?.value > 0 || pieData[1]?.value > 0 ? (
            <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}><Cell fill="#10b981" /><Cell fill="#ef4444" /></Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-gray-300">No data yet</div>
          )}
        </div><div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"><h3 className="font-semibold text-gray-700 mb-4">Dept-wise Avg Attendance</h3>
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}><BarChart data={deptData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="department" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} /><Tooltip formatter={(v) => `${v}%`} /><Bar dataKey="avgAttendance" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            ) : (
              <div className="text-center py-16 text-gray-300">No data yet</div>
            )}
          </div></div>
      )}

      {/* At Risk tab */}
      {tab === 'atRisk' && (
        <div><p className="text-sm text-gray-500 mb-4">
          {atRisk.length} student{atRisk.length !== 1 ? 's' : ''} below 80% in at least one course
        </p>
          {atRisk.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-4xl mb-3"></p><p className="text-green-600 font-semibold">All students are above 80%!</p></div>
          ) : (
            <div className="space-y-3">
              {atRisk.map((entry, idx) => {
                const s = entry?.student
                const courses = Array.isArray(entry?.courses) ? entry.courses : []
                if (!s) return null
                return (
                  <div key={s._id || idx} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"><div className="flex items-center gap-3 mb-3"><p className="font-semibold text-gray-800">{s.name || 'Unknown'}</p><span className="text-xs text-gray-400">{s.rollNo}</span><span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s.department}</span></div><div className="space-y-2">
                    {courses.map((c, i) => {
                      const pct = c?.percentage ?? 0
                      const barColor = pct < 60 ? 'bg-red-500' : pct < 75 ? 'bg-orange-400' : 'bg-yellow-400'
                      return (
                        <div key={i}><div className="flex justify-between text-xs text-gray-600 mb-1"><span>{c?.course?.name} <span className="text-gray-400">({c?.course?.code})</span></span><span className="font-semibold text-red-500">{pct}%</span></div><div className="w-full bg-gray-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} /></div></div>
                      )
                    })}
                  </div></div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* By Department tab */}
      {tab === 'dept' && (
        <div className="grid grid-cols-2 gap-4">
          {deptData.map(d => (
            <div key={d.department} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"><div className="flex justify-between items-start mb-3"><div><p className="font-bold text-gray-800 text-lg">{d.department}</p><p className="text-xs text-gray-400">{d.studentCount} students</p></div><span className={`text-2xl font-bold ${d.avgAttendance >= 80 ? 'text-green-600' : 'text-red-500'}`}>
              {d.avgAttendance}%
            </span></div><div className="w-full bg-gray-100 rounded-full h-3"><div
              className={`h-3 rounded-full transition-all ${d.avgAttendance >= 80 ? 'bg-green-500' : 'bg-red-400'}`}
              style={{ width: `${d.avgAttendance}%` }}
            /></div><div className="flex justify-between text-xs text-gray-400 mt-1"><span>0%</span><span className="text-orange-500 font-medium">80% min</span><span>100%</span></div></div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default AdminAnalytics
