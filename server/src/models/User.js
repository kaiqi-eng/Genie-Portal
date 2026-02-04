const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  googleId: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    field: 'google_id',
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  picture: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_approved',
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_admin',
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = User;
