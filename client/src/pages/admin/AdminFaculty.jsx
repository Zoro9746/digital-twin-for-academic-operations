import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 transition-opacity">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all scale-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-xl font-medium w-8 h-8 flex items-center justify-center rounded hover:bg-slate-50">✕</button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
)

const DEPTS = ['CSE','ECE','MECH','CIVIL']
const blank = { name:'', email:'', password:'', department:'CSE', designation:'', phone:'' }

const AdminFaculty = () => {
  const [faculty,  setFaculty ] = useState([])
  const [courses,  setCourses ] = useState([])
  const [loading,  setLoading ] = useState(true)
  const [modal,    setModal   ] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm    ] = useState(blank)
  const [search,   setSearch  ] = useState('')
  const [deptFilter, setDept  ] = useState('all')
  const [assignCourse, setAssignCourse] = useState('')
  const [saving,   setSaving  ] = useState(false)
  const [error,    setError   ] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([API.get('/faculty'), API.get('/courses')])
      .then(([f, c]) => { setFaculty(f.data); setCourses(c.data) })
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd  = () => { setForm(blank); setSelected(null); setModal('add') }
  const openEdit = (f) => {
    setSelected(f)
    setForm({ name: f.userId?.name || '', email: f.userId?.email || '', password: '', department: f.department, designation: f.designation || '', phone: f.phone || '' })
    setModal('edit')
  }
  const openAssign = (f) => { setSelected(f); setAssignCourse(''); setModal('assign') }

  const save = async () => {
    setSaving(true)
    try {
      if (modal === 'add') {
        const r = await API.post('/faculty', form)
        setFaculty(prev => [...prev, r.data])
      } else {
        const payload = { department: form.department, designation: form.designation, phone: form.phone, name: form.name, email: form.email }
        if (form.password) payload.password = form.password
        const r = await API.put(`/faculty/${selected._id}`, payload)
        setFaculty(prev => prev.map(f => f._id === selected._id ? r.data : f))
      }
      setModal(null)
    } catch (e) { alert(e.response?.data?.message || 'Failed to save') }
    setSaving(false)
  }

  const remove = async (id) => {
    if (!confirm('Delete this faculty member?')) return
    await API.delete(`/faculty/${id}`)
    setFaculty(prev => prev.filter(f => f._id !== id))
  }

  const assign = async () => {
    if (!assignCourse) return
    await API.put(`/faculty/${selected._id}/assign-course`, { courseId: assignCourse })
    load()
    setModal(null)
  }

  const filtered = faculty
    .filter(f => deptFilter === 'all' ? true : f.department === deptFilter)
    .filter(f => {
      if (!search) return true
      return (f.userId?.name || '').toLowerCase().includes(search.toLowerCase()) ||
             (f.userId?.email || '').toLowerCase().includes(search.toLowerCase())
    })

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 font-serif pb-1">Faculty Management</h1>
          <p className="text-sm text-slate-500">{faculty.length} registered faculty members.</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-[13px] font-medium shadow-sm hover:bg-slate-800 transition-colors">
          + Register Faculty
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {error}
      </div>}

      {/* Filters Toolbar */}
      <div className="bg-white p-2.5 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Search faculty..."
            className="w-full pl-9 pr-4 py-2 text-sm border-none bg-transparent text-slate-700 focus:outline-none placeholder-slate-400" 
          />
        </div>
        
        <div className="hidden md:block h-5 w-px bg-slate-200 mx-2"></div>

        <div className="flex gap-1.5 flex-wrap">
          {['all',...DEPTS].map(d => (
            <button key={d} onClick={() => setDept(d)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                deptFilter === d ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-50'
              }`}>
              {d === 'all' ? 'All Depts' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Container */}
      {loading ? (
        <div className="text-center text-slate-500 font-medium py-16 text-sm">Loading Faculty Data...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 font-semibold text-slate-500">Faculty Member</th>
                  <th className="px-5 py-3 font-semibold text-slate-500">Department</th>
                  <th className="px-5 py-3 font-semibold text-slate-500">Designation</th>
                  <th className="px-5 py-3 font-semibold text-slate-500">Courses</th>
                  <th className="px-5 py-3 font-semibold text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-500">No faculty members found.</td></tr>}
                {filtered.map((f, i) => (
                  <tr key={f._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs shrink-0">
                          {f.userId?.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{f.userId?.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{f.userId?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] px-2 py-0.5 rounded font-medium border border-indigo-100 bg-indigo-50 text-indigo-700">{f.department}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{f.designation || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">
                      <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium">
                        {f.assignedCourses?.length || 0} Courses
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openAssign(f)} className="px-2.5 py-1.5 bg-white text-indigo-700 border border-slate-200 rounded shrink-0 text-[11px] font-medium hover:bg-indigo-50 hover:border-indigo-200 transition-colors">Assign Course</button>
                        <button onClick={() => openEdit(f)} className="px-2.5 py-1.5 bg-white text-slate-600 border border-slate-200 rounded shrink-0 text-[11px] font-medium hover:bg-slate-50 transition-colors">Edit</button>
                        <button onClick={() => remove(f._id)} className="px-2.5 py-1.5 bg-white text-red-600 border border-slate-200 rounded shrink-0 text-[11px] font-medium hover:bg-red-50 hover:border-red-200 transition-colors">Drop</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Register Faculty' : 'Edit Profile'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Department</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900">
                  {DEPTS.map(d =><option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Email Address</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900" />
            </div>
            
            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">{modal === 'edit' ? 'New Password (optional)' : 'Secure Password'}</label>
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} type="password" placeholder={modal === 'edit' ? '••••••••' : ''} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Designation</label>
                <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Asst. Professor" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Phone Number</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900" />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-indigo-900 text-white rounded-lg text-[13px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-60">
                {saving ? 'Processing...' : modal === 'add' ? 'Register' : 'Update'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'assign' && selected && (
        <Modal title={`Course Assignment`} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600">Assigning course to <span className="font-medium text-slate-800">{selected.userId?.name}</span></p>
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Select Course</label>
              <select value={assignCourse} onChange={e => setAssignCourse(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900">
                <option value="">-- Choose Course --</option>
                {courses.map(c =><option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={assign} className="flex-1 px-4 py-2 bg-indigo-900 text-white rounded-lg text-[13px] font-medium hover:bg-slate-800 transition-colors">Assign Course</button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

export default AdminFaculty