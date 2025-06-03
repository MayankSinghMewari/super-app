const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes
router.get('/', movieController.getAllMovies);
router.get('/:id', movieController.getMovieById);

// Protected routes
router.post('/', authMiddleware, movieController.createMovie);
router.put('/:id', authMiddleware, movieController.updateMovie);
router.delete('/:id', authMiddleware, movieController.deleteMovie);
router.post('/:movieId/showtimes', authMiddleware, movieController.addShowtime);

module.exports = router;