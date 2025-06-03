import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './MovieDetail.css';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/movies/${id}`);
        console.log('Movie data received:', data); // Add this for debugging
        setMovie(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching movie:', err);
        setError(err.response?.data?.message || 'Failed to load movie details');
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Re-fetch the data
    api.get(`/movies/${id}`)
      .then(response => {
        setMovie(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load movie details');
        setLoading(false);
      });
  };

  // Loading state with spinner
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading movie details...</p>
      </div>
    );
  }

  // Error state with retry button
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">!</div>
        <h3>Unable to load movie details</h3>
        <p>{error}</p>
        <div>
          <button onClick={handleRetry} className="retry-button">
            Try Again
          </button>
          <button onClick={() => navigate('/')} className="home-button">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!movie) {
    return (
      <div className="not-found">
        <h3>Movie not found</h3>
        <p>The movie you're looking for doesn't exist or may have been removed.</p>
        <button onClick={() => navigate('/')} className="home-button">
          Back to Home
        </button>
      </div>
    );
  }

  // Format the date and time for better readability
  const formatShowtime = (time) => {
    if (!time) return '';
    
    const date = new Date(time);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="movie-detail-container">
      <div className="movie-detail-header">
        <h1>{movie.title}</h1>
        <button onClick={() => navigate(-1)} className="back-button">
          Back
        </button>
      </div>

      <div className="movie-detail-content">
        <div className="movie-poster-section">
          <img
            src={movie.imageUrl || 'https://via.placeholder.com/300x450?text=No+Image'}
            alt={movie.title}
            className="movie-detail-poster"
          />
        </div>

        <div className="movie-info-section">
          <div className="movie-meta-data">
            <span className="movie-rating">{movie.rating || 'NR'}</span>
            <span className="movie-duration">{movie.duration || '120'} minutes</span>
          </div>

          <div className="movie-description">
            <h3>Description</h3>
            <p>{movie.description || 'No description available.'}</p>
          </div>

          <div className="movie-showtimes">
            <h3>Available Showtimes</h3>
            <div className="showtime-buttons">
              {Array.isArray(movie.showtimes) && movie.showtimes.length > 0 ? (
                movie.showtimes.map((showtime) => (
                  <Link
                    key={showtime.id}
                    to={`/booking/${showtime.id}`}
                    className="showtime-button"
                  >
                    {formatShowtime(showtime.time)}
                  </Link>
                ))
              ) : (
                <p className="no-showtimes">No showtimes available for this movie.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;