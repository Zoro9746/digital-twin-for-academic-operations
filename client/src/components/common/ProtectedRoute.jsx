import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'

const ROLE_REDIRECT = { admin: '/admin', faculty: '/faculty', student: '/student' }

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useContext(AuthContext)

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />

  // Logged in but wrong role → redirect to their dashboard
  if (roles && !roles.includes(user.role))
    return <Navigate to={ROLE_REDIRECT[user.role] || '/login'} replace />

  return children
}

export default ProtectedRoute
