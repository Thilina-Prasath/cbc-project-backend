import jwt from 'jsonwebtoken';
import User from '../models/user.js'; // Adjust the path to your User model

const authMiddleware = async (req, res, next) => {
  try {
    console.log('Auth middleware called');
    console.log('Authorization header:', req.headers.authorization);
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('No authorization header');
      return res.status(401).json({ message: 'No authorization header provided' });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    console.log('Extracted token:', token);

    if (!token) {
      console.log('No token found');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Find user - your current token structure has email but no id
    let user;
    if (decoded.id || decoded.userId) {
      // If token has id field
      user = await User.findById(decoded.id || decoded.userId);
    } else if (decoded.email) {
      // Fallback: find by email (for your current token format)
      user = await User.findOne({ email: decoded.email });
    }
    
    console.log('Found user:', user ? `Yes - ${user.email}` : 'No');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request object
    req.user = user;
    console.log('req.user set:', req.user._id);
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    
    return res.status(401).json({ 
      message: 'Authentication failed',
      error: error.message 
    });
  }
};

export default authMiddleware;