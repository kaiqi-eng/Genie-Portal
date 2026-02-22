const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WebhookUser = sequelize.define('WebhookUser', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  userId: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'user_id',
  },
}, {
  tableName: 'webhook_users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = WebhookUser;
