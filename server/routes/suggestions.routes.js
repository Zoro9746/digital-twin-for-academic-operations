const express = require('express');
const router  = express.Router();
const { getStudentSuggestions } = require('../controllers/suggestions.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/student/:studentId', authorizeRoles('admin', 'faculty', 'student'), getStudentSuggestions);

module.exports = router;
