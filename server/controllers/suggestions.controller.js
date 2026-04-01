const Student    = require('../models/Student');
const Attendance = require('../models/Attendance');
const Marks      = require('../models/Marks');
const Faculty    = require('../models/Faculty');

const getStudentSuggestions = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId)
      .populate('userId', 'name email')
      .populate('enrolledCourses', 'name code department semester');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Prevent IDOR: enforce that only the student themselves (or authorized faculty/admin) can access suggestions.
    let enrolledCourses = student.enrolledCourses || [];
    if (req.user?.role === 'student') {
      if (!student.userId?._id || student.userId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } else if (req.user?.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: req.user._id }).select('assignedCourses');
      if (!faculty) return res.status(403).json({ message: 'Forbidden' });

      const allowed = new Set((faculty.assignedCourses || []).map(String));
      enrolledCourses = enrolledCourses.filter(c => allowed.has(c._id.toString()));
      if (!enrolledCourses.length) return res.status(403).json({ message: 'Forbidden' });
    }

    // ── Fetch attendance per course ──────────────────────────────────────────
    const attAgg = await Attendance.aggregate([
      { $match: { studentId: student._id, excludeFromCalc: false } },
      { $sort:  { date: 1 } },
      { $group: {
        _id:      '$courseId',
        total:    { $sum: 1 },
        attended: { $sum: { $cond: [{ $in: ['$status', ['present','late']] }, 1, 0] } },
        records:  { $push: { date: '$date', status: '$status' } },
      }},
    ]);

    // ── Fetch marks per course ───────────────────────────────────────────────
    const marksAgg = await Marks.aggregate([
      { $match: { studentId: student._id } },
      { $group: {
        _id:   '$courseId',
        marks: { $push: { examType: '$examType', score: '$score', maxScore: '$maxScore', percentage: '$percentage' } },
      }},
    ]);

    const marksMap = {};
    for (const m of marksAgg) marksMap[m._id.toString()] = m.marks;

    // ── Build per-course analysis ────────────────────────────────────────────
    const courseAnalysis = [];

    for (const course of enrolledCourses) {
      const cid  = course._id.toString();
      const att  = attAgg.find(a => a._id.toString() === cid);
      const marks = marksMap[cid] || [];

      // Attendance metrics
      let attPct = null, recentPct = null, trend = 'no data', attended = 0, total = 0;
      if (att) {
        total    = att.total;
        attended = att.attended;
        attPct   = total > 0 ? Math.round((attended / total) * 100) : 0;
        const last10   = att.records.slice(-10);
        const recAtt   = last10.filter(r => ['present','late'].includes(r.status)).length;
        recentPct      = last10.length > 0 ? Math.round((recAtt / last10.length) * 100) : attPct;
        trend = recentPct > attPct ? 'improving' : recentPct < attPct ? 'declining' : 'stable';
      }

      // Marks metrics
      let avgMark = null;
      const examDetails = [];
      if (marks.length > 0) {
        avgMark = Math.round(marks.reduce((s, m) => s + (m.percentage || 0), 0) / marks.length);
        for (const m of marks) {
          const label = m.examType === 'internal1' ? 'Internal I'
                      : m.examType === 'internal2' ? 'Internal II'
                      : m.examType === 'midterm'   ? 'Midterm'
                      : m.examType;
          examDetails.push({ label, score: m.score, maxScore: m.maxScore, percentage: m.percentage });
        }
      }

      // ── Generate subject-specific suggestions ──────────────────────────────
      const suggestions = [];

      // Attendance suggestions
      if (attPct === null) {
        suggestions.push({ type: 'info', icon: '📅', text: 'No attendance records yet for this course.' });
      } else if (attPct < 75) {
        const needed = Math.ceil(0.8 * (total + 20) - attended);
        suggestions.push({ type: 'critical', icon: '🚨', text: `Attendance is critically low at ${attPct}%. You need ${needed} more consecutive classes to recover above 80%. Speak to your faculty immediately — you may be at risk of detention.` });
      } else if (attPct < 80) {
        const needed = Math.ceil(0.8 * (total + 10) - attended);
        suggestions.push({ type: 'warning', icon: '⚠️', text: `Attendance is ${attPct}% — just below the 80% requirement. Do not miss another class. Attend ${needed} more consecutive classes to get safe.` });
      } else if (attPct >= 90) {
        suggestions.push({ type: 'success', icon: '✅', text: `Excellent attendance at ${attPct}%. You have attended ${attended} of ${total} classes. Keep this up.` });
      } else {
        suggestions.push({ type: 'info', icon: '📅', text: `Attendance is ${attPct}% — above the minimum. You have a small buffer but don't take it for granted.` });
      }

      // Trend suggestion
      if (trend === 'declining' && attPct !== null) {
        suggestions.push({ type: 'warning', icon: '📉', text: `Your attendance in this subject has been declining recently (recent pace: ${recentPct}% vs overall: ${attPct}%). Identify the reason and get back on track before it affects your eligibility.` });
      } else if (trend === 'improving' && attPct < 85) {
        suggestions.push({ type: 'success', icon: '📈', text: `Good — your attendance trend is improving (recent: ${recentPct}%). Keep the momentum going.` });
      }

      // Marks suggestions
      if (marks.length === 0) {
        suggestions.push({ type: 'info', icon: '📝', text: 'No marks have been uploaded yet for this subject.' });
      } else {
        if (avgMark < 35) {
          suggestions.push({ type: 'critical', icon: '🚨', text: `Your average mark in this subject is ${avgMark}% — below the passing threshold. You are at risk of failing. Meet your faculty, get previous year question papers, and focus on high-weightage topics immediately.` });
        } else if (avgMark < 50) {
          suggestions.push({ type: 'warning', icon: '📖', text: `Average mark is ${avgMark}%. You need to improve significantly. Revise fundamentals, attempt practice problems, and clarify doubts with your faculty before the next exam.` });
        } else if (avgMark < 65) {
          suggestions.push({ type: 'info', icon: '📚', text: `Average mark is ${avgMark}%. You are passing but there is room to improve. Focus on the topics where you lost marks in previous exams.` });
        } else if (avgMark >= 80) {
          suggestions.push({ type: 'success', icon: '🏆', text: `Strong performance with ${avgMark}% average marks. Aim for 90%+ by reviewing your mistakes and attempting advanced problems.` });
        } else {
          suggestions.push({ type: 'success', icon: '👍', text: `Good marks at ${avgMark}% average. Keep revising consistently to maintain and improve this.` });
        }

        // Exam-specific advice
        for (const e of examDetails) {
          if (e.percentage < 40) {
            suggestions.push({ type: 'warning', icon: '📋', text: `You scored only ${e.percentage}% in ${e.label} (${e.score}/${e.maxScore}). Review the topics covered in that exam — they are likely to appear again in finals.` });
          }
        }

        // Good attendance but poor marks
        if (attPct !== null && attPct >= 80 && avgMark < 50) {
          suggestions.push({ type: 'info', icon: '💡', text: `You are attending classes regularly but marks are not reflecting it. The gap is likely in revision and exam technique — not effort. After each class, spend 15 minutes reviewing your notes.` });
        }
      }

      // Overall health
      let health = 'good';
      if ((attPct !== null && attPct < 80) || (avgMark !== null && avgMark < 40)) health = 'critical';
      else if ((attPct !== null && attPct < 85) || (avgMark !== null && avgMark < 55)) health = 'warning';

      courseAnalysis.push({
        courseId:   course._id,
        courseName: course.name,
        courseCode: course.code,
        semester:   course.semester,
        attendance: attPct !== null ? { pct: attPct, attended, total, recentPct, trend } : null,
        marks:      examDetails,
        avgMark,
        health,
        suggestions,
      });
    }

    // ── Overall summary ──────────────────────────────────────────────────────
    const withAtt   = courseAnalysis.filter(c => c.attendance);
    const withMarks = courseAnalysis.filter(c => c.avgMark !== null);
    const avgAttendance = withAtt.length   ? Math.round(withAtt.reduce((s,c) => s + c.attendance.pct, 0) / withAtt.length) : null;
    const avgMarks      = withMarks.length ? Math.round(withMarks.reduce((s,c) => s + c.avgMark, 0) / withMarks.length)    : null;
    const atRiskCount   = withAtt.filter(c => c.attendance.pct < 80).length;
    const lowMarksCount = withMarks.filter(c => c.avgMark < 50).length;

    const strongest = withMarks.length ? withMarks.reduce((a, b) => (b.avgMark > a.avgMark ? b : a)) : null;
    const weakest   = withMarks.length ? withMarks.reduce((a, b) => (b.avgMark < a.avgMark ? b : a)) : null;

    res.json({
      student: { name: student.userId?.name, rollNo: student.rollNo, department: student.department, semester: student.semester },
      summary: { avgAttendance, avgMarks, atRiskCount, lowMarksCount,
        strongestCourse: strongest ? { name: strongest.courseName, code: strongest.courseCode, mark: strongest.avgMark } : null,
        weakestCourse:   weakest   ? { name: weakest.courseName,   code: weakest.courseCode,   mark: weakest.avgMark   } : null,
      },
      courses: courseAnalysis,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getStudentSuggestions };
