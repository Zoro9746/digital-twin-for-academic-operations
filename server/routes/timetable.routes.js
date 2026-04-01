const express = require('express');
const router  = express.Router();
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/timetable.controller');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate.middleware');

router.use(protect);

router.get('/',       authorizeRoles('admin', 'faculty'), ctrl.getAll);
router.get('/faculty/:facultyId', authorizeRoles('admin', 'faculty'), ctrl.getByFaculty);
router.get('/student/:studentId', authorizeRoles('admin', 'faculty', 'student'), ctrl.getStudentTimetable);
router.get('/today',  authorizeRoles('faculty'),          ctrl.getToday);
router.post(
  '/',
  authorizeRoles('admin'),
  [
    body('courseId').isMongoId(),
    body('facultyId').isMongoId(),
    body('dayOfWeek').isInt({ min: 1, max: 5 }),
    body('startTime').notEmpty().isString(),
    body('endTime').notEmpty().isString(),
    body('room').optional().isString(),
    body('semester').optional().isInt({ min: 1, max: 8 }),
  ],
  validateRequest,
  ctrl.create
);
router.put(
  '/:id',
  authorizeRoles('admin'),
  [
    body('courseId').optional().isMongoId(),
    body('facultyId').optional().isMongoId(),
    body('dayOfWeek').optional().isInt({ min: 1, max: 5 }),
    body('startTime').optional().isString(),
    body('endTime').optional().isString(),
    body('room').optional().isString(),
    body('semester').optional().isInt({ min: 1, max: 8 }),
  ],
  validateRequest,
  ctrl.update
);
router.delete('/:id', authorizeRoles('admin'),            ctrl.remove);

module.exports = router;
