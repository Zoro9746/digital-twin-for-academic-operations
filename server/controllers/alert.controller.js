const Alert = require('../models/Alert');

// @GET /api/alerts  — returns alerts for the logged-in user
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @PUT /api/alerts/:id/read
const markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @PUT /api/alerts/read-all
const markAllRead = async (req, res) => {
  try {
    await Alert.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All alerts marked as read' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAlerts, markAsRead, markAllRead };
