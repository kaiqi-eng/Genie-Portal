const express = require('express');
const router = express.Router();
const { isApproved } = require('../middleware/auth');
const { Conversation, Message } = require('../models');
const llmService = require('../services/llmService');

// All chat routes require approved user
router.use(isApproved);

// Get all conversations for current user
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      where: { userId: req.user.id },
      order: [['updated_at', 'DESC']],
    });
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create a new conversation
router.post('/conversations', async (req, res) => {
  try {
    const conversation = await Conversation.create({
      userId: req.user.id,
      title: req.body.title || 'New Conversation',
    });
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.findAll({
      where: { conversationId: req.params.id },
      order: [['created_at', 'ASC']],
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message in a conversation
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Save user message
    const userMessage = await Message.create({
      conversationId: conversation.id,
      role: 'user',
      content: message,
    });

    // Fetch conversation history for context
    const previousMessages = await Message.findAll({
      where: { conversationId: conversation.id },
      order: [['created_at', 'ASC']],
      attributes: ['role', 'content'],
    });

    // Convert to the {role, content} format the LLM expects
    const conversationHistory = previousMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get LLM response with full conversation context
    const llmResponse = await llmService.sendMessage(
      `verified_user_${req.user.id}`,
      message,
      { conversationHistory }
    );

    // Save assistant message
    const assistantMessage = await Message.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: llmResponse.reply,
      sessionId: llmResponse.sessionId,
    });

    // Update conversation title if it's the first message
    const messageCount = await Message.count({ where: { conversationId: conversation.id } });
    if (messageCount === 2) {
      // First exchange, update title based on user's first message
      const title = message.length > 50 ? message.substring(0, 47) + '...' : message;
      await conversation.update({ title });
    }

    // Update conversation timestamp
    await conversation.update({ updated_at: new Date() });

    res.json({
      userMessage,
      assistantMessage,
      llmResponse: {
        status: llmResponse.status,
        timestamp: llmResponse.timestamp,
        sessionId: llmResponse.sessionId,
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete a conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await conversation.destroy();
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;
