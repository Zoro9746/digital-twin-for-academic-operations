const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Alert = require('../models/Alert');

const getOverview = async (req, res) => {
  try {
    const [studentCount, facultyCount, courseCount, alertCount] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Course.countDocuments(),
      Alert.countDocuments({ type: 'LOW_ATTENDANCE', isRead: false }),
    ]);

    // Avg attendance across all attendance records that participate in calculation.
    const [attAgg] = await Attendance.aggregate([
      { $match: { excludeFromCalc: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          attended: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
          },
        }
      },
    ]);

    const avgAttendance = attAgg?.total
      ? Math.round((attAgg.attended / attAgg.total) * 100)
      : 0;

    // At-risk: a student is at-risk if ANY course percentage is < 80.
    const riskAgg = await Attendance.aggregate([
      { $match: { excludeFromCalc: false } },
      {
        $group: {
          _id: { studentId: '$studentId', courseId: '$courseId' },
          total: { $sum: 1 },
          attended: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
          },
        }
      },
      {
        $project: {
          studentId: '$_id.studentId',
          courseId: '$_id.courseId',
          pct: { $multiply: [{ $divide: ['$attended', '$total'] }, 100] },
        }
      },
      { $group: { _id: '$studentId', minPct: { $min: '$pct' } } },
      { $match: { minPct: { $lt: 80 } } },
      { $count: 'count' },
    ]);

    const atRisk = riskAgg.length ? riskAgg[0].count : 0;
    res.json({ studentCount, facultyCount, courseCount, alertCount, avgAttendance, atRisk });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getAtRiskStudents = async (req, res) => {
  try {
    // Compute pct per student+course in one aggregation pass.
    const statsAgg = await Attendance.aggregate([
      { $match: { excludeFromCalc: false } },
      {
        $group: {
          _id: { studentId: '$studentId', courseId: '$courseId' },
          total: { $sum: 1 },
          attended: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
          },
        }
      },
      {
        $project: {
          studentId: '$_id.studentId',
          courseId: '$_id.courseId',
          total: 1,
          attended: 1,
          pct: { $multiply: [{ $divide: ['$attended', '$total'] }, 100] },
        }
      },
    ]);

    const studentIds = [...new Set(statsAgg.map(r => r.studentId.toString()))];
    const courseIds = [...new Set(statsAgg.map(r => r.courseId.toString()))];

    const [students, courses] = await Promise.all([
      Student.find({ _id: { $in: studentIds } }).populate('userId', 'name email'),
      Course.find({ _id: { $in: courseIds } }).select('name code'),
    ]);

    const studentMap = Object.fromEntries(students.map(s => [s._id.toString(), s]));
    const courseMap = Object.fromEntries(courses.map(c => [c._id.toString(), c]));

    const byStudent = {};
    for (const r of statsAgg) {
      const sid = r.studentId.toString();
      const cid = r.courseId.toString();
      const student = studentMap[sid];
      const course = courseMap[cid];
      if (!student || !course) continue;

      if (!byStudent[sid]) byStudent[sid] = { student, courseStats: [], minAttendance: 100 };

      const pct = Math.round(r.pct);
      byStudent[sid].courseStats.push({
        course,
        attended: r.attended,
        total: r.total,
        percentage: pct,
      });
      if (pct < byStudent[sid].minAttendance) byStudent[sid].minAttendance = pct;
    }

    const result = Object.values(byStudent)
      .filter(x => x.minAttendance < 80)
      .sort((a, b) => a.minAttendance - b.minAttendance);

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getDepartmentStats = async (req, res) => {
  try {
    const students = await Student.find().select('_id department');
    const studentDept = Object.fromEntries(students.map(s => [s._id.toString(), s.department]));

    const deptMap = {};
    for (const s of students) {
      if (!deptMap[s.department]) deptMap[s.department] = { students: 0, atRisk: 0, totalPct: 0, count: 0 };
      deptMap[s.department].students++;
    }

    // Attendance pct per student+course to compute:
    // - avgAttendance per dept (avg of course percentages, matching previous controller behavior)
    // - atRisk per dept (student has ANY course pct < 80)
    const statsAgg = await Attendance.aggregate([
      { $match: { excludeFromCalc: false } },
      {
        $group: {
          _id: { studentId: '$studentId', courseId: '$courseId' },
          total: { $sum: 1 },
          attended: {
            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
          },
        }
      },
      {
        $project: {
          studentId: '$_id.studentId',
          courseId: '$_id.courseId',
          total: 1,
          attended: 1,
          pct: { $multiply: [{ $divide: ['$attended', '$total'] }, 100] },
        }
      },
    ]);

    const minByStudent = {};
    for (const r of statsAgg) {
      const sid = r.studentId.toString();
      const dept = studentDept[sid];
      if (!dept) continue;

      if (!deptMap[dept]) deptMap[dept] = { students: 0, atRisk: 0, totalPct: 0, count: 0 };

      const pct = Math.round(r.pct);
      deptMap[dept].totalPct += pct;
      deptMap[dept].count++;

      if (!minByStudent[sid]) minByStudent[sid] = pct;
      if (pct < minByStudent[sid]) minByStudent[sid] = pct;
    }

    for (const [sid, minPct] of Object.entries(minByStudent)) {
      const dept = studentDept[sid];
      if (!dept) continue;
      if (minPct < 80) deptMap[dept].atRisk++;
    }

    res.json(Object.entries(deptMap).map(([dept, d]) => ({
      department: dept,
      studentCount: d.students,
      atRisk: d.atRisk,
      avgAttendance: d.count ? Math.round(d.totalPct / d.count) : 0,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getOverview, getAtRiskStudents, getDepartmentStats };
