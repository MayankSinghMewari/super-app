const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllMovies = async (req, res, next) => {
  console.log("GET /api/movies called");
  try {
    const movies = await prisma.movie.findMany({
      include: {
        showtimes: {
          orderBy: {
            time: 'asc',
          },
          include: {
            _count: {
              select: {
                seats: {
                  where: {
                    isBooked: false
                  }
                }
              }
            }
          }
        },
      },
    });

    console.log("Movies found:", movies.length);
    res.json(movies);
  } catch (error) {
    console.error("Error in getAllMovies:", error);
    next(error);
  }
};

exports.getMovieById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`GET /api/movies/${id} called`);
    
    // Parse id as integer and validate
    const movieId = parseInt(id);
    if (isNaN(movieId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid movie ID format' 
      });
    }

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        showtimes: {
          orderBy: {
            time: 'asc',
          },
          include: {
            _count: {
              select: {
                seats: true,
                bookings: true
              }
            },
            seats: {
              select: {
                id: true,
                row: true,
                column: true,
                seatNumber: true,
                isBooked: true,
                isLocked: true,
                lockedUntil: true
              },
              orderBy: [
                { row: 'asc' },
                { column: 'asc' }
              ]
            }
          }
        },
      },
    });

    if (!movie) {
      console.log(`Movie with ID ${movieId} not found`);
      return res.status(404).json({ 
        success: false,
        message: 'Movie not found' 
      });
    }

    console.log(`Movie found: ${movie.title} with ${movie.showtimes.length} showtimes`);
    res.json(movie);
  } catch (error) {
    console.error("Error in getMovieById:", error);
    next(error);
  }
};

exports.deleteMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    const movieId = parseInt(id);
    
    if (isNaN(movieId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid movie ID format' 
      });
    }

    // First check if the movie exists
    const existingMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: { showtimes: true }
    });

    if (!existingMovie) {
      return res.status(404).json({ 
        success: false, 
        message: 'Movie not found' 
      });
    }

    // Use a transaction to delete related records first
    const deleted = await prisma.$transaction(async (tx) => {
      // For each showtime, delete related bookings and seats
      for (const showtime of existingMovie.showtimes) {
        // Delete booking seats
        await tx.bookingSeat.deleteMany({
          where: {
            seat: {
              showtimeId: showtime.id
            }
          }
        });

        // Delete bookings
        await tx.booking.deleteMany({
          where: { showtimeId: showtime.id }
        });

        // Delete seats
        await tx.seat.deleteMany({
          where: { showtimeId: showtime.id }
        });
      }

      // Delete showtimes
      await tx.showtime.deleteMany({
        where: { movieId }
      });

      // Finally delete the movie
      return tx.movie.delete({
        where: { id: movieId }
      });
    });

    res.json({ success: true, data: deleted });
  } catch (error) {
    console.error("Error in deleteMovie:", error);
    next(error);
  }
};

exports.updateMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    const movieId = parseInt(id);
    
    if (isNaN(movieId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid movie ID format' 
      });
    }
    
    const { title, description, duration, rating, genre, imageUrl } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }
    
    const updated = await prisma.movie.update({
      where: { id: movieId },
      data: { 
        title,
        description: description || undefined,
        duration: duration ? parseInt(duration) : undefined,
        rating: rating || undefined,
        genre: genre || undefined,
        imageUrl: imageUrl || undefined
      },
    });
    
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error in updateMovie:", error);
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false, 
        message: 'Movie not found' 
      });
    }
    next(error);
  }
};

exports.createMovie = async (req, res, next) => {
  try {
    const { title, description, duration, rating, genre, imageUrl } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Validate duration
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be a positive number'
      });
    }

    const movie = await prisma.movie.create({
      data: {
        title,
        description,
        duration: durationNum,
        rating: rating || null,
        genre: genre || null,
        imageUrl: imageUrl || null,
      },
    });

    res.status(201).json({ success: true, data: movie });
  } catch (error) {
    console.error("Error in createMovie:", error);
    next(error);
  }
};

exports.addShowtime = async (req, res, next) => {
  try {
    const { movieId } = req.params;
    const movieIdNum = parseInt(movieId);
    
    if (isNaN(movieIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid movie ID format'
      });
    }
    
    const { time, screen } = req.body;
    
    if (!time) {
      return res.status(400).json({
        success: false,
        message: 'Time is required'
      });
    }
    
    // Validate showtime date format
    const showtimeDate = new Date(time);
    if (isNaN(showtimeDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for showtime'
      });
    }

    // Validate movie exists
    const movie = await prisma.movie.findUnique({
      where: { id: movieIdNum },
    });

    if (!movie) {
      return res.status(404).json({ 
        success: false,
        message: 'Movie not found' 
      });
    }

    // Create the showtime
    const showtime = await prisma.showtime.create({
      data: {
        movieId: movieIdNum,
        time: showtimeDate,
        screen: screen || '1', // Default to screen 1 if not specified
      },
    });

    // Create seats for this showtime
    const seats = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const columns = 10;

    for (let row of rows) {
      for (let col = 1; col <= columns; col++) {
        seats.push({
          showtimeId: showtime.id,
          seatNumber: `${row}${col}`,
          row,
          column: col,
          isBooked: false,
          isLocked: false
        });
      }
    }

    await prisma.seat.createMany({
      data: seats,
    });

    // Return the showtime with seats
    const showtimeWithSeats = await prisma.showtime.findUnique({
      where: { id: showtime.id },
      include: {
        seats: {
          orderBy: [
            { row: 'asc' },
            { column: 'asc' }
          ]
        },
        movie: true
      }
    });

    res.status(201).json({ 
      success: true, 
      data: showtimeWithSeats
    });
  } catch (error) {
    console.error("Error in addShowtime:", error);
    next(error);
  }
};