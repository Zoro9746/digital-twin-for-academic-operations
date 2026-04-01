import { createContext, useContext, useState, useEffect } from 'react'
import { loginUser } from '../services/api'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  // sessionStorage persists across page refreshes but clears when tab is closed
  const [user,    setUser   ] = useState(() => {
    try {
      const s = sessionStorage.getItem('dt_user')
      if (s) {
        // Also sync to localStorage so the API service token header works
        localStorage.setItem('dt_user', s)
        return JSON.parse(s)
      }
      return null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState(null)

  const login = async (email, password) => {
    try {
      setLoading(true); setError(null)
      const { data } = await loginUser({ email, password })
      sessionStorage.setItem('dt_user', JSON.stringify(data))
      localStorage.setItem('dt_user', JSON.stringify(data))
      setUser(data); return data
    } catch (err) { setError(err.response?.data?.message || 'Login failed'); throw err }
    finally { setLoading(false) }
  }

  const logout = () => {
    sessionStorage.removeItem('dt_user')
    localStorage.removeItem('dt_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)