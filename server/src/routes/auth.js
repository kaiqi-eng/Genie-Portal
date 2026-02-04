const express = require('express');
const passport = require('passport');
const router = express.Router();
require('dotenv').config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Initiate Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${CLIENT_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    // Check if user is approved
    if (req.user.isApproved) {
      res.redirect(`${CLIENT_URL}/chat`);
    } else {
      res.redirect(`${CLIENT_URL}/login?error=not_approved`);
    }
  }
);

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      isApproved: req.user.isApproved,
      isAdmin: req.user.isAdmin,
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
