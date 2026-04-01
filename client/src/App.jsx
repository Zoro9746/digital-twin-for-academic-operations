import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'

import Login from './pages/Login'

import AdminDashboard    from './pages/admin/AdminDashboard'
import AdminStudents     from './pages/admin/AdminStudents'
import AdminFaculty      from './pages/admin/AdminFaculty'
import AdminCourses      from './pages/admin/AdminCourses'
import AdminAnalytics    from './pages/admin/AdminAnalytics'
import AdminCalendar     from './pages/admin/AdminCalendar'
import AdminPredictions  from './pages/admin/AdminPredictions'
import AdminTimetable    from './pages/admin/AdminTimetable'

import MyCourses                 from './pages/faculty/MyCourses'
import MarkAttendance            from './pages/faculty/MarkAttendance'
import UploadMarks               from './pages/faculty/UploadMarks'
import FacultyPetitions          from './pages/faculty/FacultyPetitions'
import FacultyStudentPerformance from './pages/faculty/FacultyStudentPerformance'

import StudentDashboard from './pages/student/StudentDashboard'
import StudentPetitions from './pages/student/StudentPetitions'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/admin"             element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students"    element={<ProtectedRoute roles={['admin']}><AdminStudents /></ProtectedRoute>} />
          <Route path="/admin/faculty"     element={<ProtectedRoute roles={['admin']}><AdminFaculty /></ProtectedRoute>} />
          <Route path="/admin/courses"     element={<ProtectedRoute roles={['admin']}><AdminCourses /></ProtectedRoute>} />
          <Route path="/admin/analytics"   element={<ProtectedRoute roles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/calendar"    element={<ProtectedRoute roles={['admin']}><AdminCalendar /></ProtectedRoute>} />
          <Route path="/admin/predictions" element={<ProtectedRoute roles={['admin']}><AdminPredictions /></ProtectedRoute>} />
          <Route path="/admin/timetable"   element={<ProtectedRoute roles={['admin']}><AdminTimetable /></ProtectedRoute>} />

          <Route path="/faculty"             element={<ProtectedRoute roles={['faculty']}><MyCourses /></ProtectedRoute>} />
          <Route path="/faculty/attendance"  element={<ProtectedRoute roles={['faculty']}><MarkAttendance /></ProtectedRoute>} />
          <Route path="/faculty/marks"       element={<ProtectedRoute roles={['faculty']}><UploadMarks /></ProtectedRoute>} />
          <Route path="/faculty/petitions"   element={<ProtectedRoute roles={['faculty']}><FacultyPetitions /></ProtectedRoute>} />
          <Route path="/faculty/performance" element={<ProtectedRoute roles={['faculty']}><FacultyStudentPerformance /></ProtectedRoute>} />

          <Route path="/student"           element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/petitions" element={<ProtectedRoute roles={['student']}><StudentPetitions /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App