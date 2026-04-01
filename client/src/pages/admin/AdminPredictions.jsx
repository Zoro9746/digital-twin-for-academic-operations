import { useState, useEffect } from 'react'
import Layout from '../../components/common/Layout'
import API from '../../services/api'

const RISK_CONFIG = {
  critical:   { label: 'Critical',   color: 'bg-red-100 text-red-700 border-red-200',         dot: 'bg-red-500',    bar: 'bg-red-500'    },
  at_risk:    { label: 'At Risk',    color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400', bar: 'bg-orange-400' },
  borderline: { label: 'Borderline', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400', bar: 'bg-yellow-400' },
  safe:       { label: 'Safe',       color: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-500',  bar: 'bg-green-500'  },
}

const TrendArrow = ({ trend }) => {
  if (trend > 2)  return <span className="text-green-600 font-bold text-xs"> Improving (+{trend}%)</span>
  if (trend < -2) return <span className="text-red-600   font-bold text-xs"> Declining ({trend}%)</span>
  return               <span className="text-yellow-600 font-bold text-xs">→ Stable</span>
}

const Bar = ({ pct, cls }) => (
  <div className="flex items-center gap-2"><div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full transition-all ${cls}`} style={{ width: `${pct}%` }} /></div><span className="text-xs font-semibold w-9 text-right text-gray-700">{pct}%</span></div>
)

const AdminPredictions = () => {
  const [data,      setData    ] = useState([])
  const [loading,   setLoading ] = useState(true)
  const [filter,    setFilter  ] = useState('all')
  const [deptFilter,setDept    ] = useState('all')
  const [expanded,  setExpanded] = useState(null)
  const [error,     setError   ] = useState(null)

  useEffect(() => {
    API.get('/analytics/predict-all')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const depts   = ['all', ...new Set(data.map(d => d.student.department))]
  const counts  = { all: data.length, critical: 0, at_risk: 0, borderline: 0 }
  data.forEach(d => { if (counts[d.worstRisk] !== undefined) counts[d.worstRisk]++ })

  const filtered = data.filter(d => {
    const riskOk = filter === 'all' || d.worstRisk === filter
    const deptOk = deptFilter === 'all' || d.student.department === deptFilter
    return riskOk && deptOk
  })

  return (
    <Layout><div className="mb-6"><h1 className="text-2xl font-bold text-gray-800"> Predictive Risk Engine</h1><p className="text-gray-500 text-sm mt-1">
          AI-powered attendance trend analysis — identifies students likely to fall below 80% before it happens.
        </p></div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'critical',   label: 'Critical',   icon: '', desc: 'Projected < 70%'    },
          { key: 'at_risk',    label: 'At Risk',    icon: '🟠', desc: 'Projected 70–79%'   },
          { key: 'borderline', label: 'Borderline', icon: '🟡', desc: 'Projected 80–84%'   },
        ].map(({ key, label, icon, desc }) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`p-4 rounded-xl border text-left transition-all ${filter === key ? 'ring-2 ring-blue-500 ' : ''} ${RISK_CONFIG[key].color}`}><p className="text-2xl font-bold">{counts[key]}</p><p className="font-semibold text-sm">{icon} {label}</p><p className="text-xs opacity-70 mt-0.5">{desc}</p></button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap"><select value={deptFilter} onChange={e => setDept(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {depts.map(d =><option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
        </select>
        {filter !== 'all' && (
          <button onClick={() => setFilter('all')} className="px-3 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
             Clear filter
          </button>
        )}
        <span className="ml-auto text-sm text-gray-400 self-center">{filtered.length} students shown</span></div>

      {loading ? (
        <div className="text-center text-gray-400 py-20">Analysing attendance patterns...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-4xl mb-3"></p><p className="text-gray-500 font-medium">No students at risk in this filter.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ student, worstRisk, predictions }) => {
            const cfg  = RISK_CONFIG[worstRisk]
            const open = expanded === student._id
            return (
              <div key={student._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"><button className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50"
                  onClick={() => setExpanded(open ? null : student._id)}><span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} /><div className="flex-1 min-w-0"><div className="flex items-center gap-3"><p className="font-semibold text-gray-800">{student.name}</p><span className="text-xs text-gray-400">{student.rollNo}</span><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-400">{student.department}</span></div><p className="text-xs text-gray-400 mt-0.5">
                      {predictions.length} course{predictions.length > 1 ? 's' : ''} flagged
                    </p></div><span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${cfg.color}`}>
                    {cfg.label}
                  </span><span className="text-gray-300 text-sm">{open ? '' : ''}</span></button>

                {open && (
                  <div className="px-5 pb-5 border-t border-gray-50 space-y-4 pt-4">
                    {predictions.map(p => {
                      const pcfg = RISK_CONFIG[p.riskLevel]
                      return (
                        <div key={p.course.code} className="bg-gray-50 rounded-xl p-4 space-y-3"><div className="flex items-center justify-between"><div><p className="font-semibold text-sm text-gray-800">{p.course.name}</p><p className="text-xs text-gray-400">{p.course.code}</p></div><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pcfg.color}`}>
                              {pcfg.label}
                            </span></div><div className="grid grid-cols-3 gap-3 text-xs text-center"><div className="bg-white rounded-lg p-2 border border-gray-100"><p className="text-gray-400">Current</p><p className="font-bold text-gray-700 text-base">{p.overallPct}%</p><p className="text-gray-300">{p.attendedClasses}/{p.totalClasses} classes</p></div><div className="bg-white rounded-lg p-2 border border-gray-100"><p className="text-gray-400">Recent (last 10)</p><p className="font-bold text-gray-700 text-base">{p.recentPct}%</p><TrendArrow trend={p.trend} /></div><div className={`rounded-lg p-2 border ${pcfg.color}`}><p className="opacity-70">Projected</p><p className="font-bold text-base">{p.projectedPct}%</p><p className="opacity-70">end of sem</p></div></div><div><p className="text-xs text-gray-500 mb-1">Projected attendance</p><Bar pct={p.projectedPct} cls={pcfg.bar} /></div>

                          {p.isImpossible ? (
                            <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 font-medium">
                               Impossible to reach 80% attendance even if present for all remaining classes.
                            </p>
                          ) : p.classesNeeded > 0 && (
                            <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                               Needs to attend <strong>{p.classesNeeded} more consecutive classes</strong> to reach 80%
                            </p>
                          )}
                        </div>
                      )
                    })}
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

export default AdminPredictions
