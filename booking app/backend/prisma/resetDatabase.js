const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('Starting database reset process...');

    // Delete all data in reverse order of dependencies
    console.log('Deleting existing data...');
    
    // Delete BookingSeat records first (junction table)
    await prisma.bookingSeat.deleteMany({});
    console.log('✓ All BookingSeat records deleted');
    
    // Delete Booking records
    await prisma.booking.deleteMany({});
    console.log('✓ All Booking records deleted');
    
    // Delete Seat records
    await prisma.seat.deleteMany({});
    console.log('✓ All Seat records deleted');
    
    // Delete Showtime records
    await prisma.showtime.deleteMany({});
    console.log('✓ All Showtime records deleted');
    
    // Delete Movie records
    await prisma.movie.deleteMany({});
    console.log('✓ All Movie records deleted');
    
    // Delete User records
    await prisma.user.deleteMany({});
    console.log('✓ All User records deleted');

    console.log('Database has been completely reset');
    
    // Now seed with new data
    await seedNewData();
    
  } catch (error) {
    console.error('Error during database reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedNewData() {
  try {
    console.log('\nSeeding new data...');

    // Create admin and user accounts
    const adminPassword = await bcrypt.hash('secure_admin_pass', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@movietheatre.com',
        password: adminPassword,
        role: 'ADMIN'
      }
    });
    console.log(`✓ Created admin: ${admin.email}`);

    const userPassword = await bcrypt.hash('customer_pass', 10);
    const regularUser = await prisma.user.create({
      data: {
        email: 'customer@example.com',
        password: userPassword,
        role: 'USER'
      }
    });
    console.log(`✓ Created user: ${regularUser.email}`);

    // Create movies with real data
    const movies = [
      {
        title: 'Dune: Part Two',
        description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        duration: 166,
        rating: 'PG-13',
        genre: 'Sci-Fi, Adventure',
        imageUrl: 'https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcRBu8Gzdygf5OOqBJUIJ3-ZxiPbLh62OhvLmtOvuR7x2gF3DucU'
      },
      {
        title: 'Oppenheimer',
        description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        duration: 180,
        rating: 'R',
        genre: 'Biography, Drama, History',
        imageUrl: 'https://en.wikipedia.org/wiki/Oppenheimer_%28film%29#/media/File:Oppenheimer_(film).jpg'
      },
      {
        title: 'The Holdovers',
        description: 'A cranky history teacher at a remote prep school is forced to remain on campus over the holidays with a troubled student who has no place to go.',
        duration: 133,
        rating: 'R',
        genre: 'Comedy, Drama',
        imageUrl: 'https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcQK3ocviYmCzwaQaj5i_-D0h76nSOcLJBBY7pHQy0_sYC_57P0h'
      },
      {
        title: 'Inside Out 2',
        description: 'Follow Riley as a teenager as new emotions join Joy, Sadness, Anger, Fear and Disgust in her mind.',
        duration: 105,
        rating: 'PG',
        genre: 'Animation, Adventure, Comedy',
        imageUrl: 'https://via.placeholder.com/300x450?text=Inside+Out+2'
      },
      {
        title: 'A Quiet Place: Day One',
        description: 'Experience the day the world went quiet in this prequel to the horror franchise.',
        duration: 99,
        rating: 'PG-13',
        genre: 'Horror, Sci-Fi, Thriller',
        imageUrl: 'https://via.placeholder.com/300x450?text=A+Quiet+Place+Day+One'
      }
    ];

    // Create all movies
    for (const movieData of movies) {
      const movie = await prisma.movie.create({
        data: movieData
      });
      console.log(`✓ Created movie: ${movie.title}`);

      // Create realistic showtimes for this movie
      const today = new Date();
      
      // Create showtimes for the next 7 days
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(today.getDate() + day);
        
        // Different movies have different showtime patterns
        let dailyShowtimes = [];
        
        // Blockbusters get more showtimes
        if (movie.title === 'Dune: Part Two' || movie.title === 'Inside Out 2') {
          dailyShowtimes = [
            new Date(new Date(date).setHours(10, 30, 0, 0)),
            new Date(new Date(date).setHours(13, 45, 0, 0)),
            new Date(new Date(date).setHours(16, 30, 0, 0)),
            new Date(new Date(date).setHours(19, 15, 0, 0)),
            new Date(new Date(date).setHours(22, 0, 0, 0))
          ];
        } 
        // R-rated movies get evening slots
        else if (movie.title === 'Oppenheimer') {
          dailyShowtimes = [
            new Date(new Date(date).setHours(14, 0, 0, 0)),
            new Date(new Date(date).setHours(18, 0, 0, 0)),
            new Date(new Date(date).setHours(21, 30, 0, 0))
          ];
        }
        // Other movies get standard treatment
        else {
          dailyShowtimes = [
            new Date(new Date(date).setHours(12, 15, 0, 0)),
            new Date(new Date(date).setHours(15, 45, 0, 0)),
            new Date(new Date(date).setHours(20, 0, 0, 0))
          ];
        }

        // Assign different screens based on movie popularity
        let screenNumber;
        if (movie.title === 'Dune: Part Two') screenNumber = 1;
        else if (movie.title === 'Inside Out 2') screenNumber = 2;
        else screenNumber = Math.floor(Math.random() * 3) + 3; // Screens 3-5

        for (const showtimeDate of dailyShowtimes) {
          const showtime = await prisma.showtime.create({
            data: {
              movieId: movie.id,
              time: showtimeDate,
              screen: `Screen ${screenNumber}`
            }
          });
          console.log(`✓ Created showtime for ${movie.title} at ${showtime.time.toLocaleString()}`);

          // Create seats for this showtime
          // Different screens have different layouts
          let rows, columns;
          
          switch(screenNumber) {
            case 1: // Premium large screen
              rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
              columns = 15;
              break;
            case 2: // Medium screen
              rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
              columns = 12;
              break;
            default: // Smaller screens
              rows = ['A', 'B', 'C', 'D', 'E', 'F'];
              columns = 10;
          }

          // Create all seats
          const seats = [];
          for (let row of rows) {
            for (let col = 1; col <= columns; col++) {
              seats.push({
                showtimeId: showtime.id,
                seatNumber: `${row}${col < 10 ? '0' + col : col}`,
                row,
                column: col,
                isBooked: false,
                isLocked: false
              });
            }
          }

          await prisma.seat.createMany({
            data: seats
          });
          console.log(`✓ Created ${seats.length} seats for showtime ID: ${showtime.id}`);
          
          // For some past showtimes, create sample bookings
          if (showtimeDate < new Date()) {
            // Create some random bookings (about 30% of seats)
            const seatRecords = await prisma.seat.findMany({
              where: { showtimeId: showtime.id }
            });
            
            // Select ~30% of seats randomly
            const bookedSeats = seatRecords
              .sort(() => 0.5 - Math.random())
              .slice(0, Math.floor(seatRecords.length * 0.3));
            
            if (bookedSeats.length > 0) {
              // Create a booking
              const booking = await prisma.booking.create({
                data: {
                  userId: Math.random() > 0.5 ? admin.id : regularUser.id,
                  showtimeId: showtime.id,
                  isPaid: true,
                  paymentId: `PAYMENT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                  totalPrice: bookedSeats.length * 12.99
                }
              });
              
              // Link seats to the booking
              for (const seat of bookedSeats) {
                await prisma.bookingSeat.create({
                  data: {
                    bookingId: booking.id,
                    seatId: seat.id,
                    price: 12.99
                  }
                });
                
                // Mark seat as booked
                await prisma.seat.update({
                  where: { id: seat.id },
                  data: { isBooked: true }
                });
              }
              
              console.log(`✓ Created sample booking with ${bookedSeats.length} seats for showtime ID: ${showtime.id}`);
            }
          }
        }
      }
    }

    console.log('\nDatabase reset and seeding completed successfully!');
  } catch (error) {
    console.error('Error during data seeding:', error);
    throw error;
  }
}

// Run the reset and seed process
resetDatabase();