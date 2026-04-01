const Marks = require('../models/Marks');
const Faculty = require('../models/Faculty');

const uploadMarks = async (req, res) => {
  try {
    const { courseId, studentId, examType, score, maxScore } = req.body;

    // Enforce: faculty can only upload marks for assigned courses.
    if (req.user?.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: req.user._id }).select('assignedCourses');
      if (!faculty) return res.status(403).json({ message: 'Forbidden' });
      const allowed = new Set((faculty.assignedCourses || []).map(String));
      if (!allowed.has(courseId.toString())) return res.status(403).json({ message: 'Forbidden' });
    }

    const marks = await Marks.findOneAndUpdate(
      { courseId, studentId, examType },
      { score, maxScore, percentage: Math.round((score / maxScore) * 100) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(marks);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const uploadBulk = async (req, res) => {
  try {
    const { courseId, examType, maxScore, records } = req.body;

    // Enforce: faculty can only upload marks for assigned courses.
    if (req.user?.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: req.user._id }).select('assignedCourses');
      if (!faculty) return res.status(403).json({ message: 'Forbidden' });
      const allowed = new Set((faculty.assignedCourses || []).map(String));
      if (!allowed.has(courseId.toString())) return res.status(403).json({ message: 'Forbidden' });
    }

    const ops = records.map(r => ({
      updateOne: {
        filter: { courseId, studentId: r.studentId, examType },
        update: { $set: { score: r.score, maxScore, percentage: Math.round((r.score / maxScore) * 100) } },
        upsert: true,
      }
    }));
    await Marks.bulkWrite(ops);
    res.status(201).json({ message: `Marks uploaded for ${records.length} students` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCourseMarks = async (req, res) => {
  try {
    const marks = await Marks.find({ courseId: req.params.courseId })
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } });
    res.json(marks);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getStudentMarks = async (req, res) => {
  try {
    const marks = await Marks.find({ studentId: req.params.studentId }).populate('courseId', 'name code');
    const grouped = {};
    for (const m of marks) {
      const cid = m.courseId._id.toString();
      if (!grouped[cid]) grouped[cid] = { course: m.courseId, exams: [] };
      grouped[cid].exams.push(m);
    }
    res.json(Object.values(grouped));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCourseSummary = async (req, res) => {
  try {
    const marks = await Marks.find({ courseId: req.params.courseId })
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } });
    const map = {};
    for (const m of marks) {
      const sid = m.studentId._id.toString();
      if (!map[sid]) map[sid] = { student: m.studentId, exams: {}, total: 0, count: 0 };
      map[sid].exams[m.examType] = m.percentage;
      map[sid].total += m.percentage;
      map[sid].count++;
    }
    res.json(Object.values(map).map(s => ({
      student: s.student, exams: s.exams,
      average: s.count ? Math.round(s.total / s.count) : 0,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { uploadMarks, uploadBulk, getCourseMarks, getStudentMarks, getCourseSummary };
