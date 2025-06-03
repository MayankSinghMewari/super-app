import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import api from '../services/api';
import SeatPicker from '../components/SeatPicker';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import styles from './Booking.module.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Booking = () => {
  const { showtimeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const [showtime, setShowtime] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/booking/${showtimeId}` } });
      return;
    }

    const fetchShowtime = async () => {
      try {
        // Updated endpoint to match the backend route structure
        const { data } = await api.get(`/bookings/showtime/${showtimeId}`);
        setShowtime(data.data); // Access the data property from the response
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to load showtime');
      } finally {
        setLoading(false);
      }
    };

    fetchShowtime();
  }, [showtimeId, user, navigate]);

  // Set up socket listeners once socket is available
  useEffect(() => {
    if (!socket) return;
    
    // Join the showtime room
    socket.emit('joinShowtime', showtimeId);
    
    // Socket listeners for real-time updates
    const handleSeatLocked = (data) => {
      if (data.showtimeId === showtimeId) {
        setShowtime(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            seats: prev.seats.map(seat => 
              seat.id === data.seatId ? { ...seat, status: 'locked' } : seat
            )
          };
        });
      }
    };
    
    const handleSeatUnlocked = (data) => {
      if (data.showtimeId === showtimeId) {
        setShowtime(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            seats: prev.seats.map(seat => 
              seat.id === data.seatId ? { ...seat, status: 'available' } : seat
            )
          };
        });
      }
    };
    
    socket.on('seatLocked', handleSeatLocked);
    socket.on('seatUnlocked', handleSeatUnlocked);

    return () => {
      if (socket) {
        socket.off('seatLocked', handleSeatLocked);
        socket.off('seatUnlocked', handleSeatUnlocked);
      }
    };
  }, [socket, showtimeId]);

  const handleSelectSeat = async (seatId) => {
    try {
      const isSelected = selectedSeats.includes(seatId);
      const seat = showtime.seats.find(s => s.id === seatId);

      if (!seat) {
        setError('Seat not found');
        return;
      }

      if (seat.isBooked) {
        setError('This seat has already been booked');
        return;
      }

      if (selectedSeats.length >= 8 && !isSelected) {
        setError('You can select a maximum of 8 seats');
        return;
      }

      if (isSelected) {
        // Unselect seat
        setSelectedSeats(prev => prev.filter(id => id !== seatId));
        await api.post('/bookings/unlock-seats', { showtimeId, seatIds: [seatId] });
        if (socket) {
          socket.emit('unlockSeat', { showtimeId, seatId });
        }
      } else {
        // Select seat
        await api.post('/bookings/lock', { showtimeId, seatIds: [seatId] });
        setSelectedSeats(prev => [...prev, seatId]);
        if (socket) {
          socket.emit('lockSeat', { showtimeId, seatId, userId: user.id });
        }
      }
      setError(null);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update seat selection');
    }
  };

  const handleProceedToPayment = async () => {
    try {
      setProcessingPayment(true);
      setError(null);

      const { data } = await api.post('/bookings', { 
        showtimeId, 
        seatIds: selectedSeats,
        pricePerSeat: 12.00 // Add price per seat as required by your backend
      });

      // Create a simulated payment ID for now
      const paymentId = `pay_${Date.now()}`;
      
      // Confirm the booking with the payment ID
      await api.post('/bookings/confirm', {
        bookingId: data.data.id,
        paymentId
      });

      // Navigate to success page
      navigate(`/booking/success/${data.data.id}`);
    } catch (error) {
      setError(error.response?.data?.message || 'Payment failed. Please try again.');
      setProcessingPayment(false);
    }
  };

  if (loading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}></div>
      <p>Loading showtime details...</p>
    </div>
  );

  if (error) return (
    <div className={styles.errorContainer}>
      <div className={styles.errorIcon}>!</div>
      <h3>Something went wrong</h3>
      <p>{error}</p>
      <button 
        onClick={() => window.location.reload()} 
        className={styles.retryButton}
      >
        Refresh Page
      </button>
    </div>
  );

  if (!showtime) return (
    <div className={styles.notFound}>
      <h3>Showtime not found</h3>
      <p>The showtime you're looking for doesn't exist or may have been removed.</p>
      <button 
        onClick={() => navigate('/')} 
        className={styles.homeButton}
      >
        Back to Home
      </button>
    </div>
  );

  const totalPrice = selectedSeats.length * 12; // Assuming $12 per seat

  return (
    <div className={styles.bookingContainer}>
      <div className={styles.bookingHeader}>
        <h1>{showtime.movie.title}</h1>
        <div className={styles.showtimeInfo}>
          <span>{new Date(showtime.time).toLocaleDateString()}</span>
          <span>{new Date(showtime.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>Screen {showtime.screen}</span>
        </div>
      </div>
      
      <div className={styles.bookingContent}>
        <div className={styles.seatSelection}>
          <SeatPicker
            showtimeId={showtimeId}
            seats={showtime.seats}
            selectedSeats={selectedSeats}
            onSelectSeat={handleSelectSeat}
          />
        </div>
        
        <div className={styles.bookingSummary}>
          <h2>Your Booking</h2>
          
                  {selectedSeats.length > 0 ? (
          <>
            <div className={styles.selectedSeats}>
              <h3>Selected Seats ({selectedSeats.length})</h3>
              <ul>
                {selectedSeats.map(seatId => {
                  const seat = showtime.seats.find(s => s.id === seatId);
                  return (
                    <li key={seatId}>
                      <span>Seat {seat.seatNumber}</span>
                      <span>$12.00</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            
            <div className={styles.priceSummary}>
              <div className={styles.priceRow}>
                <span>Tickets ({selectedSeats.length} × $12.00)</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className={styles.priceRow}>
                <span>Booking Fee</span>
                <span>$1.00</span>
              </div>
              <div className={styles.priceRow}>
                <span>Tax</span>
                <span>$0.50</span>
              </div>
              <div className={styles.totalPrice}>
                <span>Total</span>
                <span>${(totalPrice + 1.5).toFixed(2)}</span>
              </div>
            </div>
            
            <button
              onClick={handleProceedToPayment}
              disabled={processingPayment}
              className={styles.paymentButton}
            >
              {processingPayment ? (
                <span className={styles.buttonLoader}></span>
              ) : (
                'Proceed to Payment'
              )}
            </button>
          </>
        ) : (
          <div className={styles.noSeatsSelected}>
            <p>Please select your seats</p>
            <small>Click on available seats to select them</small>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Booking;