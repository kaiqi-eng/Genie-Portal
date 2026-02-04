// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Middleware to check if user is approved
const isApproved = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isApproved) {
    return next();
  }
  res.status(403).json({ error: 'Access denied. Your account is pending approval.' });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
};

module.exports = {
  isAuthenticated,
  isApproved,
  isAdmin,
};
