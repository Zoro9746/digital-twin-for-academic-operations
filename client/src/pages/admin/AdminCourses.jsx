import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-800">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button></div><div className="p-6">{children}</div></div></div>
)

const DEPTS = ['CSE','ECE','MECH','CIVIL']
const blank = { name:'', code:'', department:'CSE', credits:'3', semester:'', description:'' }

const AdminCourses = () => {
  const [courses,  setCourses ] = useState([])
  const [loading,  setLoading ] = useState(true)
  const [modal,    setModal   ] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm    ] = useState(blank)
  const [search,   setSearch  ] = useState('')
  const [deptFilter, setDept  ] = useState('all')
  const [saving,   setSaving  ] = useState(false)
  const [csvLoading, setCsvLoading] = useState(null)
  const [error,    setError   ] = useState(null)

  const load = () => {
    setLoading(true)
    API.get('/courses')
      .then(r => setCourses(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd  = () => { setForm(blank); setSelected(null); setModal('add') }
  const openEdit = (c) => {
    setSelected(c)
    setForm({ name: c.name, code: c.code, department: c.department, credits: String(c.credits || '3'), semester: c.semester || '', description: c.description || '' })
    setModal('edit')
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...form, credits: Number(form.credits) }
      if (modal === 'add') {
        const r = await API.post('/courses', payload)
        setCourses(prev => [...prev, r.data])
      } else {
        const r = await API.put(`/courses/${selected._id}`, payload)
        setCourses(prev => prev.map(c => c._id === selected._id ? r.data : c))
      }
      setModal(null)
    } catch (e) { alert(e.response?.data?.message || 'Failed to save') }
    setSaving(false)
  }

  const remove = async (id) => {
    if (!confirm('Delete this course?')) return
    await API.delete(`/courses/${id}`)
    setCourses(prev => prev.filter(c => c._id !== id))
  }

  const downloadCSV = async (c) => {
    setCsvLoading(c._id)
    try {
      const res = await API.get(`/attendance/export/${c._id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `${c.code}_attendance.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('Export failed') }
    setCsvLoading(null)
  }

  const filtered = courses
    .filter(c => deptFilter === 'all' ? true : c.department === deptFilter)
    .filter(c => {
      if (!search) return true
      return (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
             (c.code || '').toLowerCase().includes(search.toLowerCase())
    })

  return (
    <Layout><div className="mb-6 flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-800"> Courses</h1><p className="text-gray-500 text-sm mt-1">{courses.length} courses</p></div><button onClick={openAdd} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm">+ Add Course</button></div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-5"><input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 bg-white" /><div className="flex gap-1.5">
          {['all',...DEPTS].map(d => (
            <button key={d} onClick={() => setDept(d)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${deptFilter === d ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {d === 'all' ? 'All' : d}
            </button>
          ))}
        </div></div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-100"><th className="px-5 py-3 text-left text-xs font-semibold text-gray-400">Course</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Code</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Department</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Credits</th><th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Semester</th><th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Actions</th></tr></thead><tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">No courses found.</td></tr>}
              {filtered.map((c, i) => (
                <tr key={c._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}><td className="px-5 py-3"><p className="font-medium text-gray-800">{c.name}</p>
                    {c.description && <p className="text-xs text-gray-400 truncate max-w-xs">{c.description}</p>}
                  </td><td className="px-4 py-3 font-mono text-xs text-gray-600">{c.code}</td><td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{c.department}</span></td><td className="px-4 py-3 text-gray-600">{c.credits || '—'}</td><td className="px-4 py-3 text-gray-500">{c.semester || '—'}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1.5"><button onClick={() => downloadCSV(c)} disabled={csvLoading === c._id}
                        className="px-2.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs hover:bg-green-100 disabled:opacity-50">
                        {csvLoading === c._id ? '...' : ' CSV'}
                      </button><button onClick={() => openEdit(c)} className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs hover:bg-blue-100">Edit</button><button onClick={() => remove(c._id)} className="px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs hover:bg-red-100">Delete</button></div></td></tr>
              ))}
            </tbody></table></div>
      )}

      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Course' : 'Edit Course'} onClose={() => setModal(null)}><div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-semibold text-gray-500 block mb-1">Course Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="text-xs font-semibold text-gray-500 block mb-1">Course Code</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. CS301"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold text-gray-500 block mb-1">Department</label><select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DEPTS.map(d =><option key={d}>{d}</option>)}
                </select></div><div><label className="text-xs font-semibold text-gray-500 block mb-1">Credits</label><input value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} type="number" min="1" max="6"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="text-xs font-semibold text-gray-500 block mb-1">Semester</label><input value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                  placeholder="e.g. Sem 5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div><div><label className="text-xs font-semibold text-gray-500 block mb-1">Description (optional)</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div><div className="flex gap-3 pt-2"><button onClick={() => setModal(null)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button><button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : modal === 'add' ? 'Add Course' : 'Save Changes'}
              </button></div></div></Modal>
      )}
    </Layout>
  )
}

export default AdminCourses