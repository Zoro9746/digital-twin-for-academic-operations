const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  department:      { type: String, required: true },
  designation:     { type: String, default: 'Assistant Professor' },
  assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
}, { timestamps: true });

module.exports = mongoose.model('Faculty', FacultySchema);
