const express = require('express');
const router  = express.Router();
const { generateStudentReport } = require('../controllers/report.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/student/:studentId', authorizeRoles('admin','faculty','student'), generateStudentReport);

module.exports = router;
