import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Home.css';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const { data } = await api.get('/movies');
        setMovies(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load movies');
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading movies...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <div className="error-icon">!</div>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="retry-button">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Now Showing</h1>
        <p>Book your favorite movies today</p>
      </div>
      
      <div className="movies-grid">
        {movies.map((movie) => (
          <div key={movie.id} className="movie-card">
            <div className="movie-poster-container">
              <img 
                src={movie.imageUrl || 'https://via.placeholder.com/300x450?text=No+Image'} 
                alt={movie.title} 
                className="movie-poster"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/300x450?text=No+Image';
                }}
              />
              <div className="movie-overlay">
                <Link 
                  to={`/movie/${movie.id}`} 
                  className="details-button"
                >
                  View Details
                </Link>
              </div>
            </div>
            <div className="movie-details">
              <h3>{movie.title}</h3>
              <div className="movie-meta">
                <span className="movie-rating">
                  {movie.rating || 'NR'}
                </span>
                <span className="movie-duration">
                  {movie.duration || '120'} min
                </span>
              </div>
              <div className="showtimes">
                {movie.showtimes?.map((showtime) => (
                  <Link
                    key={showtime.id}
                    to={`/booking/${showtime.id}`}
                    className="showtime-button"
                  >
                    {new Date(showtime.time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;