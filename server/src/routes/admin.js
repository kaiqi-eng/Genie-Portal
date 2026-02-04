const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const { User } = require('../models');
const { Op } = require('sequelize');

// All admin routes require admin privileges
router.use(isAdmin);

// Get all users with pagination and search
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', filter = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};

    // Search by email or name
    if (search) {
      whereClause = {
        [Op.or]: [
          { email: { [Op.iLike]: `%${search}%` } },
          { name: { [Op.iLike]: `%${search}%` } },
        ],
      };
    }

    // Filter by status
    if (filter === 'approved') {
      whereClause.isApproved = true;
    } else if (filter === 'pending') {
      whereClause.isApproved = false;
    } else if (filter === 'admin') {
      whereClause.isAdmin = true;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['id', 'email', 'name', 'picture', 'isApproved', 'isAdmin', 'created_at'],
    });

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Approve a user
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ isApproved: true });
    res.json({ message: 'User approved', user });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Revoke a user's access
router.patch('/users/:id/revoke', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent revoking own access
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot revoke your own access' });
    }

    await user.update({ isApproved: false });
    res.json({ message: 'User access revoked', user });
  } catch (error) {
    console.error('Error revoking user:', error);
    res.status(500).json({ error: 'Failed to revoke user access' });
  }
});

// Promote a user to admin
router.patch('/users/:id/promote', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // User must be approved to be promoted
    if (!user.isApproved) {
      return res.status(400).json({ error: 'User must be approved before promoting to admin' });
    }

    await user.update({ isAdmin: true });
    res.json({ message: 'User promoted to admin', user });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Demote a user from admin
router.patch('/users/:id/demote', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent demoting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    await user.update({ isAdmin: false });
    res.json({ message: 'User demoted from admin', user });
  } catch (error) {
    console.error('Error demoting user:', error);
    res.status(500).json({ error: 'Failed to demote user' });
  }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
