const AcademicCalendar = require('../models/AcademicCalendar');

// GET /api/calendar
const getAll = async (req, res) => {
  try {
    const entries = await AcademicCalendar.find().sort({ date: 1 });
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/calendar/working-days
const getWorkingDays = async (req, res) => {
  try {
    const DEFAULT_PERIODS = 7;

    // Default: current academic year (Jan 1 of current year → today)
    const now   = new Date();
    const start = new Date(now.getFullYear(), 0, 1);  // Jan 1 current year
    const end   = now;

    const events = await AcademicCalendar.find({ excludeFromAttendance: true });

    // Count Mon–Sat days in range
    let totalWorkingDays = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      if (cursor.getDay() !== 0) totalWorkingDays++;
      cursor.setDate(cursor.getDate() + 1);
    }

    // Calculate excluded periods
    let excludedPeriods = 0;
    const excludedDates = new Set();

    for (const ev of events) {
      const evStart = new Date(ev.date);
      const evEnd   = ev.endDate ? new Date(ev.endDate) : new Date(ev.date);
      const c = new Date(evStart);
      while (c <= evEnd) {
        if (c >= start && c <= end && c.getDay() !== 0) {
          const dateKey = c.toISOString().slice(0, 10);
          if (ev.affectedPeriods?.length > 0) {
            excludedPeriods += ev.affectedPeriods.length;
          } else {
            if (!excludedDates.has(dateKey)) {
              excludedDates.add(dateKey);
              excludedPeriods += ev.periodsPerDay || DEFAULT_PERIODS;
            }
          }
        }
        c.setDate(c.getDate() + 1);
      }
    }

    const totalPeriods     = totalWorkingDays * DEFAULT_PERIODS;
    const remainingPeriods = Math.max(0, totalPeriods - excludedPeriods);

    res.json({ totalWorkingDays, totalPeriods, excludedPeriods, remainingPeriods });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/calendar
const create = async (req, res) => {
  try {
    const entry = await AcademicCalendar.create(req.body);
    res.status(201).json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/calendar/:id
const update = async (req, res) => {
  try {
    const entry = await AcademicCalendar.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/calendar/:id
const remove = async (req, res) => {
  try {
    await AcademicCalendar.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAll, create, update, remove, getWorkingDays };