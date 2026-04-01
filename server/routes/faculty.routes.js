const express = require('express');
const router  = express.Router();
const {
  getAllFaculty, getFacultyById, createFaculty,
  updateFaculty, deleteFaculty, assignCourse, getMyProfile
} = require('../controllers/faculty.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.use(protect);

// Faculty can get their own profile — must be before /:id
router.get('/me',                 authorizeRoles('faculty'),          getMyProfile);

router.get('/',                   authorizeRoles('admin'),            getAllFaculty);
router.post('/',                  authorizeRoles('admin'),            createFaculty);
router.get('/:id',                authorizeRoles('admin', 'faculty'), getFacultyById);
router.put('/:id',                authorizeRoles('admin'),            updateFaculty);
router.delete('/:id',             authorizeRoles('admin'),            deleteFaculty);
router.put('/:id/assign-course',  authorizeRoles('admin'),            assignCourse);

module.exports = router;
