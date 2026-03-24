const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Demo user IDs (must match seed.js)
const DEMO_TOKENS = {
  'demo-resident':  '11111111-1111-1111-1111-111111111111',
  'demo-caregiver': '22222222-2222-2222-2222-222222222222',
  'demo-nurse':     '33333333-3333-3333-3333-333333333333'
};

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    let userId;

    // Support demo tokens for cosmetic auth
    if (DEMO_TOKENS[token]) {
      userId = DEMO_TOKENS[token];
    } else {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    }

    const user = await User.findByPk(userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = { authenticate, authorize, generateToken };
