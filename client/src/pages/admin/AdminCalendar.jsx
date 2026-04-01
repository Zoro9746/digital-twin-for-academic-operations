import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const TYPE_CONFIG = {
  holiday:     { label: ' Holiday',      color: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-400'    },
  exam:        { label: ' Exam',          color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  working_day: { label: ' Working Day',   color: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-400'  },
  special:     { label: ' Special Event', color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-400'   },
}

const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DEPTS      = ['CSE','ECE','MECH','CIVIL']

const DEFAULT_FORM = {
  title: '', date: '', endDate: '', eventType: 'holiday',
  description: '', periodsPerDay: 7, affectedPeriods: [],
  affectedDepartments: [], excludeFromAttendance: true,
}

const PeriodSelector = ({ periodsPerDay, selected, onChange }) => {
  const toggle = (p) => onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p])
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {Array.from({ length: periodsPerDay }, (_, i) => i + 1).map(p => (
        <button key={p} type="button" onClick={() => toggle(p)}
          className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-all ${
            selected.includes(p) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
          }`}>P{p}</button>
      ))}
      <button type="button" onClick={() => onChange(Array.from({ length: periodsPerDay }, (_, i) => i + 1))}
        className="px-3 h-9 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200">All</button><button type="button" onClick={() => onChange([])}
        className="px-3 h-9 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200">None</button></div>
  )
}

const AdminCalendar = () => {
  const [entries,    setEntries   ] = useState([])
  const [summary,    setSummary   ] = useState(null)
  const [loading,    setLoading   ] = useState(true)
  const [showForm,   setShowForm  ] = useState(false)
  const [editEntry,  setEditEntry ] = useState(null)
  const [form,       setForm      ] = useState(DEFAULT_FORM)
  const [saving,     setSaving    ] = useState(false)
  const [error,      setError     ] = useState(null)
  const [success,    setSuccess   ] = useState(null)
  const [viewMonth,  setViewMonth ] = useState(new Date())
  const [tab,        setTab       ] = useState('calendar')
  const [filterType, setFilterType] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const [eRes, sRes] = await Promise.all([
        API.get('/calendar'),
        API.get('/calendar/working-days'),
      ])
      setEntries(Array.isArray(eRes.data) ? eRes.data : [])
      setSummary(sRes.data)
    } catch (e) { setError(e.response?.data?.message || 'Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openAdd = (dateStr = '') => {
    setEditEntry(null)
    setForm({ ...DEFAULT_FORM, date: dateStr })
    setShowForm(true); setError(null)
  }

  const openEdit = (e) => {
    setEditEntry(e)
    setForm({
      title:                 e.title,
      date:                  e.date?.slice(0, 10) || '',
      endDate:               e.endDate?.slice(0, 10) || '',
      eventType:             e.eventType || 'holiday',
      description:           e.description || '',
      periodsPerDay:         e.periodsPerDay || 7,
      affectedPeriods:       e.affectedPeriods || [],
      affectedDepartments:   e.affectedDepartments || [],
      excludeFromAttendance: e.excludeFromAttendance ?? true,
    })
    setShowForm(true); setError(null)
  }

  const handleSave = async () => {
    if (!form.title || !form.date) return setError('Title and date are required')
    try {
      setSaving(true)
      const payload = { ...form, endDate: form.endDate || undefined }
      if (editEntry) await API.put(`/calendar/${editEntry._id}`, payload)
      else           await API.post('/calendar', payload)
      setSuccess(editEntry ? 'Event updated' : 'Event added')
      setShowForm(false); load()
    } catch (e) { setError(e.response?.data?.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return
    try { await API.delete(`/calendar/${id}`); setSuccess('Deleted'); load() }
    catch (e) { setError(e.response?.data?.message || 'Failed') }
  }

  const toggleDept = (d) => {
    const arr = form.affectedDepartments
    f('affectedDepartments', arr.includes(d) ? arr.filter(x => x !== d) : [...arr, d])
  }

  const getCfg = (eventType) => TYPE_CONFIG[eventType] || TYPE_CONFIG.special

  const year        = viewMonth.getFullYear()
  const month       = viewMonth.getMonth()
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr    = new Date().toISOString().slice(0, 10)

  const eventsByDate = {}
  for (const e of entries) {
    const key = e.date?.slice(0, 10)
    if (key) { if (!eventsByDate[key]) eventsByDate[key] = []; eventsByDate[key].push(e) }
  }

  const listEntries = entries
    .filter(e => filterType === 'all' ? true : e.eventType === filterType)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <Layout><div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-800"> Academic Calendar</h1><p className="text-gray-400 text-sm mt-1">Manage holidays, exams, and period schedules</p></div><button onClick={() => openAdd()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow">
          + Add Event
        </button></div>

      {error   && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm"> {success}</div>}

      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Working Days',      value: summary?.totalWorkingDays ?? 0, color: 'text-blue-600'   },
            { label: 'Total Periods',     value: summary?.totalPeriods ?? 0,      color: 'text-gray-800'   },
            { label: 'Excluded Periods',  value: summary?.excludedPeriods ?? 0,  color: 'text-orange-500' },
            { label: 'Remaining Periods', value: summary?.remainingPeriods ?? 0, color: 'text-green-600'  },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"><p className="text-xs text-gray-400 mb-1">{card.label}</p><p className={`text-2xl font-bold ${card.color}`}>{card.value}</p></div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {[['calendar',' Calendar View'],['list',' List View']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* CALENDAR VIEW */}
      {tab === 'calendar' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"><div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"></button><h2 className="font-semibold text-gray-800">{MONTHS[month]} {year}</h2><button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"></button></div><div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS_SHORT.map(d =><div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>)}
          </div><div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/30" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day     = i + 1
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const evs     = eventsByDate[dateStr] || []
              const isToday = dateStr === todayStr
              const isSun   = new Date(dateStr).getDay() === 0
              return (
                <div key={day} onClick={() => openAdd(dateStr)}
                  className={`min-h-[80px] border-b border-r border-gray-50 p-1.5 cursor-pointer hover:bg-blue-50/40 transition-colors ${isToday ? 'bg-blue-50' : ''} ${isSun ? 'bg-red-50/20' : ''}`}><span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : isSun ? 'text-red-400' : 'text-gray-600'}`}>
                    {day}
                  </span><div className="mt-1 space-y-0.5">
                    {evs.slice(0, 2).map((e, ei) => {
                      const cfg = getCfg(e.eventType)
                      return (
                        <div key={ei} onClick={ev => { ev.stopPropagation(); openEdit(e) }}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate border ${cfg.color}`}>
                          {e.title}
                        </div>
                      )
                    })}
                    {evs.length > 2 && <div className="text-[10px] text-gray-400 pl-1">+{evs.length - 2} more</div>}
                  </div></div>
              )
            })}
          </div></div>
      )}

      {/* LIST VIEW */}
      {tab === 'list' && (
        <div><div className="flex gap-2 mb-4 flex-wrap"><button onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterType === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              All ({entries.length})
            </button>
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <button key={type} onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterType === type ? cfg.color : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {cfg.label} ({entries.filter(e => e.eventType === type).length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading...</div>
          ) : listEntries.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-4xl mb-3"></p><p className="text-gray-400">No events yet.</p></div>
          ) : (
            <div className="space-y-2">
              {listEntries.map(e => {
                const cfg = getCfg(e.eventType)
                return (
                  <div key={e._id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-start gap-4"><div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} /><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-gray-800 text-sm">{e.title}</p><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
                        {e.affectedDepartments?.length > 0 && (
                          <span className="text-xs text-gray-400">{e.affectedDepartments.join(', ')}</span>
                        )}
                      </div><p className="text-xs text-gray-400 mt-0.5">
                        {new Date(e.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                        {e.endDate && ` → ${new Date(e.endDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}`}
                        {e.description && ` · ${e.description}`}
                      </p><div className="mt-1">
                        {e.affectedPeriods?.length > 0 ? (
                          <span className="text-xs text-orange-600 font-medium">
                             Periods {e.affectedPeriods.sort((a,b)=>a-b).join(', ')} blocked ({e.affectedPeriods.length}P)
                          </span>
                        ) : e.excludeFromAttendance ? (
                          <span className="text-xs text-red-500 font-medium"> Full day excluded ({e.periodsPerDay || 7} periods)</span>
                        ) : (
                          <span className="text-xs text-green-600"> Does not affect attendance</span>
                        )}
                      </div></div><div className="flex gap-2 flex-shrink-0"><button onClick={() => openEdit(e)}
                        className="px-2.5 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg"> Edit</button><button onClick={() => handleDelete(e._id)}
                        className="px-2.5 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg"></button></div></div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4"><div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl"><h3 className="font-semibold text-gray-800">{editEntry ? ' Edit Event' : ' Add Calendar Event'}</h3><button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl"></button></div><div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto"><div><label className="block text-xs font-medium text-gray-500 mb-1">Event Title *</label><input value={form.title} onChange={e => f('title', e.target.value)}
                  placeholder="e.g. Internal Exam 1, Diwali Holiday..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-xs font-medium text-gray-500 mb-2">Event Type *</label><div className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                    <button key={type} type="button" onClick={() => f('eventType', type)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${form.eventType === type ? cfg.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {cfg.label}
                    </button>
                  ))}
                </div></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-500 mb-1">Start Date *</label><input type="date" value={form.date} onChange={e => f('date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-xs font-medium text-gray-500 mb-1">End Date (multi-day)</label><input type="date" value={form.endDate} onChange={e => f('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div><div className="bg-orange-50 border border-orange-200 rounded-xl p-4"><div className="flex items-center justify-between mb-2"><label className="text-xs font-semibold text-orange-800"> Period Scheduling</label><div className="flex items-center gap-2"><span className="text-xs text-orange-600">Periods/day:</span><input type="number" min="1" max="10" value={form.periodsPerDay}
                      onChange={e => { f('periodsPerDay', Number(e.target.value)); f('affectedPeriods', []) }}
                      className="w-14 px-2 py-1 border border-orange-300 rounded-lg text-xs text-center focus:outline-none bg-white" /></div></div><p className="text-xs text-orange-600 mb-2">Select blocked periods. Empty = full day excluded.</p><PeriodSelector periodsPerDay={form.periodsPerDay} selected={form.affectedPeriods} onChange={v => f('affectedPeriods', v)} />
                {form.affectedPeriods.length > 0 && (
                  <p className="text-xs text-orange-700 mt-2 font-medium">
                    Blocking periods {form.affectedPeriods.sort((a,b)=>a-b).join(', ')} — {form.affectedPeriods.length} period(s)/day
                  </p>
                )}
              </div><div><label className="block text-xs font-medium text-gray-500 mb-2">Affected Departments (empty = all)</label><div className="flex gap-2">
                  {DEPTS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDept(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.affectedDepartments.includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {d}
                    </button>
                  ))}
                </div></div><div className="flex items-center gap-3"><button type="button" onClick={() => f('excludeFromAttendance', !form.excludeFromAttendance)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.excludeFromAttendance ? 'bg-blue-600' : 'bg-gray-200'}`}><span className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform ${form.excludeFromAttendance ? 'translate-x-6' : 'translate-x-1'}`} /></button><div><p className="text-sm font-medium text-gray-700">Exclude from Attendance %</p><p className="text-xs text-gray-400">Turn off for events that do not block classes</p></div></div><div><label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label><textarea rows={2} value={form.description} onChange={e => f('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div></div><div className="px-6 pb-5 flex gap-3"><button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
                {saving ? 'Saving...' : editEntry ? 'Update Event' : 'Add Event'}
              </button><button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200">Cancel</button></div></div></div>
      )}
    </Layout>
  )
}

export default AdminCalendar