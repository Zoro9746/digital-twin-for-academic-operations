const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const helmet   = require('helmet');
const morgan   = require('morgan');

const app = express();

// In tests we might not create a socket.io instance.
app.set('io', null);

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Agent telemetry removed for production

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/students',    require('./routes/student.routes'));
app.use('/api/faculty',     require('./routes/faculty.routes'));
app.use('/api/courses',     require('./routes/course.routes'));
app.use('/api/attendance',  require('./routes/attendance.routes'));
app.use('/api/alerts',      require('./routes/alert.routes'));
app.use('/api/calendar',    require('./routes/calendar.routes'));
app.use('/api/marks',       require('./routes/marks.routes'));
app.use('/api/analytics',   require('./routes/analytics.routes'));
app.use('/api/petitions',   require('./routes/petition.routes'));
app.use('/api/reports',     require('./routes/report.routes'));
app.use('/api/timetable',   require('./routes/timetable.routes'));
app.use('/api/suggestions', require('./routes/suggestions.routes'));

app.get('/', (req, res) => res.json({ message: '✅ Digital Twin API running' }));

app.use((err, req, res, next) => {
  console.error(`❌ [${new Date().toISOString()}] ${err.message}`);
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File too large. Max 5MB.' });
    return res.status(400).json({ message: err.message });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    errors: err.errors,
  });
});

module.exports = app;

