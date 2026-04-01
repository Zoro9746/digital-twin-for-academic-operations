const mongoose = require('mongoose');

const MarksSchema = new mongoose.Schema({
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true },
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  examType:   { type: String, enum: ['Internal 1', 'Internal 2', 'Model', 'Semester'], required: true },
  score:      { type: Number, required: true, min: 0 },
  maxScore:   { type: Number, required: true, min: 1 },
  percentage: { type: Number },
}, { timestamps: true });

MarksSchema.index({ courseId: 1, studentId: 1, examType: 1 }, { unique: true });
MarksSchema.index({ studentId: 1 });
MarksSchema.index({ courseId: 1 });
MarksSchema.index({ courseId: 1, examType: 1 });
MarksSchema.index({ studentId: 1, examType: 1 });

MarksSchema.pre('save', function (next) {
  this.percentage = Math.round((this.score / this.maxScore) * 100);
  next();
});

module.exports = mongoose.model('Marks', MarksSchema);