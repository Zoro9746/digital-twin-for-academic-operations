const PDFDocument = require('pdfkit');
const Student     = require('../models/Student');
const Attendance  = require('../models/Attendance');
const Marks       = require('../models/Marks');
const Course      = require('../models/Course');
const Faculty     = require('../models/Faculty');

// Predict trend (same logic as predict.controller, inlined to avoid circular dep)
const predictTrend = (records) => {
  const sorted   = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const total    = sorted.length;
  if (!total) return null;
  const attended = sorted.filter(r => r.status === 'present' || r.status === 'late').length;
  const overall  = Math.round((attended / total) * 100);
  const window   = sorted.slice(-10);
  const recAtt   = window.filter(r => r.status === 'present' || r.status === 'late').length;
  const recent   = window.length ? Math.round((recAtt / window.length) * 100) : overall;
  const projected = Math.round(0.6 * recent + 0.4 * overall);
  let risk = projected >= 85 ? 'SAFE' : projected >= 80 ? 'BORDERLINE' : projected >= 70 ? 'AT RISK' : 'CRITICAL';
  return { overall, recent, projected, risk, total, attended, trend: recent - overall };
};

const RISK_COLORS = { SAFE: [34, 197, 94], BORDERLINE: [234, 179, 8], 'AT RISK': [249, 115, 22], CRITICAL: [239, 68, 68] };
const BAR_MAX_WIDTH = 260;

const drawBar = (doc, x, y, pct, color) => {
  const w = Math.round((pct / 100) * BAR_MAX_WIDTH);
  doc.rect(x, y, BAR_MAX_WIDTH, 10).fillColor('#e5e7eb').fill();
  doc.rect(x, y, w, 10).fillColor(`rgb(${color.join(',')})`).fill();
  doc.fillColor('#374151');
};

// GET /api/reports/student/:studentId
const generateStudentReport = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId)
      .populate('userId', 'name email')
      .populate('enrolledCourses', 'name code department semester');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Prevent IDOR: a student can only generate reports for themselves.
    if (req.user?.role === 'student') {
      if (!student.userId?._id || student.userId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    // Prevent IDOR for faculty: allow only courses assigned to the requesting faculty.
    let enrolledCourses = student.enrolledCourses || [];
    if (req.user?.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: req.user._id }).select('assignedCourses');
      if (!faculty) return res.status(403).json({ message: 'Forbidden' });

      const allowed = new Set((faculty.assignedCourses || []).map(String));
      enrolledCourses = enrolledCourses.filter(c => allowed.has(c._id.toString()));
      if (!enrolledCourses.length) return res.status(403).json({ message: 'Forbidden' });
    }

    // Gather data
    const reportData = [];
    for (const course of enrolledCourses) {
      const attRecords = await Attendance.find({ studentId: student._id, courseId: course._id, excludeFromCalc: false });
      const marks      = await Marks.find({ studentId: student._id, courseId: course._id });
      const pred       = predictTrend(attRecords);
      reportData.push({ course, attRecords, marks, pred });
    }

    // Build PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="report-${student.rollNo}.pdf"`);
    doc.pipe(res);

    const W = 495; // usable width

    // ── Header band ───────────────────────────────────────────────────────────
    doc.rect(50, 50, W, 70).fillColor('#1e40af').fill();
    doc.fillColor('#ffffff')
       .fontSize(18).font('Helvetica-Bold')
       .text('DIGITAL TWIN — ACADEMIC REPORT', 65, 65)
       .fontSize(10).font('Helvetica')
       .text(`${student.userId?.name}  ·  ${student.rollNo}  ·  ${student.department} Sem ${student.semester}`, 65, 90)
       .text(`Generated: ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`, 65, 105);

    doc.fillColor('#374151');
    let y = 140;

    // ── Overall summary strip ─────────────────────────────────────────────────
    const totalPct = reportData.length
      ? Math.round(reportData.reduce((s, d) => s + (d.pred?.overall || 0), 0) / reportData.length)
      : 0;
    const atRiskCount = reportData.filter(d => ['AT RISK','CRITICAL'].includes(d.pred?.risk)).length;
    const riskColor   = atRiskCount > 0 ? '#fef3c7' : '#f0fdf4';
    const riskBorder  = atRiskCount > 0 ? '#f59e0b' : '#22c55e';

    doc.rect(50, y, W, 36).fillColor(riskColor).fill();
    doc.rect(50, y, 4, 36).fillColor(riskBorder).fill();
    doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold')
       .text(`Overall Avg Attendance: ${totalPct}%`, 64, y + 8)
       .font('Helvetica')
       .text(`Courses at risk: ${atRiskCount} / ${reportData.length}`, 64, y + 22);
    y += 50;

    // ── Per-course sections ───────────────────────────────────────────────────
    for (const { course, marks, pred } of reportData) {
      if (y > 700) { doc.addPage(); y = 50; }

      // Course header
      doc.rect(50, y, W, 22).fillColor('#f1f5f9').fill();
      doc.fillColor('#1e40af').fontSize(11).font('Helvetica-Bold')
         .text(`${course.name}`, 58, y + 6)
         .fillColor('#64748b').font('Helvetica').fontSize(9)
         .text(`${course.code}`, 58 + doc.widthOfString(course.name) + 10, y + 7);
      y += 28;

      if (pred) {
        // Attendance row
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text('Attendance', 58, y);
        const rColor = RISK_COLORS[pred.risk] || [100,100,100];
        doc.fillColor(`rgb(${rColor.join(',')})`).font('Helvetica')
           .text(`${pred.overall}%  ·  ${pred.risk}`, 140, y);
        y += 14;
        drawBar(doc, 58, y, pred.overall, rColor);
        y += 16;

        // Trend line
        const trendArrow = pred.trend > 2 ? '▲ Improving' : pred.trend < -2 ? '▼ Declining' : '→ Stable';
        const trendCol   = pred.trend > 2 ? '#16a34a'     : pred.trend < -2 ? '#dc2626'     : '#d97706';
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text('Trend (last 10)', 58, y);
        doc.fillColor(trendCol).font('Helvetica').text(`${trendArrow}  (Recent: ${pred.recent}%  →  Projected: ${pred.projected}%)`, 140, y);
        y += 18;
      }

      // Marks row
      if (marks.length) {
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text('Marks', 58, y);
        const markStr = marks.map(m => `${m.examType}: ${m.score}/${m.maxScore} (${m.percentage}%)`).join('   ');
        doc.font('Helvetica').text(markStr, 140, y);
        y += 18;
      }

      // Divider
      doc.moveTo(58, y).lineTo(540, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += 12;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.rect(50, 780, W, 1).fillColor('#e2e8f0').fill();
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
       .text('This report is auto-generated by the Digital Twin for Academic Operations system. For official use only.', 50, 788, { width: W, align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err.message);
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
};

module.exports = { generateStudentReport };
