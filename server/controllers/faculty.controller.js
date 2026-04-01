const User    = require('../models/User');
const Faculty = require('../models/Faculty');

// @GET /api/faculty/me — Faculty gets their own profile + assigned courses
const getMyProfile = async (req, res) => {
  try {
    const faculty = await Faculty.findOne({ userId: req.user._id })
      .populate('userId', 'name email')
      .populate('assignedCourses', 'name code department semester');
    if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });
    res.json(faculty);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @GET /api/faculty
const getAllFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find()
      .populate('userId', 'name email')
      .populate('assignedCourses', 'name code')
      .lean();
    res.json(faculty);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @GET /api/faculty/:id
const getFacultyById = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('assignedCourses', 'name code department');
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
    res.json(faculty);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @POST /api/faculty — Creates User account + Faculty profile together
const createFaculty = async (req, res) => {
  try {
    const { name, email, password, department, designation } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: 'Email already registered' });

    const user    = await User.create({ name, email, password, role: 'faculty' });
    const faculty = await Faculty.create({
      userId: user._id, department,
      designation: designation || 'Assistant Professor',
    });

    res.status(201).json({ ...faculty.toObject(), name: user.name, email: user.email });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @PUT /api/faculty/:id
const updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
    res.json(faculty);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @DELETE /api/faculty/:id
const deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
    await User.findByIdAndDelete(faculty.userId);
    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ message: 'Faculty deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @PUT /api/faculty/:id/assign-course
const assignCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
    if (faculty.assignedCourses.includes(courseId))
      return res.status(400).json({ message: 'Course already assigned' });
    faculty.assignedCourses.push(courseId);
    await faculty.save();
    res.json(faculty);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getMyProfile, getAllFaculty, getFacultyById, createFaculty, updateFaculty, deleteFaculty, assignCourse };