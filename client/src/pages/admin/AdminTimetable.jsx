import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TIMES = [
  '08:00', '08:50', '09:00', '09:50', '10:00', '10:40', '10:50', 
  '11:00', '11:40', '12:00', '12:30', '13:00', '13:30', '14:00', 
  '14:20', '15:00', '15:10', '15:20', '16:00', '16:10', '17:00'
]

const DEPT_COLORS = { 
  CSE:   'bg-indigo-50 border border-indigo-100 text-indigo-700', 
  ECE:   'bg-slate-100 border border-slate-200 text-slate-700', 
  MECH:  'bg-amber-50 border border-amber-200 text-amber-800', 
  CIVIL: 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
}

const formatTime = (timeStr) => {
  if (!timeStr || timeStr === '—') return timeStr;
  const [h, m] = timeStr.split(':');
  if (!h || !m) return timeStr;
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 transition-opacity">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all scale-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-xl font-medium w-8 h-8 flex items-center justify-center rounded hover:bg-slate-50">✕</button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
)

const AdminTimetable = () => {
  const [entries,  setEntries ] = useState([])
  const [courses,  setCourses ] = useState([])
  const [faculty,  setFaculty ] = useState([])
  const [loading,  setLoading ] = useState(true)
  const [modal,    setModal   ] = useState(false)
  const [editing,  setEditing ] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [error,    setError   ] = useState(null)
  const [selectedDept, setSelectedDept] = useState('All')

  const blank = { courseId:'', facultyId:'', dayOfWeek:'1', startTime:'09:00', endTime:'10:00', room:'' }
  const [form, setForm] = useState(blank)

  useEffect(() => {
    Promise.all([
      API.get('/timetable'),
      API.get('/courses'),
      API.get('/faculty'),
    ]).then(([t, c, f]) => {
      setEntries(t.data)
      setCourses(c.data)
      setFaculty(f.data)
    }).catch(e => setError(e.response?.data?.message || 'Failed to load'))
    .finally(() => setLoading(false))
  }, [])

  const openAdd  = ()  => { setEditing(null); setForm(blank); setModal(true) }
  const openEdit = (e) => {
    setEditing(e._id)
    setForm({
      courseId:  e.courseId?._id  || '',
      facultyId: e.facultyId?._id || '',
      dayOfWeek: String(e.dayOfWeek),
      startTime: e.startTime,
      endTime:   e.endTime,
      room:      e.room || '',
    })
    setModal(true)
  }

  const save = async () => {
    try {
      if (editing) {
        const r = await API.put(`/timetable/${editing}`, form)
        setEntries(prev => prev.map(e => e._id === editing ? r.data : e))
      } else {
        const r = await API.post('/timetable', form)
        setEntries(prev => [...prev, r.data])
      }
      setModal(false)
    } catch (e) { alert(e.response?.data?.message || 'Failed to apply schedule') }
  }

  const remove = async (id) => {
    if (!confirm('Drop this course instance from the master timetable?')) return
    await API.delete(`/timetable/${id}`)
    setEntries(prev => prev.filter(e => e._id !== id))
  }

  const filteredEntries = selectedDept === 'All' 
    ? entries 
    : entries.filter(e => e.courseId?.department === selectedDept);

  const departments = ['All', ...Array.from(new Set(courses.map(c => c.department))).filter(Boolean)];

  const gridTimes = Array.from(new Set([...filteredEntries.map(e => e.startTime)])).sort();
  if (gridTimes.length === 0) gridTimes.push('09:00');

  const grid = {}
  for (let d = 1; d <= 5; d++) {
    grid[d] = {}
    for (const t of gridTimes) grid[d][t] = []
  }
  for (const e of filteredEntries) {
    if (grid[e.dayOfWeek]?.[e.startTime] !== undefined)
      grid[e.dayOfWeek][e.startTime].push(e)
  }

  const inp = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900'

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 font-serif pb-1">Master Timetable</h1>
          <p className="text-sm text-slate-500">Global academic scheduling overlay and allocations.</p>
        </div>
        <div className="flex gap-2.5">
          <select 
            value={selectedDept} 
            onChange={e => setSelectedDept(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] hover:bg-slate-50 focus:outline-none"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept === 'All' ? 'Cross-Faculty' : dept}</option>
            ))}
          </select>
          <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">
            {viewMode === 'grid' ? '≡ List Format' : '▦ Grid Overlay'}
          </button>
          <button onClick={openAdd}
            className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-[13px] font-medium shadow-sm hover:bg-slate-800 transition-colors">
            + Schedule Course
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {error}
      </div>}

      {loading ? (
        <div className="text-center text-slate-500 font-medium py-16 text-sm">Loading Grid Layout...</div>
      ) : viewMode === 'grid' ? (
        /*  GRID VIEW  */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto mb-6">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest w-20 text-center">Time</th>
                {[1,2,3,4,5].map(d => (
                  <th key={d} className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">{DAYS[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gridTimes.map((time, ti) => (
                <tr key={time} className={ti % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                  <td className="px-3 py-2 text-[11px] font-mono text-slate-500 align-top pt-4 border-r border-slate-100 text-center">{formatTime(time)}</td>
                  {[1,2,3,4,5].map(d => (
                    <td key={d} className="px-2 py-2 align-top min-w-[140px] border-r border-slate-100 last:border-0">
                      {grid[d][time]?.map(e => {
                        const dept = e.courseId?.department
                        const color = DEPT_COLORS[dept] || 'bg-slate-50 border border-slate-200 text-slate-700'
                        return (
                          <div key={e._id} className={`rounded-md p-2 mb-2 group relative transition-all ${color}`}>
                            <p className="text-[12px] font-bold leading-tight mb-1 pr-4">{e.courseId?.name}</p>
                            <div className="text-[10px] space-y-0.5 opacity-80">
                              <p className="font-mono">{e.courseId?.code}</p>
                              {e.room && <p className="font-medium bg-white/40 inline-block px-1 rounded">{e.room}</p>}
                              <p>{e.facultyId?.userId?.name}</p>
                              <p>{formatTime(e.startTime)}–{formatTime(e.endTime)}</p>
                            </div>
                            
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                              <button onClick={() => openEdit(e)} className="bg-white rounded border border-slate-200 shadow-sm p-1 text-slate-600 hover:text-indigo-700 hover:bg-slate-50">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => remove(e._id)} className="bg-white rounded border border-slate-200 shadow-sm p-1 text-slate-600 hover:text-red-600 hover:bg-red-50">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /*  LIST VIEW  */
        <div className="space-y-4">
          {filteredEntries.length === 0 && <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-500 text-sm font-medium">No schedule allocations detected.</div>}
          {[1,2,3,4,5].map(d => {
            const dayEntries = filteredEntries.filter(e => e.dayOfWeek === d).sort((a,b) => a.startTime.localeCompare(b.startTime))
            if (!dayEntries.length) return null
            return (
              <div key={d} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-700 text-sm">{DAYS[d]} Overview</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {dayEntries.map(e => (
                    <div key={e._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <span className="text-[12px] font-mono text-slate-500 w-28 bg-slate-100 px-2 py-1 rounded text-center shrink-0 border border-slate-200">
                        {formatTime(e.startTime)}–{formatTime(e.endTime)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                          <span className="font-bold text-slate-800 text-[13px] truncate">{e.courseId?.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{e.courseId?.code}</span>
                        </div>
                        <div className="text-[12px] text-slate-600 mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1"><svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>{e.facultyId?.userId?.name}</span>
                          {e.room && <span className="flex items-center gap-1 border-l border-slate-300 pl-2 text-slate-500"><svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>{e.room}</span>}
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${DEPT_COLORS[e.courseId?.department] || 'bg-slate-100 text-slate-600'}`}>{e.courseId?.department}</span>
                      
                      <div className="flex gap-1 shrink-0 ml-4">
                        <button onClick={() => openEdit(e)} className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 rounded px-2.5 py-1.5 text-[11px] font-medium transition-colors">Edit</button>
                        <button onClick={() => remove(e._id)} className="bg-white text-red-600 border border-slate-200 hover:bg-red-50 hover:border-red-200 rounded px-2.5 py-1.5 text-[11px] font-medium transition-colors">Drop</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title={editing ? 'Revise Allocation' : 'Schedule Instance'} onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Academic Course</label>
              <select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))} className={inp}>
                <option value="">-- Disconnected --</option>
                {courses.map(c =><option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Allocated Faculty</label>
              <select value={form.facultyId} onChange={e => setForm(f => ({ ...f, facultyId: e.target.value }))} className={inp}>
                <option value="">-- Unassigned --</option>
                {faculty.map(f =><option key={f._id} value={f._id}>{f.userId?.name} — {f.department}</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Day</label>
                <select value={form.dayOfWeek} onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))} className={inp}>
                  {[1,2,3,4,5].map(d =><option key={d} value={d}>{DAYS[d]}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Start Time</label>
                <select value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={inp}>
                  {TIMES.map(t =><option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">End Time</label>
                <select value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className={inp}>
                  {TIMES.map(t =><option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Location String (Optional)</label>
              <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. EC-101" className={inp} />
            </div>
            
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={save} className="flex-1 px-4 py-2 bg-indigo-900 text-white rounded-lg text-[13px] font-medium hover:bg-slate-800 transition-colors shadow-sm">
                {editing ? 'Commit Revision' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

export default AdminTimetable
