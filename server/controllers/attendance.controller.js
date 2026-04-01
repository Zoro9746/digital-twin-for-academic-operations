const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const Faculty    = require('../models/Faculty');
const Course     = require('../models/Course');
const Alert      = require('../models/Alert');

const calcPct = async (studentId, courseId) => {
  const records  = await Attendance.find({ studentId, courseId, excludeFromCalc: false });
  if (!records.length) return 0;
  const attended = records.filter(r => r.status === 'present' || r.status === 'late').length;
  return Math.round((attended / records.length) * 100);
};

const markAttendance = async (req, res) => {
  try {
    const { courseId, date, records } = req.body;

    const existing = await Attendance.findOne({ courseId, date });
    if (existing)
      return res.status(400).json({ message: 'Attendance already marked for this date' });

    const io      = req.app.get('io');
    const course  = await Course.findById(courseId);

    // Enforce: faculty can only mark attendance for assigned courses.
    const facultyProfile = await Faculty.findOne({ userId: req.user._id }).select('_id assignedCourses userId');
    if (!facultyProfile) return res.status(403).json({ message: 'Forbidden' });

    const ownsCourse =
      (facultyProfile.assignedCourses || []).some(c => c.toString() === courseId.toString()) ||
      (course?.facultyId && course.facultyId.toString() === facultyProfile._id.toString());

    if (!ownsCourse) return res.status(403).json({ message: 'Forbidden' });

    await Attendance.insertMany(
      records.map(r => ({ courseId, date, studentId: r.studentId, status: r.status }))
    );

    // Find the faculty assigned to this course so we can alert them
    const faculty = course?.facultyId
      ? await Faculty.findById(course.facultyId)
      : facultyProfile;

    for (const r of records) {
      const pct = await calcPct(r.studentId, courseId);

      if (pct < 80) {
        const student = await Student.findById(r.studentId);
        if (!student) continue;

        // ── Student alert ────────────────────────────────────────────────────
        const alreadyAlerted = await Alert.findOne({
          userId: student.userId, type: 'LOW_ATTENDANCE', isRead: false,
          message: { $regex: course?.name || '' },
        });
        if (!alreadyAlerted) {
          const studentAlert = await Alert.create({
            userId:  student.userId,
            type:    'LOW_ATTENDANCE',
            message: `Your attendance in ${course?.name || 'a course'} has dropped to ${pct}% — below the required 80%.`,
          });
          if (io) io.to(`user:${student.userId}`).emit('alert:new', studentAlert);
        }

        // ── Faculty alert ─────────────────────────────────────────────────────
        if (faculty) {
          const facultyAlreadyAlerted = await Alert.findOne({
            userId: faculty.userId, type: 'LOW_ATTENDANCE',
            message: { $regex: student.rollNo || '' },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // once per day
          });
          if (!facultyAlreadyAlerted) {
            const facultyAlert = await Alert.create({
              userId:  faculty.userId,
              type:    'LOW_ATTENDANCE',
              message: `⚠️ Student ${student.rollNo} attendance in ${course?.name} has dropped to ${pct}%.`,
            });
            if (io) io.to(`user:${faculty.userId}`).emit('alert:new', facultyAlert);
          }
        }
      }
    }

    // Broadcast to admin dashboard for live refresh
    if (io) io.emit('attendance:updated', { courseId, date });

    res.status(201).json({ message: 'Attendance marked successfully' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ message: 'Attendance already marked for one or more students' });
    res.status(500).json({ message: err.message });
  }
};

const getCourseAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ courseId: req.params.id })
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
      .sort({ date: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getStudentAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.id })
      .populate('courseId', 'name code');
    const grouped = {};
    for (const r of records) {
      const cid = r.courseId._id.toString();
      if (!grouped[cid]) grouped[cid] = { course: r.courseId, total: 0, attended: 0, records: [] };
      grouped[cid].total++;
      if (r.status === 'present' || r.status === 'late') grouped[cid].attended++;
      grouped[cid].records.push(r);
    }
    res.json(Object.values(grouped).map(g => ({
      course: g.course, total: g.total, attended: g.attended,
      percentage: g.total ? Math.round((g.attended / g.total) * 100) : 0,
      records: g.records,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCourseSummary = async (req, res) => {
  try {
    const records = await Attendance.find({ courseId: req.params.id })
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } });
    const map = {};
    for (const r of records) {
      const sid = r.studentId._id.toString();
      if (!map[sid]) map[sid] = { student: r.studentId, total: 0, attended: 0 };
      map[sid].total++;
      if (r.status === 'present' || r.status === 'late') map[sid].attended++;
    }
    res.json(Object.values(map).map(s => ({
      student: s.student, total: s.total, attended: s.attended,
      percentage: s.total ? Math.round((s.attended / s.total) * 100) : 0,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const unlockAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(
      req.params.id, { isLocked: false, lockedAt: null }, { new: true }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Unlocked', record });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  markAttendance, getCourseAttendance, getStudentAttendance,
  getCourseSummary, unlockAttendance,
};
