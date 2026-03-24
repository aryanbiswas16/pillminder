const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me — get current user's profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      room: user.room,
      phone: user.phone,
      fontSizePreference: user.fontSizePreference,
      highContrastMode: user.highContrastMode,
      preferredLanguage: user.preferredLanguage,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PATCH /api/users/me — update accessibility / profile settings
router.patch('/me', authenticate, [
  body('fontSizePreference').optional().isIn(['normal', 'large', 'extra-large']),
  body('highContrastMode').optional().isBoolean(),
  body('preferredLanguage').optional().isString().isLength({ max: 10 }),
  body('firstName').optional().trim().isLength({ min: 1, max: 80 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 80 }),
  body('phone').optional().trim().isLength({ max: 30 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const allowed = ['fontSizePreference', 'highContrastMode', 'preferredLanguage', 'firstName', 'lastName', 'phone'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await req.user.update(updates);

    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      room: req.user.room,
      phone: req.user.phone,
      fontSizePreference: req.user.fontSizePreference,
      highContrastMode: req.user.highContrastMode,
      preferredLanguage: req.user.preferredLanguage,
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
