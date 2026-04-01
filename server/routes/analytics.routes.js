const express    = require('express');
const router     = express.Router();
const mongoose   = require('mongoose');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { predictStudentRisk, predictAll } = require('../controllers/predict.controller');

const Student    = require('../models/Student');
const Faculty    = require('../models/Faculty');
const Attendance = require('../models/Attendance');
const Alert      = require('../models/Alert');
const Course     = require('../models/Course');

router.use(protect);

// GET /api/analytics/overview  — fast version using aggregation
router.get('/overview', authorizeRoles('admin'), async (req, res) => {
  try {
    const [totalStudents, totalFaculty, totalCourses, unreadAlerts] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Course.countDocuments(),
      Alert.countDocuments({ isRead: false }),
    ]);

    // Avg attendance using aggregation (single query, not a loop)
    const attAgg = await Attendance.aggregate([
      { $match: { excludeFromCalc: false } },
      { $group: {
        _id: null,
        total:    { $sum: 1 },
        attended: { $sum: { $cond: [{ $in: ['$status', ['present','late']] }, 1, 0] } }
      }}
    ]);
    const avgAttendance = attAgg.length
      ? Math.round((attAgg[0].attended / attAgg[0].total) * 100)
      : 0;

    // At-risk count using aggregation — group by studentId+courseId, calc pct
    const riskAgg = await Attendance.aggregate([
      { $match: { excludeFromCalc: false } },
      { $group: {
        _id: { studentId: '$studentId', courseId: '$courseId' },
        total:    { $sum: 1 },
        attended: { $sum: { $cond: [{ $in: ['$status', ['present','late']] }, 1, 0] } }
      }},
      { $project: {
        pct: { $multiply: [{ $divide: ['$attended', '$total'] }, 100] }
      }},
      { $match: { pct: { $lt: 80 } } },
      { $group: { _id: '$_id.studentId' } },  // unique students at risk
      { $count: 'count' }
    ]);
    const atRiskCount = riskAgg.length ? riskAgg[0].count : 0;

    res.json({ totalStudents, totalFaculty, totalCourses, unreadAlerts, avgAttendance, atRiskCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/analytics/at-risk  — fast version
router.get('/at-risk', authorizeRoles('admin', 'faculty'), async (req, res) => {
  try {
    // Get all pct per student+course in one aggregation
    const riskAgg = await Attendance.aggregate([
      { $match: { excludeFromCalc: false } },
      { $group: {
        _id: { studentId: '$studentId', courseId: '$courseId' },
        total:    { $sum: 1 },
        attended: { $sum: { $cond: [{ $in: ['$status', ['present','late']] }, 1, 0] } }
      }},
      { $project: {
        studentId: '$_id.studentId',
        courseId:  '$_id.courseId',
        total:     1, attended: 1,
        pct: { $multiply: [{ $divide: ['$attended', '$total'] }, 100] }
      }},
      { $match: { pct: { $lt: 80 } } }
    ]);

    if (!riskAgg.length) return res.json([]);

    // Batch-fetch students and courses
    const studentIds = [...new Set(riskAgg.map(r => r.studentId.toString()))];
    const courseIds  = [...new Set(riskAgg.map(r => r.courseId.toString()))];

    const [students, courses] = await Promise.all([
      Student.find({ _id: { $in: studentIds } }).populate('userId', 'name email'),
      Course.find({ _id: { $in: courseIds } }, 'name code'),
    ]);

    const studentMap = Object.fromEntries(students.map(s => [s._id.toString(), s]));
    const courseMap  = Object.fromEntries(courses.map(c => [c._id.toString(), c]));

    // Group by student
    const grouped = {};
    for (const r of riskAgg) {
      const sid = r.studentId.toString();
      const s   = studentMap[sid];
      const c   = courseMap[r.courseId.toString()];
      if (!s || !c) continue;
      if (!grouped[sid]) grouped[sid] = {
        student: { _id: s._id, name: s.userId?.name, rollNo: s.rollNo, department: s.department },
        courses: []
      };
      grouped[sid].courses.push({
        course: { name: c.name, code: c.code },
        percentage: Math.round(r.pct),
        total: r.total, attended: r.attended,
      });
    }

    res.json(Object.values(grouped));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/analytics/department  — fast version
router.get('/department', authorizeRoles('admin'), async (req, res) => {
  try {
    const [courseDepts, students] = await Promise.all([
      Course.distinct('department'),
      Student.find({}, '_id department'),
    ]);

    // Departments: union of what exists in Courses + Students.
    const deptSet = new Set(
      [...(courseDepts || []), ...(students || []).map(s => s.department)]
        .filter(Boolean)
        .map(d => String(d).trim())
        .filter(Boolean)
    );
    const depts = [...deptSet].sort((a, b) => a.localeCompare(b));

    // Group student ids by dept
    const deptMap = {};
    for (const s of (students || [])) {
      const d = String(s.department || '').trim();
      if (!d) continue;
      if (!deptMap[d]) deptMap[d] = [];
      deptMap[d].push(s._id);
    }

    const result = await Promise.all(depts.map(async (dept) => {
      const ids = deptMap[dept] || [];
      if (!ids.length) return { department: dept, studentCount: 0, avgAttendance: 0 };

      const agg = await Attendance.aggregate([
        { $match: { studentId: { $in: ids }, excludeFromCalc: false } },
        { $group: {
          _id: null,
          total:    { $sum: 1 },
          attended: { $sum: { $cond: [{ $in: ['$status', ['present','late']] }, 1, 0] } }
        }}
      ]);

      const avgAtt = agg.length ? Math.round((agg[0].attended / agg[0].total) * 100) : 0;
      return { department: dept, studentCount: ids.length, avgAttendance: avgAtt };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Prediction routes
router.get('/predict-all',        authorizeRoles('admin', 'faculty'), predictAll);
router.get('/predict/:studentId', authorizeRoles('admin', 'faculty', 'student'), predictStudentRisk);

module.exports = router;
