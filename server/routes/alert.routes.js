const express = require('express');
const router  = express.Router();
const { getAlerts, markAsRead, markAllRead } = require('../controllers/alert.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',              getAlerts);
router.put('/read-all',      markAllRead);
router.put('/:id/read',      markAsRead);

module.exports = router;
