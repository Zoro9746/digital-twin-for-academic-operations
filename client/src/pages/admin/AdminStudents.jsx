import { useState, useEffect, useCallback } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const DEPTS = ['CSE', 'ECE', 'MECH', 'CIVIL']
const SEMS = [1, 2, 3, 4, 5, 6, 7, 8]

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

const AdminStudents = () => {
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [dept, setDept] = useState('all')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [courses, setCourses] = useState([])
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(null)
  const [enrollCourse, setEnrollCourse] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [form, setForm] = useState({
    name: '', email: '', password: '', rollNo: '', department: 'CSE', semester: '3', phone: ''
  })

  const load = useCallback(async (d = dept, p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: 60 })
      if (d !== 'all') params.set('dept', d)
      const res = await API.get(`/students?${params}`)
      setStudents(res.data.students || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch { setMsg({ type: 'err', text: 'Failed to load students' }) }
    finally { setLoading(false) }
  }, [dept, page])

  useEffect(() => { load(dept, page) }, [dept, page])

  useEffect(() => {
    API.get('/courses').then(r => setCourses(r.data)).catch(() => { })
  }, [])

  const changeDept = (d) => { setDept(d); setPage(1); setSearch('') }

  const openAdd = () => {
    setSelected(null)
    setForm({ name: '', email: '', password: '', rollNo: '', department: dept === 'all' ? 'CSE' : dept, semester: '3', phone: '' })
    setMsg({ type: '', text: '' })
    setModal('add')
  }

  const openEdit = (s) => {
    setSelected(s)
    setForm({
      name: s.userId?.name || '', email: s.userId?.email || '',
      password: '', rollNo: s.rollNo || '',
      department: s.department || 'CSE', semester: String(s.semester || 3), phone: s.phone || ''
    })
    setMsg({ type: '', text: '' })
    setModal('edit')
  }

  const openEnroll = (s) => { setSelected(s); setEnrollCourse(''); setModal('enroll') }

  const save = async () => {
    try {
      setSaving(true)
      const payload = {
        name: form.name, email: form.email, password: form.password,
        rollNo: form.rollNo, department: form.department,
        semester: Number(form.semester), phone: form.phone
      }
      if (selected) {
        await API.put(`/students/${selected._id}`, payload)
        setMsg({ type: 'ok', text: 'Student portfolio updated successfully.' })
      } else {
        await API.post('/students', payload)
        setMsg({ type: 'ok', text: 'Student officially registered into the system.' })
      }
      setModal(null)
      load(dept, page)
    } catch (e) { setMsg({ type: 'err', text: e.response?.data?.message || 'Transaction Failed' }) }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Are you sure you wish to permanently delete this student record?')) return
    try {
      await API.delete(`/students/${id}`)
      setMsg({ type: 'ok', text: 'Student record purged.' })
      load(dept, page)
    } catch { setMsg({ type: 'err', text: 'Deletion process failed.' }) }
  }

  const enroll = async () => {
    if (!enrollCourse) return
    try {
      await API.post(`/students/${selected._id}/enroll`, { courseId: enrollCourse })
      setMsg({ type: 'ok', text: 'Course enrollment successful.' })
      setModal(null)
      load(dept, page)
    } catch (e) { setMsg({ type: 'err', text: e.response?.data?.message || 'Enrollment rejected' }) }
  }

  const downloadPDF = async (s) => {
    try {
      setPdfLoading(s._id)
      const token = JSON.parse(localStorage.getItem('dt_user'))?.token
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

      const res = await fetch(`${apiUrl}/reports/student/${s._id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to download from remote origin')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `academic_report_${s.rollNo}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { setMsg({ type: 'err', text: 'PDF Generation Service Offline' }) }
    finally { setPdfLoading(null) }
  }

  const filtered = search
    ? students.filter(s => {
      const q = search.toLowerCase()
      return s.userId?.name?.toLowerCase().includes(q) || s.rollNo?.toLowerCase().includes(q)
    })
    : students

  const inp = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-900 focus:border-indigo-900'

  return (
    <Layout>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 font-serif pb-1">Student Registry</h1>
          <p className="text-sm text-slate-500">{total} active students currently enrolled across all faculties.</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-[13px] font-medium shadow-sm hover:bg-slate-800 transition-colors">
          + Register Student
        </button>
      </div>

      {msg.text && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.type === 'ok'
            ? <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
          {msg.text}
        </div>
      )}

      {/* Modern Filter Toolbar */}
      <div className="bg-white p-2.5 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name or roll..."
            className="w-full pl-9 pr-4 py-2 text-sm border-none bg-transparent text-slate-700 focus:outline-none placeholder-slate-400"
          />
        </div>

        <div className="hidden md:block h-5 w-px bg-slate-200 mx-2"></div>

        <div className="flex gap-1.5 flex-wrap">
          {['all', ...DEPTS].map(d => (
            <button key={d} onClick={() => changeDept(d)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${dept === d ? 'bg-slate-100 text-slate-800 border border-slate-300 shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-50'
                }`}>
              {d === 'all' ? 'All Faculties' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm font-medium">Loading Student Records...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm font-medium">No students match your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Student</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Roll No</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest">Department</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Semester</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest hidden md:table-cell">Courses</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(s => (
                  <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center shrink-0">
                          {s.userId?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-[13px] leading-snug">{s.userId?.name}</p>
                          <p className="text-[11px] text-slate-500">{s.userId?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">{s.rollNo}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] px-2 py-0.5 rounded font-medium border border-indigo-100 bg-indigo-50 text-indigo-700">{s.department}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-[13px] hidden sm:table-cell">Sem {s.semester}</td>
                    <td className="px-5 py-3.5 text-[12px] hidden md:table-cell">
                      <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">
                        {s.enrolledCourses?.length || 0} Modules
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap justify-end w-48 ml-auto">
                        <button onClick={() => openEnroll(s)} className="px-2.5 py-1 bg-white text-emerald-700 border border-emerald-200 rounded text-[11px] font-medium hover:bg-emerald-50 transition-colors shrink-0">Enroll</button>
                        <button onClick={() => downloadPDF(s)} disabled={pdfLoading === s._id} className="px-2.5 py-1 bg-white text-indigo-700 border border-slate-200 rounded text-[11px] font-medium hover:bg-indigo-50 transition-colors shrink-0 disabled:opacity-50">
                          {pdfLoading === s._id ? 'Generating...' : 'PDF'}
                        </button>
                        <button onClick={() => openEdit(s)} className="px-2.5 py-1 bg-white text-slate-600 border border-slate-200 rounded text-[11px] font-medium hover:bg-slate-100 transition-colors shrink-0">Edit</button>
                        <button onClick={() => remove(s._id)} className="px-2.5 py-1 bg-white text-red-600 border border-slate-200 rounded text-[11px] font-medium hover:bg-red-50 hover:border-red-200 transition-colors shrink-0">Drop</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between pb-4">
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            PAGE {page} OF {pages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm">
              Previous
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-sm">
              Next
            </button>
          </div>
        </div>
      )}

      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Register Student' : 'Edit Profile'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Roll No</label>
                <input type="text" value={form.rollNo} onChange={e => setForm(f => ({ ...f, rollNo: e.target.value }))} className={inp} />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Email Secure Address</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Department</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={inp}>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Current Semester</label>
                <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className={inp}>
                  {SEMS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Phone Number</label>
                <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} />
              </div>
              {modal === 'add' && (
                <div>
                  <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Assign Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inp} />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-indigo-900 text-white rounded-lg text-[13px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-60 shadow-sm">
                {saving ? 'Processing...' : modal === 'add' ? 'Register Student' : 'Commit Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'enroll' && (
        <Modal title={`Enrollment — ${selected?.userId?.name}`} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
              <p className="text-[12px] text-slate-600">Assigning an academic course to <span className="font-semibold text-slate-800">{selected?.rollNo}</span></p>
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 block mb-1.5">Select Open Course</label>
              <select value={enrollCourse} onChange={e => setEnrollCourse(e.target.value)} className={inp}>
                <option value="">-- Choose Course --</option>
                {courses.filter(c => c.department === selected?.department).map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={enroll} className="flex-1 px-4 py-2 bg-indigo-900 text-white rounded-lg text-[13px] font-medium hover:bg-slate-800 shadow-sm transition-colors cursor-pointer">
                Confirm Enrollment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

export default AdminStudents