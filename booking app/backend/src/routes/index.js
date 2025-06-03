const express = require('express');
const router = express.Router();

const movieRoutes = require('./movies');
const bookingRoutes = require('./booking');

router.use('/movies', movieRoutes);
router.use('/bookings', bookingRoutes); 

module.exports = router;
