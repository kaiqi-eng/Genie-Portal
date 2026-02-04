const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: User,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING(255),
    defaultValue: 'New Conversation',
  },
}, {
  tableName: 'conversations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Define relationships
User.hasMany(Conversation, { foreignKey: 'userId', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'userId' });

module.exports = Conversation;
