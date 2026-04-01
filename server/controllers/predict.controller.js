const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const Course     = require('../models/Course');
const Marks      = require('../models/Marks');

/**
 * Predict end-of-semester attendance for a student in a course.
 * Uses last 10 classes as the "recent trend window".
 * Formula:
 *   - overall %       = attended / total so far
 *   - recent %        = attended in last 10 / 10
 *   - trend           = recent % - overall %
 *   - weight = 0.6 * recent + 0.4 * overall  (recency-weighted)
 *   - projected %     = weighted pct (what they'll land at if trend holds)
 *   - classes needed  = how many more consecutive present to hit 80%
 */
const predictStudent = (records) => {
  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const total  = sorted.length;
  if (total === 0) return null;

  const attended = sorted.filter(r => r.status === 'present' || r.status === 'late').length;
  const overallPct = Math.round((attended / total) * 100);

  // Recent trend: last 10 classes
  const window  = sorted.slice(-10);
  const recAtt  = window.filter(r => r.status === 'present' || r.status === 'late').length;
  const recentPct = window.length > 0 ? Math.round((recAtt / window.length) * 100) : overallPct;

  const trend = recentPct - overallPct; // positive = improving, negative = declining

  // Weighted projection
  const projectedPct = Math.round(0.6 * recentPct + 0.4 * overallPct);

  // How many consecutive classes needed to hit 80% instantly
  // Formula: (attended + x) / (total + x) = 0.8  =>  0.2x = 0.8*total - attended  =>  x = 4*total - 5*attended
  const consecutiveNeeded = Math.ceil(4 * total - 5 * attended);
  const classesNeeded = Math.max(0, consecutiveNeeded);

  // Assuming ~30 more classes remain in the semester
  const remaining = 30;
  const isImpossible = consecutiveNeeded > remaining;

  // Risk level
  let riskLevel;
  if (projectedPct >= 85)                         riskLevel = 'safe';
  else if (projectedPct >= 80)                    riskLevel = 'borderline';
  else if (projectedPct >= 70 || trend < -10)     riskLevel = 'at_risk';
  else                                            riskLevel = 'critical';

  return {
    overallPct,
    recentPct,
    trend,          // +ve = improving, -ve = declining
    projectedPct,
    riskLevel,
    classesNeeded,
    isImpossible,
    totalClasses: total,
    attendedClasses: attended,
  };
};

// GET /api/analytics/predict/:studentId
const predictStudentRisk = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId)
      .populate('enrolledCourses', 'name code')
      .populate('userId', 'name email');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const predictions = [];
    for (const course of student.enrolledCourses) {
      const records = await Attendance.find({
        studentId: student._id, courseId: course._id, excludeFromCalc: false,
      });
      const pred = predictStudent(records);
      if (pred) predictions.push({ course: { _id: course._id, name: course.name, code: course.code }, ...pred });
    }

    res.json({ student: { _id: student._id, name: student.userId?.name, rollNo: student.rollNo, department: student.department }, predictions });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/analytics/predict-all  — admin: all at-risk students with trend
const predictAll = async (req, res) => {
  try {
    const students = await Student.find().populate('userId', 'name').populate('enrolledCourses', 'name code');
    const results  = [];

    // Fetch all applicable attendance records at once to prevent N+1 queries
    const allAttendances = await Attendance.find({ excludeFromCalc: false }).lean();
    
    // Group records by studentId and courseId
    const attendanceMap = {};
    for (const record of allAttendances) {
      const key = `${record.studentId.toString()}_${record.courseId.toString()}`;
      if (!attendanceMap[key]) attendanceMap[key] = [];
      attendanceMap[key].push(record);
    }

    for (const student of students) {
      const studentPreds = [];
      for (const course of student.enrolledCourses) {
        const key = `${student._id.toString()}_${course._id.toString()}`;
        const records = attendanceMap[key] || [];
        
        const pred = predictStudent(records);
        if (pred) studentPreds.push({ course: { name: course.name, code: course.code }, ...pred });
      }
      
      const worstRisk = studentPreds.reduce((worst, p) => {
        const order = { critical: 0, at_risk: 1, borderline: 2, safe: 3 };
        return (order[p.riskLevel] < order[worst]) ? p.riskLevel : worst;
      }, 'safe');
      
      if (worstRisk !== 'safe') {
        results.push({
          student: { _id: student._id, name: student.userId?.name, rollNo: student.rollNo, department: student.department },
          worstRisk,
          predictions: studentPreds.filter(p => p.riskLevel !== 'safe'),
        });
      }
    }

    // Sort: critical first
    const order = { critical: 0, at_risk: 1, borderline: 2 };
    results.sort((a, b) => order[a.worstRisk] - order[b.worstRisk]);
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { predictStudentRisk, predictAll };
