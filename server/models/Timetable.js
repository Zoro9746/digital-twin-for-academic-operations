const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  dayOfWeek: { type: Number, min: 1, max: 5, required: true }, // 1=Mon … 5=Fri
  startTime: { type: String, required: true },  // "09:00"
  endTime:   { type: String, required: true },  // "10:00"
  room:      { type: String, default: '' },
  semester:  { type: Number },
}, { timestamps: true });

timetableSchema.index({ courseId: 1, dayOfWeek: 1, startTime: 1 });
timetableSchema.index({ facultyId: 1, dayOfWeek: 1, startTime: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
