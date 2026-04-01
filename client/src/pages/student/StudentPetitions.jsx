import { useState, useEffect, useRef } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: '⏳', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { label: 'Approved', icon: '', color: 'bg-green-100  text-green-700  border-green-200' },
  rejected: { label: 'Rejected', icon: '', color: 'bg-red-100    text-red-700    border-red-200' },
}

const TYPE_OPTIONS = [
  { value: 'medical', label: ' Medical Leave' },
  { value: 'od', label: ' On Duty (OD)' },
  { value: 'personal', label: ' Personal' },
  { value: 'other', label: ' Other' },
]

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const StudentPetitions = () => {
  const [petitions, setPetitions] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const fileInputRef = useRef(null)

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    courseId: '', type: 'medical', reason: '', fromDate: today, toDate: today,
  })

  const load = async () => {
    try {
      setLoading(true)
      const { data: profile } = await API.get('/students/me')
      const { data: pets } = await API.get('/petitions/my')
      setPetitions(pets)
      setCourses(profile.enrolledCourses || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setFileError(null)
    if (!file) { setSelectedFile(null); return }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      setFileError('Only PDF, JPG, and PNG files are allowed')
      setSelectedFile(null)
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File must be under 5 MB')
      setSelectedFile(null)
      e.target.value = ''
      return
    }
    setSelectedFile(file)
  }

  const removeFile = () => {
    setSelectedFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!form.courseId || !form.reason.trim()) return setError('Please fill in all fields')
    if (form.fromDate > form.toDate) return setError('From date must be before To date')
    setError(null)
    try {
      setSubmitting(true)

      // Use FormData so we can send both text fields and a file
      const formData = new FormData()
      formData.append('courseId', form.courseId)
      formData.append('type', form.type)
      formData.append('reason', form.reason)
      formData.append('fromDate', form.fromDate)
      formData.append('toDate', form.toDate)
      if (selectedFile) formData.append('document', selectedFile)

      await API.post('/petitions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess('Petition submitted successfully!')
      setShowForm(false)
      setSelectedFile(null)
      setForm({ courseId: '', type: 'medical', reason: '', fromDate: today, toDate: today })
      if (fileInputRef.current) fileInputRef.current.value = ''
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit')
    } finally { setSubmitting(false) }
  }

  const handleViewDoc = async (petitionId) => {
    try {
      const token = JSON.parse(localStorage.getItem('dt_user'))?.token
      if (!token) throw new Error('No token')
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${API_URL}/petitions/${petitionId}/document`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch document')

      // Use blob URL so we don't leak tokens in query params.
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch {
      setError('Failed to open document')
    }
  }

  const filtered = petitions.filter(p => filter === 'all' ? true : p.status === filter)
  const counts = {
    all: petitions.length,
    pending: petitions.filter(p => p.status === 'pending').length,
    approved: petitions.filter(p => p.status === 'approved').length,
    rejected: petitions.filter(p => p.status === 'rejected').length,
  }

  return (
    <Layout><div className="mb-6 flex items-start justify-between"><div><h1 className="text-2xl font-bold text-gray-800"> My Petitions</h1><p className="text-gray-500 text-sm mt-1">Raise leave requests and upload supporting documents.</p></div><button onClick={() => { setShowForm(true); setError(null); setSuccess(null) }}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
      + New Petition
    </button></div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm"> {success}</div>}

      {/* New Petition Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 mb-6"><h3 className="font-semibold text-gray-800 mb-5 text-base"> New Petition</h3><div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Course *</label><select value={form.courseId} onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">-- Select Course --</option>
          {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
        </select></div><div><label className="block text-xs font-medium text-gray-600 mb-1">Leave Type *</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-gray-600 mb-1">From Date *</label><input type="date" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-xs font-medium text-gray-600 mb-1">To Date *</label><input type="date" value={form.toDate} min={form.fromDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div><div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">Reason *</label><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
              placeholder="Describe your reason clearly (e.g. Admitted to hospital for fever)..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>

          {/*  File Upload  */}
          <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1">
            Supporting Document <span className="text-gray-400">(optional — PDF, JPG, PNG, max 5MB)</span></label>

            {!selectedFile ? (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"><div className="text-center"><p className="text-3xl mb-1"></p><p className="text-sm text-gray-500">Click to upload or drag and drop</p><p className="text-xs text-gray-400 mt-0.5">Medical certificate, OD letter, etc.</p></div><input ref={fileInputRef} type="file" className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange} /></label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl"><div className="text-2xl">
                {selectedFile.type === 'application/pdf' ? '' : ''}
              </div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</p><p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p></div><button onClick={removeFile}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50">
                  Remove
                </button></div>
            )}

            {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
          </div></div><div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-4 text-xs text-blue-700"><strong>Note:</strong> If your petition is approved, those absent days will be <strong>excluded from your attendance %</strong> automatically.
          </div><div className="flex gap-3 mt-5"><button onClick={handleSubmit} disabled={submitting || !!fileError}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Petition'}
          </button><button onClick={() => { setShowForm(false); setError(null); removeFile() }}
            className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-200">
              Cancel
            </button></div></div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === val ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filter === val ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {counts[val]}
            </span></button>
        ))}
      </div>

      {/* Petition list */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm"><p className="text-4xl mb-3"></p><p className="text-gray-400 font-medium">No petitions yet.</p><p className="text-gray-300 text-sm mt-1">Click "+ New Petition" to raise a leave request.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => {
            const cfg = STATUS_CONFIG[p.status]
            return (
              <div key={p._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"><div className="flex items-start justify-between mb-3"><div><div className="flex items-center gap-3"><p className="font-semibold text-gray-800">{p.courseId?.name}</p><span className="text-xs text-gray-400">{p.courseId?.code}</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span></div><p className="text-xs text-gray-400 mt-1">
                  {TYPE_OPTIONS.find(t => t.value === p.type)?.label} &bull; {p.fromDate} → {p.toDate}
                </p></div><p className="text-xs text-gray-300">{new Date(p.createdAt).toLocaleDateString()}</p></div><p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">"{p.reason}"</p>

                {/* Document badge */}
                {p.document?.filename ? (
                  <div className="mt-2 flex items-center gap-2"><span className="text-xs text-gray-500"> Document:</span><button onClick={() => handleViewDoc(p._id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">
                    {p.document.originalName}
                  </button><span className="text-xs text-gray-400">({formatFileSize(p.document.size)})</span></div>
                ) : (
                  <p className="text-xs text-gray-300 mt-2">No document attached</p>
                )}

                {p.reviewNote && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2"><span></span><span><strong>Faculty note:</strong> {p.reviewNote}</span></div>
                )}

                {p.status === 'approved' && (
                  <div className="mt-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    Approved — absent days in this range are excluded from your attendance calculation.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

export default StudentPetitions
