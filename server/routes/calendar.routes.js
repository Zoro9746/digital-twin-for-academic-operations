const express = require('express');
const router  = express.Router();
const { getAll, create, update, remove, getWorkingDays } = require('../controllers/calendar.controller');
const { protect, authorizeRoles } = require('../middleware/auth.middleware');

router.use(protect);

// working-days must be before /:id to avoid conflict
router.get('/working-days', getWorkingDays);

router.get('/',       getAll);
router.post('/',      authorizeRoles('admin'), create);
router.put('/:id',    authorizeRoles('admin'), update);
router.delete('/:id', authorizeRoles('admin'), remove);

module.exports = router;
