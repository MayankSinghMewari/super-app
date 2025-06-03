// Improved Navbar.jsx
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css'; // Import the new CSS file

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <span className="logo-icon">🎬</span>
            <span>MovieBooking</span>
          </Link>
          
          <div className="navbar-links">
            <ul className="nav-links">
              <li><Link to="/" className="nav-link">Home</Link></li>
              <li><Link to="/movies" className="nav-link">Movies</Link></li>
              <li><Link to="/cinemas" className="nav-link">Cinemas</Link></li>
            </ul>
            
            {user ? (
              <>
                <span className="welcome-message">Welcome, {user.email}</span>
                <button onClick={logout} className="logout-button">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="login-button">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
