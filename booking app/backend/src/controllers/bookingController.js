const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.getShowtimeDetails = async (req, res, next) => {
  try {
    const { showtimeId } = req.params;
    const showtimeIdNum = parseInt(showtimeId);
    
    if (isNaN(showtimeIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid showtime ID format'
      });
    }

    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeIdNum },
      include: {
        movie: true,
        seats: {
          orderBy: [
            { row: 'asc' },
            { column: 'asc' },
          ],
        },
      },
    });

    if (!showtime) {
      return res.status(404).json({
        success: false,
        message: 'Showtime not found'
      });
    }

    // Process seats to add availability status
    const now = new Date();
    const seats = showtime.seats.map(seat => {
      return {
        ...seat,
        isAvailable: !seat.isBooked && (!seat.isLocked || (seat.lockedUntil && seat.lockedUntil < now))
      };
    });

    const result = {
      ...showtime,
      seats
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error in getShowtimeDetails:", error);
    next(error);
  }
};

exports.lockSeats = async (req, res, next) => {
  try {
    const { showtimeId, seatIds } = req.body;
    const userId = req.userId;

    if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: showtimeId and seatIds array are required'
      });
    }

    // Use transaction to ensure all seats are locked or none
    const lockedSeats = await prisma.$transaction(async (prisma) => {
      const now = new Date();
      
      // First check if all seats exist and are available
      const seats = await prisma.seat.findMany({
        where: { 
          id: { in: seatIds },
          showtimeId: parseInt(showtimeId)
        },
      });

      if (seats.length !== seatIds.length) {
        throw new Error('One or more seats not found');
      }

      // Check if any seat is booked or locked
      const unavailableSeats = seats.filter(
        seat => seat.isBooked || (seat.isLocked && seat.lockedUntil > now)
      );

      if (unavailableSeats.length > 0) {
        throw new Error(`Seats ${unavailableSeats.map(s => s.seatNumber).join(', ')} are not available`);
      }

      // Lock all seats
      return Promise.all(
        seatIds.map(seatId => 
          prisma.seat.update({
            where: { id: seatId },
            data: {
              isLocked: true,
              lockedUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes lock
            },
          })
        )
      );
    }).catch(error => {
      throw new Error(`Failed to lock seats: ${error.message}`);
    });

    // Emit event to all clients watching this showtime
    const io = req.app.get('io');
    if (io) {
      io.to(`showtime_${showtimeId}`).emit('seatsLocked', { seatIds, userId });
    }

    res.json({ 
      success: true, 
      data: lockedSeats 
    });
  } catch (error) {
    console.error("Error in lockSeats:", error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const { showtimeId, seatIds, pricePerSeat } = req.body;

    // 1. Validate basic input
    if (
      !userId ||
      !showtimeId ||
      !Array.isArray(seatIds) ||
      seatIds.length === 0 ||
      typeof pricePerSeat !== 'number' ||
      pricePerSeat <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid booking data. Required: showtimeId, seatIds(array), pricePerSeat(positive number).'
      });
    }

    // 2. Check showtime exists
    const showtime = await prisma.showtime.findUnique({
      where: { id: parseInt(showtimeId) },
      include: { movie: true }
    });
    
    if (!showtime) {
      return res.status(404).json({ 
        success: false, 
        message: 'Showtime not found.' 
      });
    }

    // 3. Load seats and verify they belong to this showtime
    const seats = await prisma.seat.findMany({
      where: {
        id: { in: seatIds },
        showtimeId: parseInt(showtimeId)
      }
    });
    
    if (seats.length !== seatIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more seatIds are invalid for this showtime.'
      });
    }

    // 4. Check availability (not already booked or locked by someone else)
    const now = new Date();
    const conflict = seats.filter(s =>
      s.isBooked || (s.isLocked && s.lockedUntil > now)
    );
    
    if (conflict.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Some seats are already unavailable.',
        seats: conflict.map(s => s.seatNumber)
      });
    }

    // 5. Calculate total price
    const totalPrice = seatIds.length * pricePerSeat;

    // 6. Atomically book seats and create booking + bookingSeat records
    const booking = await prisma.$transaction(async tx => {
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          showtimeId: parseInt(showtimeId),
          totalPrice
        }
      });

      // Create BookingSeat entries
      await tx.bookingSeat.createMany({
        data: seatIds.map(id => ({
          bookingId: newBooking.id,
          seatId: id,
          price: pricePerSeat
        }))
      });

      // Mark seats as booked
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { isBooked: true, isLocked: false, lockedUntil: null }
      });

      // Return enriched booking info
      return tx.booking.findUnique({
        where: { id: newBooking.id },
        include: {
          bookingSeats: {
            include: { seat: true }
          },
          showtime: { include: { movie: true } },
          user: {
            select: {
              id: true,
              email: true
            }
          }
        }
      });
    });

    // 7. Emit a socket event to notify other users
    const io = req.app.get('io');
    if (io) {
      io.to(`showtime_${showtimeId}`).emit('seatsBooked', {
        seatIds,
        showtime: { id: showtime.id, time: showtime.time }
      });
    }

    return res.status(201).json({ 
      success: true, 
      data: booking 
    });

  } catch (error) {
    console.error('❌ createBooking error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error.' 
    });
  }
};
exports.unlockSeats = async (req, res, next) => {
  try {
    const { showtimeId, seatIds } = req.body;
    const userId = req.userId;

    if (!showtimeId || !Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: showtimeId and seatIds array are required'
      });
    }

    // Use transaction to ensure all seats are unlocked
    const unlockedSeats = await prisma.$transaction(async (prisma) => {
      // Unlock all seats
      return Promise.all(
        seatIds.map(seatId => 
          prisma.seat.update({
            where: { id: seatId },
            data: {
              isLocked: false,
              lockedUntil: null,
            },
          })
        )
      );
    }).catch(error => {
      throw new Error(`Failed to unlock seats: ${error.message}`);
    });

    // Emit event to all clients watching this showtime
    const io = req.app.get('io');
    if (io) {
      seatIds.forEach(seatId => {
        io.to(`showtime_${showtimeId}`).emit('seatUnlocked', { 
          seatId, 
          showtimeId
        });
      });
    }

    res.json({ 
      success: true, 
      data: unlockedSeats 
    });
  } catch (error) {
    console.error("Error in unlockSeats:", error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};
exports.confirmBooking = async (req, res, next) => {
  try {
    const { bookingId, paymentId } = req.body;
    const userId = req.userId;

    if (!bookingId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID and payment ID are required'
      });
    }

    const bookingIdNum = parseInt(bookingId);
    if (isNaN(bookingIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    // Verify the booking exists and belongs to the user
    const existingBooking = await prisma.booking.findUnique({
      where: { id: bookingIdNum }
    });

    if (!existingBooking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (existingBooking.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to confirm this booking'
      });
    }

    if (existingBooking.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid'
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingIdNum },
      data: {
        isPaid: true,
        paymentId
      },
      include: {
        bookingSeats: {
          include: { seat: true }
        },
        showtime: {
          include: { movie: true }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    // Emit event to all clients watching this showtime
    const io = req.app.get('io');
    if (io) {
      io.to(`showtime_${updatedBooking.showtimeId}`).emit('bookingConfirmed', {
        bookingId: updatedBooking.id,
        seatIds: updatedBooking.bookingSeats.map(bs => bs.seat.id)
      });
    }

    res.json({ 
      success: true, 
      data: updatedBooking 
    });
  } catch (error) {
    console.error("Error in confirmBooking:", error);
    next(error);
  }
};

exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not provided'
      });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        bookingSeats: {
          include: { seat: true }
        },
        showtime: {
          include: {
            movie: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error("Error in getUserBookings:", error);
    next(error);
  }
};