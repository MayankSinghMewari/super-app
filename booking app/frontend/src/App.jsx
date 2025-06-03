// Updated App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Booking from './pages/Booking';
import Navbar from './components/Navbar';
import './App.css';
import MovieDetail from './pages/MovieDetail';
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          {/* Protected Routes */}
          <Route
            path="/"
            element={user ? <Home /> : <Navigate to="/login" />}
          />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route
            path="/booking/:showtimeId"
            element={user ? <Booking /> : <Navigate to="/login" />}
          />

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" />}/>
        </Routes>
      </main>
    </>
  );
}

export default App;