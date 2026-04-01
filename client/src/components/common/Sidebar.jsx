import { NavLink, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext'

const adminLinks = [
  { to: '/admin',             label: 'Dashboard',   section: 'main',     icon: <svg viewBox="0 0 16 16" fill="currentColor" style={{width:16,height:16}}><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" opacity=".3"/></svg> },
  { to: '/admin/students',    label: 'Students',    section: 'main',     icon: <svg viewBox="0 0 16 16" fill="currentColor" style={{width:16,height:16}}><circle cx="8" cy="5" r="3"/><path d="M2 13c0-3.3 2.7-6 6-6s6 2.7 6 6" opacity=".5"/></svg> },
  { to: '/admin/faculty',     label: 'Faculty',     section: 'main',     icon: <svg viewBox="0 0 16 16" fill="currentColor" style={{width:16,height:16}}><circle cx="5.5" cy="5" r="2.5"/><path d="M1 13c0-2.5 2-4.5 4.5-4.5" opacity=".5"/><circle cx="12" cy="5" r="2" opacity=".5"/><path d="M10.5 13c0-2.5 1.8-4.5 4-4.5" opacity=".3"/></svg> },
  { to: '/admin/courses',     label: 'Courses',     section: 'main',     icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><rect x="1.5" y="2" width="13" height="11" rx="1.5" opacity=".5"/><path d="M5 7h6M5 10h4" strokeLinecap="round"/></svg> },
  { to: '/admin/timetable',   label: 'Timetable',   section: 'main',     icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><rect x="1.5" y="3" width="13" height="10.5" rx="1.5" opacity=".4"/><path d="M5 1.5v3M11 1.5v3M1.5 7h13" strokeLinecap="round"/></svg> },
  { to: '/admin/analytics',   label: 'Analytics',   section: 'insights', icon: <svg viewBox="0 0 16 16" fill="currentColor" style={{width:16,height:16}}><rect x="1" y="9" width="3" height="5" rx="1"/><rect x="6" y="5" width="3" height="9" rx="1" opacity=".7"/><rect x="11" y="2" width="3" height="12" rx="1" opacity=".5"/></svg> },
  { to: '/admin/predictions', label: 'Predictions', section: 'insights', badge: false, icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><circle cx="8" cy="8" r="6" opacity=".3"/><path d="M8 5v3.5l2 1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: '/admin/calendar',    label: 'Calendar',    section: 'insights', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" opacity=".4"/><path d="M5 1.5v3M11 1.5v3M1.5 7h13" strokeLinecap="round"/></svg> },
]

const facultyLinks = [
  { to: '/faculty',             label: 'My Courses',  section: 'main', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><rect x="1.5" y="2" width="13" height="11" rx="1.5" opacity=".4"/><path d="M5 7h6M5 10h4" strokeLinecap="round"/></svg> },
  { to: '/faculty/attendance',  label: 'Attendance',  section: 'main', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:16,height:16}}><path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: '/faculty/marks',       label: 'Marks',       section: 'main', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><path d="M4 13V8M8 13V4M12 13V9" strokeLinecap="round"/></svg> },
  { to: '/faculty/performance', label: 'Performance', section: 'main', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><path d="M2 10l4-4 3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { to: '/faculty/petitions',   label: 'Petitions',   section: 'main', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><rect x="2" y="1.5" width="12" height="13" rx="1.5" opacity=".4"/><path d="M5 5.5h6M5 8.5h6M5 11.5h3" strokeLinecap="round"/></svg> },
]

const studentLinks = [
  { to: '/student',           label: 'Dashboard', section: 'main', icon: <svg viewBox="0 0 16 16" fill="currentColor" style={{width:16,height:16}}><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" opacity=".3"/></svg> },
  { to: '/student/petitions', label: 'Petitions', section: 'main', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:16,height:16}}><rect x="2" y="1.5" width="12" height="13" rx="1.5" opacity=".4"/><path d="M5 5.5h6M5 8.5h6M5 11.5h3" strokeLinecap="round"/></svg> },
]

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const links = user?.role === 'admin' ? adminLinks
              : user?.role === 'faculty' ? facultyLinks
              : studentLinks

  const mainLinks    = links.filter(l => l.section === 'main')
  const insightLinks = links.filter(l => l.section === 'insights')

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.role?.[0] || 'U').toUpperCase()

  const handleLogout = () => { logout(); navigate('/login') }

  const NavItem = ({ link }) => (
    <NavLink
      to={link.to}
      end={link.to === '/admin' || link.to === '/student' || link.to === '/faculty'}
      title={link.label}
      className={({ isActive }) =>
        `sidebar-item group/item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative overflow-hidden ${
          isActive
            ? 'bg-indigo-900 text-white font-medium border border-[#312e81] shadow-[inset_2px_0_0_0_#818cf8]'
            : 'text-indigo-200/70 hover:text-white hover:bg-indigo-900/50'
        }`
      }>
      {({ isActive }) => (
        <>
          <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-indigo-300' : 'group-hover/item:text-indigo-200'}`}
            style={{minWidth:16}}>
            {link.icon}
          </span>
          <span className="sidebar-label text-[13px] whitespace-nowrap overflow-hidden w-0 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:w-28 tracking-wide">
            {link.label}
          </span>
        </>
      )}
    </NavLink>
  )

  return (
    <>
      <style>{`
        .sidebar-wrap {
          width: 64px;
          transition: width 0.2s ease-in-out;
          overflow: hidden;
        }
        .sidebar-wrap:hover {
          width: 220px;
        }
        .sidebar-wrap:hover .sidebar-label {
          opacity: 1 !important;
          width: 7.5rem !important;
        }
        .sidebar-wrap:hover .sidebar-section-label {
          opacity: 1 !important;
          max-width: 200px !important;
        }
        .sidebar-wrap:hover .sb-brand-text {
          opacity: 1 !important;
          max-width: 200px !important;
        }
        .sidebar-wrap:hover .sb-user-text {
          opacity: 1 !important;
          max-width: 200px !important;
        }
        .sidebar-wrap:hover .sb-logout {
          display: flex !important;
        }
        .sidebar-wrap .sidebar-item {
          justify-content: flex-start;
        }
        .sidebar-wrap::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-wrap::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 4px;
        }
        .sidebar-wrap:hover::-webkit-scrollbar-thumb {
          background-color: #312e81;
        }
      `}</style>

      {/* Using #0f172a (slate-900) or #1e1b4b (indigo-950) for the deep navy sidebar */}
      <aside className="sidebar-wrap group flex flex-col h-full flex-shrink-0 bg-[#0f172a] border-r border-[#1e293b] z-40 relative shadow-xl"
             style={{ minWidth: 64 }}>

        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#1e293b] bg-[#0c1222]" style={{minHeight:64}}>
          <div className="w-8 h-8 rounded bg-indigo-900 flex items-center justify-center flex-shrink-0 shadow-sm border border-[#312e81]">
            <svg viewBox="0 0 16 16" fill="#818cf8" style={{width:16,height:16}}>
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="6" rx="1" opacity=".8"/>
              <rect x="1" y="9" width="6" height="6" rx="1" opacity=".8"/>
              <rect x="9" y="9" width="6" height="6" rx="1" opacity=".5"/>
            </svg>
          </div>
          <div className="sb-brand-text overflow-hidden opacity-0 max-w-0 transition-opacity duration-300 relative z-10" style={{whiteSpace:'nowrap'}}>
            <p className="text-[14px] font-bold text-slate-100 leading-tight tracking-wide">Digital Twin</p>
            <p className="text-[11px] text-indigo-300/80 font-medium">University Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto overflow-x-hidden">

          <div className="sidebar-section-label overflow-hidden opacity-0 max-w-0 transition-opacity duration-300 text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2" style={{whiteSpace:'nowrap'}}>
            Primary
          </div>
          <div className="space-y-1 mb-6">
            {mainLinks.map(link => <NavItem key={link.to} link={link} />)}
          </div>

          {insightLinks.length > 0 && (
            <>
              <div className="sidebar-section-label overflow-hidden opacity-0 max-w-0 transition-opacity duration-300 text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 mb-2" style={{whiteSpace:'nowrap'}}>
                Insights
              </div>
              <div className="space-y-1">
                {insightLinks.map(link => <NavItem key={link.to} link={link} />)}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#1e293b] bg-[#0c1222]">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-indigo-900 border border-[#312e81] flex items-center justify-center text-xs font-semibold text-slate-100 flex-shrink-0"
              style={{ minWidth: 32 }}>
              {initials}
            </div>
            <div className="sb-user-text overflow-hidden opacity-0 max-w-0 transition-opacity duration-300 flex-1" style={{whiteSpace:'nowrap'}}>
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-indigo-300/80 capitalize">{user?.role}</p>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="sb-logout hidden items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-900/30 flex-shrink-0 w-8 h-8 rounded-md mt-1 transition-colors">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[14px] h-[14px]" strokeLinecap="round">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6"/>
              </svg>
            </button>
          </div>
        </div>

      </aside>
    </>
  )
}

export default Sidebar