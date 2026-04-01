import { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

const ROLE_REDIRECT = { admin: '/admin', faculty: '/faculty', student: '/student' }

const DEMO_CREDS = [
  { role: 'Admin',   email: 'admin@college.edu',        password: 'Admin@123', color: '#2563eb' },
  { role: 'Faculty', email: 'cse.faculty1@college.edu', password: 'Pass@123',  color: '#16a34a' },
  { role: 'Student', email: 'cse.s001@college.edu',     password: 'Pass@123',  color: '#7c3aed' },
]

const Login = () => {
  const { login, loading, error, user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [email,    setEmail   ] = useState('')
  const [password, setPassword] = useState('')
  const [localErr, setLocalErr] = useState(null)

  useEffect(() => {
    if (user?.role) navigate(ROLE_REDIRECT[user.role] || '/', { replace: true })
  }, [user, navigate])

  const handleLogin = async () => {
    setLocalErr(null)
    if (!email.trim() || !password.trim()) return setLocalErr('Please enter email and password')
    try {
      const data = await login(email.trim(), password)
      const path = ROLE_REDIRECT[data.role]
      if (path) navigate(path, { replace: true })
      else setLocalErr('Unknown role: ' + data.role)
    } catch { }
  }

  const fillCreds = (cred) => { setEmail(cred.email); setPassword(cred.password); setLocalErr(null) }
  const handleKey = (e) => { if (e.key === 'Enter') handleLogin() }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e1b4b 100%)' }}>

      {/* Glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Top stripe */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #2563eb, #7c3aed)' }} />

          <div className="px-8 py-8">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <svg viewBox="0 0 16 16" fill="white" className="w-5 h-5">
                  <rect x="1" y="1" width="6" height="6" rx="1.5"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".6"/>
                  <rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".6"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5" opacity=".35"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight tracking-tight">Digital Twin</h1>
                <p className="text-xs text-gray-400 mt-0.5">Academic Operations Platform</p>
              </div>
            </div>

            {/* Error */}
            {(localErr || error) && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-lg mb-5 flex items-center gap-2">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 6a1 1 0 011 1v2a1 1 0 01-2 0V8a1 1 0 011-1zm0-2.5a1 1 0 110 2 1 1 0 010-2z"/>
                </svg>
                {localErr || error}
              </div>
            )}

            {/* Fields */}
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={handleKey} placeholder="admin@college.edu" autoFocus
                  className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-800 placeholder-gray-300
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKey} placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-800 placeholder-gray-300
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all" />
              </div>
            </div>

            {/* Submit */}
            <button onClick={handleLogin} disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg
                text-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 shadow-md shadow-blue-200">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" className="w-3.5 h-3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h10M9 4l4 4-4 4"/>
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Demo creds */}
          <div className="px-8 pb-7">
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Demo Credentials</p>
              </div>
              {DEMO_CREDS.map(cred => (
                <button key={cred.role} onClick={() => fillCreds(cred)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cred.color }} />
                  <span className="text-xs font-semibold text-gray-600 w-14">{cred.role}</span>
                  <span className="text-xs text-gray-400 font-mono truncate flex-1">{cred.email}</span>
                  <span className="text-[10px] text-gray-300 font-medium">click</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-white/25 text-xs mt-5">
          Digital Twin for Academic Operations — v2.0
        </p>
      </div>
    </div>
  )
}

export default Login