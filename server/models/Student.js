const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, unique: true },
  rollNo:             { type: String, required: true, unique: true, uppercase: true },
  department:         { type: String, required: true },
  semester:           { type: Number, required: true, min: 1, max: 8 },
  enrolledCourses:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  parentEmail:        { type: String, default: '' },
  parentPhone:        { type: String, default: '' },
  regulation:         { type: String, default: 'R2021' },
  notificationOptOut: { type: Boolean, default: false },
}, { timestamps: true });

StudentSchema.index({ department: 1 });
StudentSchema.index({ userId: 1 });

module.exports = mongoose.model('Student', StudentSchema);