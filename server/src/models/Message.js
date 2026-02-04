const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Conversation = require('./Conversation');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'conversation_id',
    references: {
      model: Conversation,
      key: 'id',
    },
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'session_id',
  },
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

// Define relationships
Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });

module.exports = Message;
