const mongoose = require('mongoose');

const AcademicCalendarSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  date:        { type: Date,   required: true },
  type:        { type: String, enum: ['holiday', 'exam', 'event', 'working'], default: 'holiday' },
  description: { type: String, default: '' },
  department:  { type: String, default: 'ALL' }, // ALL or specific dept

  // Attendance exclusion fields (used by calendar.controller.js)
  excludeFromAttendance: { type: Boolean, default: false }, // true => this calendar entry blocks attendance calculation
  endDate:               { type: Date, default: null },     // optional end date for multi-day events
  affectedPeriods:       { type: [Number], default: [] },  // optional: explicit periods blocked on a date (controller uses array length)

  // Period fields (new)
  periodsPerDay:    { type: Number, default: 6 },  // how many periods this day has in total
  examPeriods:      { type: Number, default: 0 },  // how many periods consumed by exams (excluded from attendance)
  isFullDayExcluded:{ type: Boolean, default: false }, // true = holiday, false = partial exam day
}, { timestamps: true });

AcademicCalendarSchema.index({ date: 1 });
AcademicCalendarSchema.index({ excludeFromAttendance: 1, date: 1 });

module.exports = mongoose.model('AcademicCalendar', AcademicCalendarSchema);