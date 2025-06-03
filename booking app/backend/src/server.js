require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/auth');
const routes = require('./routes'); // This already includes movie and booking routes

const app = express();
const server = http.createServer(app);

// CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Socket.io setup with proper CORS configuration
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Make io accessible in routes
app.set('io', io);

// Store socket connections per showtime
const showtimeConnections = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinShowtime', (showtimeId) => {
    socket.join(`showtime_${showtimeId}`);
    console.log(`Client ${socket.id} joined showtime ${showtimeId}`);
  });

  socket.on('lockSeat', async ({ showtimeId, seatId, userId }) => {
    try {
      const seat = await prisma.seat.update({
        where: { id: seatId },
        data: {
          isLocked: true,
          lockedUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes lock
        },
      });

      io.to(`showtime_${showtimeId}`).emit('seatLocked', { seatId, userId });
    } catch (error) {
      console.error('Error locking seat:', error);
    }
  });

  socket.on('unlockSeat', async ({ showtimeId, seatId }) => {
    try {
      const seat = await prisma.seat.update({
        where: { id: seatId },
        data: {
          isLocked: false,
          lockedUntil: null,
        },
      });

      io.to(`showtime_${showtimeId}`).emit('seatUnlocked', { seatId });
    } catch (error) {
      console.error('Error unlocking seat:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', routes); // This already includes /movies and /bookings

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});