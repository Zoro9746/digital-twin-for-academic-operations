import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/common/Layout'
import API from '../../services/api'
import { AuthContext } from '../../context/AuthContext'

const StatCard = ({ label, value, icon, color, bg }) => (
  <div className={`rounded-xl border shadow-sm p-5 ${bg}`}><div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold tracking-wide text-gray-400">{label}</p><span className="text-2xl">{icon}</span></div><p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p></div>
)

const AdminDashboard = () => {
  const { user }           = useContext(AuthContext)
  const navigate           = useNavigate()
  const [stats, setStats ] = useState(null)
  const [loading, setLoad] = useState(true)

  useEffect(() => {
    API.get('/analytics/overview')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  const quickLinks = [
    { label: 'Students',   icon: '', path: '/admin/students'    },
    { label: 'Faculty',    icon: '', path: '/admin/faculty'     },
    { label: 'Courses',    icon: '', path: '/admin/courses'      },
    { label: 'Analytics',  icon: '', path: '/admin/analytics'   },
    { label: 'Calendar',   icon: '', path: '/admin/calendar'    },
  ]

  return (
    <Layout><div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.name} </h1><p className="text-gray-400 text-sm mt-1">Admin Dashboard</p></div></div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8"><StatCard label="TOTAL STUDENTS" value={stats?.totalStudents}  icon="" color="text-blue-600"   bg="bg-blue-50 border-blue-100"   /><StatCard label="TOTAL FACULTY"  value={stats?.totalFaculty}   icon="" color="text-green-600"  bg="bg-green-50 border-green-100"  /><StatCard label="TOTAL COURSES"  value={stats?.totalCourses}   icon="" color="text-purple-600" bg="bg-purple-50 border-purple-100" /><StatCard label="AVG ATTENDANCE" value={stats?.avgAttendance != null ? `${stats.avgAttendance}%` : '—'}
            icon=""
            color={stats?.avgAttendance >= 80 ? 'text-green-600' : 'text-red-500'}
            bg="bg-white border-gray-100" /><StatCard label="AT-RISK STUDENTS" value={stats?.atRiskCount}  icon="" color="text-orange-500" bg="bg-orange-50 border-orange-100" /><StatCard label="UNREAD ALERTS"  value={stats?.unreadAlerts}   icon="" color="text-yellow-600" bg="bg-yellow-50 border-yellow-100" /></div>
      )}

      {/* Quick Access */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"><h2 className="font-semibold text-gray-700 mb-4"> Quick Access</h2><div className="grid grid-cols-5 gap-3">
          {quickLinks.map(link => (
            <button key={link.path} onClick={() => navigate(link.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-colors"><span className="text-3xl">{link.icon}</span><span className="text-xs font-medium text-gray-600">{link.label}</span></button>
          ))}
        </div></div></Layout>
  )
}

export default AdminDashboard
