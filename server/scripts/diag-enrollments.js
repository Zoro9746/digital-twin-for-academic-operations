require('dotenv').config();
const mongoose = require('mongoose');

// Ensure referenced models are registered for populate()
require('../models/User');
require('../models/Course');

const Faculty = require('../models/Faculty');
const Student = require('../models/Student');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const facs = await Faculty.find()
    .populate({ path: 'userId', select: 'email name' })
    .populate({ path: 'assignedCourses', select: '_id code name department' })
    .lean();

  const rows = [];
  for (const f of facs) {
    for (const c of (f.assignedCourses || [])) {
      const enrolledCount = await Student.countDocuments({ enrolledCourses: c._id });
      rows.push({
        facultyEmail: f.userId?.email || null,
        facultyName: f.userId?.name || null,
        courseId: String(c._id),
        courseCode: c.code,
        courseDept: c.department,
        enrolledCount,
      });
    }
  }

  rows.sort((a, b) => (a.enrolledCount - b.enrolledCount) || String(a.courseCode).localeCompare(String(b.courseCode)));

  const summary = {
    totalFaculty: facs.length,
    totalCourseAssignments: rows.length,
    zeroEnrolled: rows.filter(r => r.enrolledCount === 0).length,
    sampleZeroEnrolled: rows.filter(r => r.enrolledCount === 0).slice(0, 25),
    sampleNonZeroEnrolled: rows.filter(r => r.enrolledCount > 0).slice(0, 25),
  };

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('diag_error', e?.message || e);
  process.exit(1);
});

