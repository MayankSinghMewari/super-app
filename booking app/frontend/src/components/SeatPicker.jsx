import { useEffect, useState } from 'react';
import useSocket from '../hooks/useSocket';
import styles from './SeatPicker.module.css';

const SeatPicker = ({ showtimeId, seats, selectedSeats, onSelectSeat }) => {
  const socket = useSocket();
  const [lockedSeats, setLockedSeats] = useState({});

  useEffect(() => {
    if (!socket || !showtimeId) return;

    // Listen for seat updates
    const handleSeatLocked = ({ seatId, userId }) => {
      setLockedSeats(prev => ({ ...prev, [seatId]: userId }));
    };

    const handleSeatUnlocked = ({ seatId }) => {
      setLockedSeats(prev => {
        const newState = { ...prev };
        delete newState[seatId];
        return newState;
      });
    };

    const handleSeatsBooked = ({ seatIds }) => {
      setLockedSeats(prev => {
        const newState = { ...prev };
        seatIds.forEach(id => delete newState[id]);
        return newState;
      });
    };

    socket.on('seatLocked', handleSeatLocked);
    socket.on('seatUnlocked', handleSeatUnlocked);
    socket.on('seatsBooked', handleSeatsBooked);

    return () => {
      if (socket) {
        socket.off('seatLocked', handleSeatLocked);
        socket.off('seatUnlocked', handleSeatUnlocked);
        socket.off('seatsBooked', handleSeatsBooked);
      }
    };
  }, [socket, showtimeId]);

  const handleSeatClick = (seat) => {
    if (seat.isBooked) return;
    if (lockedSeats[seat.id] && !selectedSeats.includes(seat.id)) return;

    onSelectSeat(seat.id);
  };

  const getSeatStatus = (seat) => {
    if (seat.isBooked) return 'booked';
    if (lockedSeats[seat.id]) return 'locked';
    if (selectedSeats.includes(seat.id)) return 'selected';
    return 'available';
  };

  return (
    <div className={styles.seatPicker}>
      <div className={styles.screen}>Screen</div>
      <div className={styles.seatGrid}>
        {seats.map((seat) => (
          <button
            key={seat.id}
            className={`${styles.seat} ${styles[getSeatStatus(seat)]}`}
            onClick={() => handleSeatClick(seat)}
            disabled={seat.isBooked || (lockedSeats[seat.id] && !selectedSeats.includes(seat.id))}
            title={seat.isBooked ? 'Booked' : lockedSeats[seat.id] ? 'Locked' : 'Available'}
          >
            {seat.seatNumber}
          </button>
        ))}
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.available}`}></div>
          <span>Available</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.selected}`}></div>
          <span>Selected</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.locked}`}></div>
          <span>Locked</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendColor} ${styles.booked}`}></div>
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
};

export default SeatPicker;