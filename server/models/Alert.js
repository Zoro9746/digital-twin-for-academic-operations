const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: ['LOW_ATTENDANCE', 'LOW_MARKS', 'FACULTY_OVERLOAD'], required: true },
    message: { type: String, required: true },
    isRead:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Speed up alert lists and unread counts for the notification dropdown.
AlertSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
AlertSchema.index({ type: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);
