import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">University Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              {/* Avatar + name */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 text-sm font-semibold flex-shrink-0">
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 capitalize">{user?.role}</p>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-slate-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                title="Logout">
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/80 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout