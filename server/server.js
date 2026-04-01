const dotenv     = require('dotenv');
const http       = require('http');
const { Server } = require('socket.io');
const cron       = require('node-cron');
const connectDB  = require('./config/db');
const jwt        = require('jsonwebtoken');
const User       = require('./models/User');
const fs         = require('fs');
const path       = require('path');

dotenv.config();
connectDB();

// Cleaned logs

const app = require('./app');
const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: process.env.CLIENT_URL,
    methods: ['GET','POST'],
    credentials: true
  },
});
app.set('io', io);

// Authenticate Socket.io connections using JWT from the handshake.
// This prevents clients from joining arbitrary `user:<id>` rooms.
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.query?.token ||
      socket.handshake?.headers?.authorization?.split(' ')[1];

    if (!token) return next(new Error('Unauthorized'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id');
    if (!user) return next(new Error('Unauthorized'));

    socket.userId = user._id.toString();
    socket.join(`user:${socket.userId}`);
    return next();
  } catch {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id} (user:${socket.userId})`);

  // Backwards compatibility: only allow joining if the client-provided id matches the authenticated socket.
  socket.on('join', (userId) => {
    if (!socket.userId) return;
    if (userId?.toString() !== socket.userId) return;
    socket.join(`user:${socket.userId}`);
  });

  socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
});

cron.schedule('0 * * * *', async () => {
  try {
    const Attendance = require('./models/Attendance');
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const result = await Attendance.updateMany(
      { isLocked: false, createdAt: { $lt: cutoff } },
      { isLocked: true, lockedAt: new Date() }
    );
    if (result.modifiedCount > 0) console.log(`🔒 Auto-locked ${result.modifiedCount} records`);
  } catch (err) { console.error('Cron error:', err.message); }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
