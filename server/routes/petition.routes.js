const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/petition.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');
const upload   = require('../middleware/upload.middleware');
const { body } = require('express-validator');
const { validateRequest } = require('../middleware/validate.middleware');

router.use(protect);

// Student routes
router.post(
  '/',
  authorizeRoles('student'),
  upload.single('document'),
  [
    body('courseId').isMongoId(),
    body('type').isIn(['medical', 'od', 'personal', 'other']),
    body('reason').trim().isLength({ min: 3 }),
    body('fromDate').matches(/^\d{4}-\d{2}-\d{2}$/),
    body('toDate').matches(/^\d{4}-\d{2}-\d{2}$/),
  ],
  validateRequest,
  ctrl.createPetition
);
router.get('/my',    authorizeRoles('student'),                            ctrl.getMyPetitions);

// Faculty routes
router.get('/faculty', authorizeRoles('faculty'),           ctrl.getFacultyPetitions);
router.put(
  '/:id/review',
  authorizeRoles('faculty', 'admin'),
  [
    body('status').isIn(['approved', 'rejected']),
    body('reviewNote').optional().isString(),
  ],
  validateRequest,
  ctrl.reviewPetition
);

// Admin routes
router.get('/', authorizeRoles('admin'), ctrl.getAllPetitions);

// Document download — faculty, admin, and the student who owns it
router.get('/:id/document', authorizeRoles('student','faculty','admin'), ctrl.getDocument);

module.exports = router;
