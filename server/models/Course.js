const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  code:       { type: String, required: true, unique: true, uppercase: true },
  department: { type: String, required: true },
  semester:   { type: Number, required: true, min: 1, max: 8 },
  facultyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
  hasLab:     { type: Boolean, default: false },
  schedule: {
    day:  { type: String, default: '' },
    time: { type: String, default: '' },
    room: { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
