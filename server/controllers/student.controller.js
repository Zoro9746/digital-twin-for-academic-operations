const User    = require('../models/User');
const Student = require('../models/Student');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllStudents = async (req, res) => {
  try {
    const { dept, courseId, page = 1, limit = 60 } = req.query;
    const deptNorm = typeof dept === 'string' ? dept.trim() : '';
    const filter = {};

    if (deptNorm && deptNorm.toLowerCase() !== 'all') {
      filter.department = { $regex: `^${escapeRegex(deptNorm)}$`, $options: 'i' };
    }

    // Allow server-side filtering by enrolled course to avoid client-side pagination bugs.
    if (courseId) {
      filter.enrolledCourses = courseId;
    }
    const skip   = (Number(page) - 1) * Number(limit);

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('userId', 'name email')
        .populate('enrolledCourses', 'name code')
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Student.countDocuments(filter),
    ]);

    res.json({ students, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('enrolledCourses', 'name code department semester');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
      .populate('userId', 'name email')
      .populate('enrolledCourses', 'name code department semester')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createStudent = async (req, res) => {
  try {
    const { name, email, password, rollNo, department, semester, parentEmail, parentPhone, regulation } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already registered' });
    if (await Student.findOne({ rollNo }))
      return res.status(400).json({ message: 'Roll number already exists' });
    const user    = await User.create({ name, email, password, role: 'student' });
    const student = await Student.create({
      userId: user._id, rollNo, department, semester,
      parentEmail: parentEmail || '', parentPhone: parentPhone || '', regulation: regulation || 'R2021',
    });
    res.status(201).json({ ...student.toObject(), name: user.name, email: user.email });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateStudent = async (req, res) => {
  try {
    const { name, email, password, ...studentBody } = req.body;
    
    const student = await Student.findByIdAndUpdate(req.params.id, studentBody, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Ensure the underlying User model is updated if name, email or password changed
    const userUpdates = {};
    if (name) userUpdates.name = name;
    if (email) userUpdates.email = email;
    if (password) userUpdates.password = password; // Assuming presave hook hashes this
    
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(student.userId, userUpdates, { runValidators: true });
    }

    res.json(student);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    await User.findByIdAndDelete(student.userId);
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.enrolledCourses.map(c => c.toString()).includes(courseId))
      return res.status(400).json({ message: 'Already enrolled' });
    student.enrolledCourses.push(courseId);
    await student.save();
    res.json(student);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAllStudents, getStudentById, getMyProfile, createStudent, updateStudent, deleteStudent, enrollCourse };