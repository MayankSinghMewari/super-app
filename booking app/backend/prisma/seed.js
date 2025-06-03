const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting seed process...');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@cinema.com' },
      update: {},
      create: {
        email: 'admin@cinema.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log(`Created admin user: ${admin.email}`);

    // Create test user
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        password: userPassword,
        role: 'USER'
      }
    });
    console.log(`Created test user: ${user.email}`);

    // Create movies
    const movies = [
      {
        title: 'The Dark Knight',
        description: 'Batman fights against the Joker, a criminal mastermind.',
        duration: 152,
        rating: 'PG-13',
        genre: 'Action, Drama, Crime',
        imageUrl: 'https://via.placeholder.com/300x450?text=Dark+Knight'
      },
      {
        title: 'Inception',
        description: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
        duration: 148,
        rating: 'PG-13',
        genre: 'Action, Adventure, Sci-Fi',
        imageUrl: 'https://via.placeholder.com/300x450?text=Inception'
      },
      {
        title: 'Interstellar',
        description: 'A team of explorers travel through a wormhole in space.',
        duration: 169,
        rating: 'PG-13',
        genre: 'Adventure, Drama, Sci-Fi',
        imageUrl: 'https://via.placeholder.com/300x450?text=Interstellar'
      }
    ];

    for (const movieData of movies) {
      const movie = await prisma.movie.upsert({
        where: { title: movieData.title },
        update: movieData,
        create: movieData
      });
      console.log(`Created movie: ${movie.title}`);

      // Create showtimes for this movie
      const today = new Date();
      const showtimes = [
        new Date(today.setHours(10, 0, 0, 0)),
        new Date(today.setHours(14, 30, 0, 0)),
        new Date(today.setHours(18, 0, 0, 0)),
        new Date(today.setHours(21, 30, 0, 0)),
      ];

      for (let i = 0; i < showtimes.length; i++) {
        const showtime = await prisma.showtime.create({
          data: {
            movieId: movie.id,
            time: showtimes[i],
            screen: `Screen ${i + 1}`
          }
        });
        console.log(`Created showtime for ${movie.title} at ${showtime.time.toLocaleString()}`);

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
          skipDuplicates: true
        });
        console.log(`Created ${seats.length} seats for showtime at ${showtime.time.toLocaleString()}`);
      }
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();