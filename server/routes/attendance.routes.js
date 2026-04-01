const express = require('express');
const router  = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/attendance.controller');

const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const Course     = require('../models/Course');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate.middleware');

router.use(protect);

// ── existing routes ──────────────────────────────────────────────────────────
router.post(
  '/',
  authorizeRoles('faculty'),
  [
    body('courseId').isMongoId(),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
    body('records').isArray({ min: 1 }),
    body('records.*.studentId').isMongoId(),
    body('records.*.status').isIn(['present', 'absent', 'late']),
  ],
  validateRequest,
  // #region agent log
  (req, res, next) => {
    // Local NDJSON evidence
    try {
      const fs = require('fs');
      const debugLogPath = 'd:\\FINALLY FINAL\\dt\\debug-fcdc73.log';
      fs.appendFileSync(
        debugLogPath,
        JSON.stringify({
          sessionId: 'fcdc73',
          id: `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          timestamp: Date.now(),
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'server/routes/attendance.routes.js:POST /',
          message: 'Attendance route hit',
          data: {
            path: req.path,
            baseUrl: req.baseUrl,
            recordsCount: Array.isArray(req.body?.records) ? req.body.records.length : null,
            hasCourseId: !!req.body?.courseId,
            hasDate: !!req.body?.date,
            role: req.user?.role || null,
          },
        }) + '\n',
        { encoding: 'utf8' }
      );
    } catch (e) { console.error('debug log write failed (attendance route):', e?.message); }

    // #region agent log (best-effort remote ingest)
    try {
      if (typeof fetch === 'function') {
        fetch('http://127.0.0.1:7793/ingest/67fad1ff-7483-4757-a62d-7b81ccc3b1f2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fcdc73' },
          body: JSON.stringify({
            sessionId: 'fcdc73',
            runId: 'pre-fix',
            hypothesisId: 'H1',
            location: 'server/routes/attendance.routes.js:POST /',
            message: 'Attendance route hit',
            data: {
              path: req.path,
              baseUrl: req.baseUrl,
              recordsCount: Array.isArray(req.body?.records) ? req.body.records.length : null,
              hasCourseId: !!req.body?.courseId,
              hasDate: !!req.body?.date,
              role: req.user?.role || null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
    } catch {}
    // #endregion agent log (best-effort remote ingest)
    next();
  },
  // #endregion agent log
  ctrl.markAttendance
);
router.get('/course/:id',     authorizeRoles('admin','faculty'),   ctrl.getCourseAttendance);
router.get('/summary/:id',    authorizeRoles('admin','faculty'),   ctrl.getCourseSummary);
router.get('/student/:id',    authorizeRoles('admin','faculty','student'), ctrl.getStudentAttendance);
router.post('/:id/unlock',    authorizeRoles('admin'),             ctrl.unlockAttendance);

// ── NEW: CSV export for a course ─────────────────────────────────────────────
// GET /api/attendance/export/:courseId
router.get('/export/:courseId', authorizeRoles('admin','faculty'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).select('name code');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Get all attendance records with student info
    const records = await Attendance.find({ courseId: req.params.courseId })
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
      .sort({ date: 1 });

    // Group by student
    const studentMap = {};
    for (const r of records) {
      const s   = r.studentId;
      const sid = s?._id?.toString();
      if (!sid) continue;
      if (!studentMap[sid]) {
        studentMap[sid] = {
          name:    s.userId?.name || 'Unknown',
          rollNo:  s.rollNo,
          dept:    s.department,
          records: []
        };
      }
      studentMap[sid].records.push(r);
    }

    // Build summary rows per student
    const rows = Object.values(studentMap).map(st => {
      const total    = st.records.filter(r => !r.excludeFromCalc).length;
      const attended = st.records.filter(r => !r.excludeFromCalc && ['present','late'].includes(r.status)).length;
      const pct      = total ? Math.round((attended / total) * 100) : 0;
      const absent   = st.records.filter(r => r.status === 'absent').length;
      const late     = st.records.filter(r => r.status === 'late').length;
      return [st.name, st.rollNo, st.dept, attended, total, absent, late, `${pct}%`, pct < 80 ? 'AT RISK' : 'SAFE'];
    });

    // CSV header
    const header = ['Name','Roll No','Department','Classes Attended','Total Classes','Absences','Late','Attendance %','Status'];
    const csv = [
      `Course: ${course.name} (${course.code})`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
      header.join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');

    const filename = `${course.code}_attendance_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
