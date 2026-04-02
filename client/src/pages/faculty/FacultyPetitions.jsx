import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API, { API_BASE_URL } from '../../services/api'

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { label: 'Approved', color: 'bg-green-100  text-green-700  border-green-200'  },
  rejected: { label: 'Rejected', color: 'bg-red-100    text-red-700    border-red-200'    },
}
const TYPE_LABELS = { medical: ' Medical', od: ' OD', personal: ' Personal', other: ' Other' }

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const FacultyPetitions = () => {
  const [petitions,   setPetitions  ] = useState([])
  const [loading,     setLoading    ] = useState(true)
  const [filter,      setFilter     ] = useState('pending')
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewNote,  setReviewNote ] = useState('')
  const [submitting,  setSubmitting ] = useState(false)
  const [error,       setError      ] = useState(null)
  const [success,     setSuccess    ] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const { data } = await API.get('/petitions/faculty')
      setPetitions(data)
    } catch (err) { setError(err.response?.data?.message || 'Failed to load') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleReview = async (status) => {
    if (!reviewModal) return
    try {
      setSubmitting(true)
      await API.put(`/petitions/${reviewModal._id}/review`, { status, reviewNote })
      setSuccess(`Petition ${status}!`)
      setReviewModal(null); setReviewNote(''); load()
    } catch (err) { setError(err.response?.data?.message || 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleViewDoc = async (petitionId) => {
    try {
      const token = JSON.parse(localStorage.getItem('dt_user'))?.token
      if (!token) throw new Error('No token found')
      const res = await fetch(`${API_BASE_URL}/petitions/${petitionId}/document`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to fetch document')
      
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (e) {
      setError('Unable to securely load document')
    }
  }

  const filtered = petitions.filter(p => filter === 'all' ? true : p.status === filter)
  const counts = {
    all:      petitions.length,
    pending:  petitions.filter(p => p.status === 'pending').length,
    approved: petitions.filter(p => p.status === 'approved').length,
    rejected: petitions.filter(p => p.status === 'rejected').length,
  }

  return (
    <Layout><div className="mb-6"><h1 className="text-2xl font-bold text-gray-800"> Student Petitions</h1><p className="text-gray-500 text-sm mt-1">Review leave petitions. Download attached documents before deciding.</p></div>

      {error   && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm"> {success}</div>}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter===val ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {label}
            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${filter===val?'bg-blue-500 text-white':'bg-gray-100 text-gray-500'}`}>{counts[val]}</span></button>
        ))}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="px-6 py-5 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Review Petition</h3><p className="text-xs text-gray-400 mt-0.5">
                {reviewModal.studentId?.userId?.name} — {reviewModal.courseId?.name}
              </p></div><div className="px-6 py-5 space-y-4"><div className="bg-gray-50 rounded-xl p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-500">Type</span><span className="font-medium">{TYPE_LABELS[reviewModal.type]}</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Dates</span><span className="font-medium">{reviewModal.fromDate} → {reviewModal.toDate}</span></div><div className="text-sm"><span className="text-gray-500">Reason</span><p className="font-medium mt-1">{reviewModal.reason}</p></div>

                {/* Document in modal */}
                {reviewModal.document?.filename ? (
                  <div className="pt-2 border-t border-gray-200"><p className="text-xs text-gray-500 mb-1.5"> Attached document</p><button onClick={() => handleViewDoc(reviewModal._id)}
                      className="flex items-center gap-2 w-full p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-left"><span className="text-lg">{reviewModal.document.mimetype === 'application/pdf' ? '' : ''}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-blue-700 truncate">{reviewModal.document.originalName}</p><p className="text-xs text-blue-500">{formatFileSize(reviewModal.document.size)} — click to open</p></div><span className="text-blue-500 text-xs">↗</span></button></div>
                ) : (
                  <div className="pt-2 border-t border-gray-200"><p className="text-xs text-gray-400"> No document attached by student</p></div>
                )}
              </div><div><label className="block text-xs font-medium text-gray-600 mb-1">Review Note (optional)</label><textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3}
                  placeholder="Add a note for the student..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /></div>

              {reviewModal.status === 'pending' ? (
                <div className="flex gap-3"><button onClick={() => handleReview('approved')} disabled={submitting}
                    className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                    {submitting ? '...' : ' Approve'}
                  </button><button onClick={() => handleReview('rejected')} disabled={submitting}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                    {submitting ? '...' : ' Reject'}
                  </button></div>
              ) : (
                <p className="text-sm text-center text-gray-400">Already {reviewModal.status}.</p>
              )}
            </div><div className="px-6 pb-5"><button onClick={() => { setReviewModal(null); setReviewNote('') }}
                className="w-full py-2 text-gray-500 text-sm hover:text-gray-700">Cancel</button></div></div></div>
      )}

      {/* Petition list */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">Loading petitions...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm"><p className="text-4xl mb-3"></p><p className="text-gray-400">No {filter !== 'all' ? filter : ''} petitions.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><p className="font-semibold text-gray-800">{p.studentId?.userId?.name}</p><span className="text-xs text-gray-400">{p.studentId?.rollNo}</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_CONFIG[p.status]?.color}`}>
                      {STATUS_CONFIG[p.status]?.label}
                    </span></div><div className="flex flex-wrap gap-4 text-sm text-gray-600"><span> {p.courseId?.name} ({p.courseId?.code})</span><span>{TYPE_LABELS[p.type]}</span><span> {p.fromDate} → {p.toDate}</span></div><p className="text-sm text-gray-500 mt-2">"{p.reason}"</p>

                  {/* Document row */}
                  <div className="mt-2 flex items-center gap-2">
                    {p.document?.filename ? (
                      <><span className="text-xs text-gray-500"></span><button onClick={() => handleViewDoc(p._id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">
                          {p.document.originalName}
                        </button><span className="text-xs text-gray-400">({formatFileSize(p.document.size)})</span></>
                    ) : (
                      <span className="text-xs text-gray-300">No document attached</span>
                    )}
                  </div>

                  {p.reviewNote && (
                    <p className="text-xs text-blue-600 mt-1 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                       Note: {p.reviewNote}
                    </p>
                  )}
                  <p className="text-xs text-gray-300 mt-2">Submitted {new Date(p.createdAt).toLocaleDateString()}</p></div><button onClick={() => { setReviewModal(p); setReviewNote(p.reviewNote || '') }}
                  className={`ml-4 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                    p.status === 'pending'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {p.status === 'pending' ? 'Review' : 'View'}
                </button></div></div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default FacultyPetitions
