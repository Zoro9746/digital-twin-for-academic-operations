const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true },
    studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    date:       { type: String, required: true }, // stored as "YYYY-MM-DD"
    status:     { type: String, enum: ['present', 'absent', 'late'], required: true },
    // Phase 4 — lock system
    isLocked:   { type: Boolean, default: false },
    lockedAt:   { type: Date,    default: null  },
    // Phase 7 — petition override
    excludeFromCalc: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate attendance for same student + course + date
AttendanceSchema.index({ courseId: 1, studentId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ studentId: 1 });
AttendanceSchema.index({ courseId: 1 });
// Common query patterns
AttendanceSchema.index({ courseId: 1, date: 1 });
AttendanceSchema.index({ studentId: 1, courseId: 1, excludeFromCalc: 1 });
AttendanceSchema.index({ excludeFromCalc: 1, status: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);