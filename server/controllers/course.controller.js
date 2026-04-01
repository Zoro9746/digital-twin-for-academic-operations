const Course  = require('../models/Course');
const Faculty = require('../models/Faculty');

const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name' } });
    res.json(courses);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({ path: 'facultyId', populate: { path: 'userId', select: 'name email' } });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createCourse = async (req, res) => {
  try {
    const course = await Course.create(req.body);
    if (req.body.facultyId) {
      await Faculty.findByIdAndUpdate(req.body.facultyId, { $addToSet: { assignedCourses: course._id } });
    }
    res.status(201).json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.facultyId)
      await Faculty.findByIdAndUpdate(course.facultyId, { $pull: { assignedCourses: course._id } });
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse };
