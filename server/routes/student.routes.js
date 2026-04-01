const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/student.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/me',          authorizeRoles('student'),                    ctrl.getMyProfile);
router.get('/',            authorizeRoles('admin', 'faculty'),           ctrl.getAllStudents);  // ← faculty added
router.post('/',           authorizeRoles('admin'),                      ctrl.createStudent);
router.get('/:id',         authorizeRoles('admin', 'student', 'faculty'),ctrl.getStudentById);
router.put('/:id',         authorizeRoles('admin'),                      ctrl.updateStudent);
router.delete('/:id',      authorizeRoles('admin'),                      ctrl.deleteStudent);
router.post('/:id/enroll', authorizeRoles('admin'),                      ctrl.enrollCourse);

module.exports = router;
