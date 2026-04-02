import axios from 'axios'

export const API_ORIGIN = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN.replace(/\/$/, '')}/api` : '/api';

const API = axios.create({ baseURL: API_BASE_URL })

API.interceptors.request.use((config) => {
  const s = localStorage.getItem('dt_user')
  if (s) {
    const { token } = JSON.parse(s);
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

API.interceptors.response.use(
  (response) => response,
  (err) => {
    const status = err.response?.status
    const isNetworkError = err.message === 'Network Error'

    if (isNetworkError) {
      console.error('Backend connectivity issue: The server might be down or not responding.')
    }

    // Consistent UX: if the token is invalid/expired, drop session and go to login.
    if (status === 401) {
      localStorage.removeItem('dt_user')
      sessionStorage.removeItem('dt_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(err)
  }
)

export const loginUser = (d) => API.post('/auth/login', d)
export const registerUser = (d) => API.post('/auth/register', d)
export const getMe = () => API.get('/auth/me')

export const getStudents = (params) => API.get('/students', params ? { params } : undefined)
export const getMyStudent = () => API.get('/students/me')
export const getStudent = (id) => API.get(`/students/${id}`)
export const createStudent = (d) => API.post('/students', d)
export const updateStudent = (id, d) => API.put(`/students/${id}`, d)
export const deleteStudent = (id) => API.delete(`/students/${id}`)
export const enrollStudent = (id, d) => API.post(`/students/${id}/enroll`, d)

export const getFaculty = () => API.get('/faculty')
export const getMyFaculty = () => API.get('/faculty/me')
export const getFacultyById = (id) => API.get(`/faculty/${id}`)
export const createFaculty = (d) => API.post('/faculty', d)
export const updateFaculty = (id, d) => API.put(`/faculty/${id}`, d)
export const deleteFaculty = (id) => API.delete(`/faculty/${id}`)
export const assignCourse = (id, d) => API.put(`/faculty/${id}/assign-course`, d)

export const getCourses = () => API.get('/courses')
export const getCourse = (id) => API.get(`/courses/${id}`)
export const createCourse = (d) => API.post('/courses', d)
export const updateCourse = (id, d) => API.put(`/courses/${id}`, d)
export const deleteCourse = (id) => API.delete(`/courses/${id}`)

export const markAttendance = (d) => API.post('/attendance', d)
export const getCourseAttendance = (id) => API.get(`/attendance/course/${id}`)
export const getStudentAttendance = (id) => API.get(`/attendance/student/${id}`)
export const getCourseSummary = (id) => API.get(`/attendance/summary/${id}`)

export const getAlerts = () => API.get('/alerts')
export const markAlertRead = (id) => API.put(`/alerts/${id}/read`)
export const markAllRead = () => API.put('/alerts/read-all')

export const getCalendar = (month) => API.get(`/calendar${month ? `?month=${month}` : ''}`)
export const createCalEntry = (d) => API.post('/calendar', d)
export const updateCalEntry = (id, d) => API.put(`/calendar/${id}`, d)
export const deleteCalEntry = (id) => API.delete(`/calendar/${id}`)

export const uploadMarksBulk = (d) => API.post('/marks/upload-bulk', d)
export const getCourseMarks = (id) => API.get(`/marks/course/${id}`)
export const getStudentMarks = (id) => API.get(`/marks/student/${id}`)

export const getAnalyticsOverview = () => API.get('/analytics/overview')
export const getAtRiskStudents = () => API.get('/analytics/at-risk')
export const getDepartmentStats = () => API.get('/analytics/department')

export default API
