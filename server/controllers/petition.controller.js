const path     = require('path');
const fs       = require('fs');
const Petition = require('../models/Petition');
const Student  = require('../models/Student');
const Attendance = require('../models/Attendance');
const Faculty   = require('../models/Faculty');

// POST /api/petitions  — student submits petition (with optional file)
const createPetition = async (req, res) => {
  try {
    const { courseId, type, reason, fromDate, toDate } = req.body;
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const petitionData = { studentId: student._id, courseId, type, reason, fromDate, toDate };

    // Attach document info if a file was uploaded
    if (req.file) {
      petitionData.document = {
        filename:     req.file.filename,
        originalName: req.file.originalname,
        mimetype:     req.file.mimetype,
        size:         req.file.size,
      };
    }

    const petition = await Petition.create(petitionData);
    res.status(201).json(petition);
  } catch (err) {
    // Clean up uploaded file if petition creation failed
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/petitions/my  — student sees their own petitions
const getMyPetitions = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    const petitions = await Petition.find({ studentId: student._id })
      .populate('courseId', 'name code')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(petitions);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/petitions/faculty  — faculty sees petitions for their courses
const getFacultyPetitions = async (req, res) => {
  try {
    const Faculty = require('../models/Faculty');
    const faculty = await Faculty.findOne({ userId: req.user._id });
    if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });
    const petitions = await Petition.find({ courseId: { $in: faculty.assignedCourses } })
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
      .populate('courseId', 'name code')
      .sort({ createdAt: -1 });
    res.json(petitions);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/petitions  — admin sees all
const getAllPetitions = async (req, res) => {
  try {
    const petitions = await Petition.find()
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
      .populate('courseId', 'name code')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(petitions);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/petitions/:id/review  — faculty/admin approves or rejects
const reviewPetition = async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Status must be approved or rejected' });

    const petition = await Petition.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote: reviewNote || '', reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    ).populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
     .populate('courseId', 'name code');

    if (!petition) return res.status(404).json({ message: 'Petition not found' });

    // If approved — exclude attendance records in the date range
    if (status === 'approved') {
      const from = new Date(petition.fromDate);
      const to   = new Date(petition.toDate);
      const dates = [];
      const cur   = new Date(from);
      while (cur <= to) { dates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
      await Attendance.updateMany(
        { studentId: petition.studentId._id, courseId: petition.courseId._id, date: { $in: dates } },
        { excludeFromCalc: true }
      );
    }
    res.json({ message: `Petition ${status}`, petition });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/petitions/:id/document  — download/view the uploaded document
const getDocument = async (req, res) => {
  try {
    const petition = await Petition.findById(req.params.id)
      .populate({ path: 'studentId', select: 'userId' });
    if (!petition)                    return res.status(404).json({ message: 'Petition not found' });
    if (!petition.document?.filename) return res.status(404).json({ message: 'No document attached' });

    // Prevent IDOR: enforce ownership/assignment for document downloads.
    if (req.user?.role === 'student') {
      const petitionOwnerUserId = petition.studentId?.userId?._id?.toString();
      if (!petitionOwnerUserId || petitionOwnerUserId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    if (req.user?.role === 'faculty') {
      const faculty = await Faculty.findOne({ userId: req.user._id }).select('assignedCourses');
      if (!faculty) return res.status(403).json({ message: 'Forbidden' });

      const allowed = new Set((faculty.assignedCourses || []).map(String));
      if (!allowed.has(petition.courseId?.toString())) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const filePath = path.join(__dirname, '..', 'uploads', petition.document.filename);
    if (!fs.existsSync(filePath))     return res.status(404).json({ message: 'File not found on server' });

    // Inline for images, attachment for PDFs
    const disposition = petition.document.mimetype === 'application/pdf' ? 'inline' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${petition.document.originalName}"`);
    res.setHeader('Content-Type', petition.document.mimetype);
    res.sendFile(filePath);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { createPetition, getMyPetitions, getFacultyPetitions, getAllPetitions, reviewPetition, getDocument };
