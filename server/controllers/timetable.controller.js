const Timetable = require('../models/Timetable');
const Course    = require('../models/Course');
const Faculty   = require('../models/Faculty');
const Student   = require('../models/Student');

const DAY_OF_WEEK_NAME = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
};

const withDayName = (doc) => {
  const obj = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
  const day = DAY_OF_WEEK_NAME[obj?.dayOfWeek] || '';
  return { ...obj, day };
};

// GET /api/timetable  — all (admin) or by faculty (faculty role)
exports.getAll = async (req, res) => {
  try {
    const filter = req.user.role === 'faculty'
      ? { facultyId: (await Faculty.findOne({ userId: req.user._id }))?._id }
      : {};
    const entries = await Timetable.find(filter)
      .populate({ path: 'courseId',  select: 'name code department' })
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .sort({ dayOfWeek: 1, startTime: 1 });
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/timetable/faculty/:facultyId — timetable entries for a specific faculty
exports.getByFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const entries = await Timetable.find({ facultyId })
      .populate({ path: 'courseId', select: 'name code department semester' })
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } })
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json(entries.map(withDayName));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/timetable/today  — entries for current day of week (faculty)
exports.getToday = async (req, res) => {
  try {
    const jsDay = new Date().getDay(); // 0=Sun
    const dayOfWeek = jsDay === 0 || jsDay === 6 ? null : jsDay; // 1-5
    if (!dayOfWeek) return res.json([]);

    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });

    const entries = await Timetable.find({ facultyId: faculty._id, dayOfWeek })
      .populate('courseId', 'name code department')
      .sort({ startTime: 1 });
    // Keep current endpoint response shape; only add `day` for consistency.
    res.json(entries.map(withDayName));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/timetable/student/:studentId — timetable entries based on enrolled courses
exports.getStudentTimetable = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).select('enrolledCourses userId');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Prevent students from viewing other students' schedules
    if (req.user?.role === 'student') {
      if (!student.userId || student.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const enrolled = Array.isArray(student.enrolledCourses) ? student.enrolledCourses : [];
    if (!enrolled.length) return res.json([]);

    const entries = await Timetable.find({
      courseId: { $in: enrolled },
    })
      .populate({ path: 'courseId', select: 'name code' })
      .populate({
        path: 'facultyId',
        populate: { path: 'userId', select: 'name' },
      })
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json(
      entries.map(withDayName).map(e => ({
        _id: e._id,
        day: e.day,
        startTime: e.startTime,
        endTime: e.endTime,
        course: {
          _id: e.courseId?._id,
          name: e.courseId?.name,
          code: e.courseId?.code,
        },
        faculty: {
          _id: e.facultyId?._id,
          name: e.facultyId?.userId?.name,
        },
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/timetable
exports.create = async (req, res) => {
  try {
    const entry = await Timetable.create(req.body);
    const populated = await entry.populate([
      { path: 'courseId', select: 'name code department' },
      { path: 'facultyId', populate: { path: 'userId', select: 'name' } },
    ]);
    res.status(201).json(populated);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// PUT /api/timetable/:id
exports.update = async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate({ path: 'courseId',  select: 'name code department' })
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

// DELETE /api/timetable/:id
exports.remove = async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
