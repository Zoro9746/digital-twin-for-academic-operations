const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/marks.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate.middleware');
router.use(protect);
router.post(
  '/upload',
  authorizeRoles('faculty'),
  [
    body('courseId').isMongoId(),
    body('studentId').isMongoId(),
    body('examType').isIn(['internal1', 'internal2', 'midterm', 'final']),
    body('score').isNumeric(),
    body('maxScore').isNumeric({ min: 1 }),
  ],
  validateRequest,
  ctrl.uploadMarks
);
router.post(
  '/upload-bulk',
  authorizeRoles('faculty'),
  [
    body('courseId').isMongoId(),
    body('examType').isIn(['internal1', 'internal2', 'midterm', 'final']),
    body('maxScore').isNumeric({ min: 1 }),
    body('records').isArray({ min: 1 }),
    body('records.*.studentId').isMongoId(),
    body('records.*.score').isNumeric(),
  ],
  validateRequest,
  ctrl.uploadBulk
);
router.get('/course/:courseId',  authorizeRoles('admin','faculty'),           ctrl.getCourseMarks);
router.get('/summary/:courseId', authorizeRoles('admin','faculty'),           ctrl.getCourseSummary);
router.get('/student/:studentId',authorizeRoles('admin','student','faculty'), ctrl.getStudentMarks);
module.exports = router;
