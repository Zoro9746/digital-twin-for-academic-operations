const mongoose = require('mongoose');

const PetitionSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course',  required: true },
  type:         { type: String, enum: ['medical', 'od', 'personal', 'other'], required: true },
  reason:       { type: String, required: true },
  fromDate:     { type: String, required: true },
  toDate:       { type: String, required: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewNote:   { type: String, default: '' },
  reviewedAt:   { type: Date,   default: null },

  // ── document upload ───────────────────────────────────────────────────────
  document: {
    filename:     { type: String, default: null }, // stored filename on disk
    originalName: { type: String, default: null }, // original upload name
    mimetype:     { type: String, default: null },
    size:         { type: Number, default: null }, // bytes
  },
}, { timestamps: true });

// Common query patterns
PetitionSchema.index({ studentId: 1, createdAt: -1 });
PetitionSchema.index({ courseId: 1, createdAt: -1 });
PetitionSchema.index({ courseId: 1, status: 1, createdAt: -1 });
PetitionSchema.index({ status: 1, reviewedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Petition', PetitionSchema);
