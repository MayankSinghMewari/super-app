// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no authorization header is present, handle as a guest
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For GET requests, allow access as guest
      if (req.method === 'GET') {
        req.isGuest = true;
        return next();
      }
      return res.status(401).json({ 
        success: false,
        message: 'Authorization token missing or invalid' 
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Handle both formats - id or userId might be present in the token
      req.userId = decoded.id || decoded.userId;
      
      if (!req.userId) {
        throw new Error('Token does not contain a user ID');
      }
      
      next();
    } catch (err) {
      console.error('JWT verification error:', err.message);
      
      // For GET requests, allow access as guest even with invalid token
      if (req.method === 'GET') {
        req.isGuest = true;
        return next();
      }
      
      return res.status(401).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};