import { useState, useEffect, useContext, useRef } from 'react'
import { AuthContext } from '../../context/AuthContext'
import API, { API_ORIGIN } from '../../services/api'
import { io } from 'socket.io-client'

const NotificationBell = () => {
  const { user } = useContext(AuthContext)
  const [alerts, setAlerts] = useState([])
  const [open, setOpen] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [socketError, setSocketError] = useState(null)
  const socketRef = useRef(null)
  const dropRef = useRef(null)

  const unread = alerts.filter(a => !a.isRead).length

  const load = async () => {
    try {
      setLoadError(null)
      const { data } = await API.get('/alerts')
      setAlerts(data.slice(0, 15))
    } catch {
      setLoadError('Failed to load notifications')
    }
  }

  useEffect(() => {
    load()

    // Connect socket using JWT (server joins `user:<id>` room after verification)
    let socket = null
    try {
      const token = JSON.parse(localStorage.getItem('dt_user'))?.token
      if (token) {
        if (!API_ORIGIN) throw new Error('Missing VITE_API_URL')
        socket = io(API_ORIGIN.replace(/\/$/, ''), { auth: { token } })
        socketRef.current = socket

        socket.on('connect', () => setSocketError(null))
        socket.on('connect_error', (err) => {
          const msg = err?.message || 'Socket connection failed'
          setSocketError(msg)

          // Keep behavior consistent with HTTP 401 responses.
          if (String(msg).toLowerCase().includes('unauthorized')) {
            localStorage.removeItem('dt_user')
            sessionStorage.removeItem('dt_user')
            window.location.href = '/login'
          }
        })

        socket.on('alert:new', (alert) => {
          setAlerts(prev => [alert, ...prev].slice(0, 15))
        })
      }
    } catch { }

    return () => { if (socket) socket.disconnect() }
  }, [user?._id])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    try {
      await API.put('/alerts/read-all')
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
    } catch { }
  }

  const markRead = async (id) => {
    try {
      await API.put(`/alerts/${id}/read`)
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a))
    } catch { }
  }

  return (
    <div className="relative" ref={dropRef}><button onClick={() => setOpen(o => !o)}
      className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"><span className="text-xl"></span>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden"><div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"><p className="font-semibold text-sm text-gray-800">Notifications {unread > 0 && <span className="text-blue-500">({unread} new)</span>}</p>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-blue-500 hover:text-blue-700">Mark all read</button>
          )}
        </div><div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {loadError ? (
              <div className="text-center py-8 text-red-500 text-sm px-4">{loadError}</div>
            ) : socketError ? (
              <div className="text-center py-8 text-gray-500 text-sm px-4">{socketError}</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No notifications yet</div>
            ) : alerts.map(a => (
              <div key={a._id}
                onClick={() => !a.isRead && markRead(a._id)}
                className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!a.isRead ? 'bg-blue-50/60' : ''}`}><div className="flex gap-2"><span className="mt-0.5 flex-shrink-0">
                  {a.type === 'LOW_ATTENDANCE' ? '' : ''}
                </span><div><p className={`text-sm leading-snug ${!a.isRead ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                  {a.message}
                </p><p className="text-xs text-gray-300 mt-1">
                      {new Date(a.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p></div>
                  {!a.isRead && <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div></div>
            ))}
          </div></div>
      )}
    </div>
  )
}

export default NotificationBell
