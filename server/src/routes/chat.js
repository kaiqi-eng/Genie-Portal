const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { isApproved } = require('../middleware/auth');
const { Conversation, Message, User, WebhookUser } = require('../models');
const llmService = require('../services/llmService');

const WEBHOOK_PENDING_PREFIX = 'Request accepted by webhook.';
const CALLBACK_LOG_PREFIX = '[Webhook Callback]';

const getFirstString = (...values) => values.find((v) => typeof v === 'string' && v.trim());
const extractFromRawBody = (rawBody, fieldName) => {
  if (typeof rawBody !== 'string' || !rawBody.trim()) return undefined;

  const escapedField = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`"${escapedField}"\\s*:\\s*"([\\s\\S]*?)"\\s*(,|})`, 'm');
  const match = rawBody.match(regex);
  return match?.[1];
};

const normalizeCallbackPayload = (body) => {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body;
  }

  if (typeof body !== 'string' || !body.trim()) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    // Fallback for malformed JSON strings with unescaped control characters.
    const sessionId = extractFromRawBody(body, 'sessionId')
      || extractFromRawBody(body, 'session_id');
    const userId = extractFromRawBody(body, 'userId')
      || extractFromRawBody(body, 'user_id');
    const reply = extractFromRawBody(body, 'reply')
      || extractFromRawBody(body, 'response')
      || extractFromRawBody(body, 'message')
      || extractFromRawBody(body, 'text');

    return {
      ...(sessionId ? { sessionId } : {}),
      ...(userId ? { userId } : {}),
      ...(reply ? { reply } : {}),
      _rawBody: body,
    };
  }
};
const maskSecret = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const getCallbackLogHeaders = (headers = {}) => ({
  'content-type': headers['content-type'],
  'user-agent': headers['user-agent'],
  'x-forwarded-for': headers['x-forwarded-for'],
  'x-request-id': headers['x-request-id'],
  'x-portal-session-id': headers['x-portal-session-id'],
  'x-portal-callback-url': headers['x-portal-callback-url'],
  'x-latenode-secret': maskSecret(headers['x-latenode-secret']),
  'x-webhook-secret': maskSecret(headers['x-webhook-secret']),
});

// Public callback endpoint for Latenode to post final chat text.
router.get('/webhook/callback', (req, res) => {
  return res.json({
    status: 'callback-ready',
    service: 'web-portal',
    endpoint: '/api/chat/webhook/callback',
    method: 'GET',
    timestamp: new Date().toISOString(),
  });
});

// Public callback endpoint for Latenode to post final chat text.
router.post('/webhook/callback', async (req, res) => {
  try {
    console.log(`${CALLBACK_LOG_PREFIX} Incoming request`, {
      headers: getCallbackLogHeaders(req.headers),
      query: req.query,
      body: req.body,
    });

    const configuredSecret = process.env.LATENODE_CALLBACK_SECRET;
    if (configuredSecret) {
      const providedSecret = getFirstString(
        req.headers['x-latenode-secret'],
        req.headers['x-webhook-secret'],
        req.body?.secret,
        req.query?.secret
      );

      if (providedSecret !== configuredSecret) {
        console.warn(`${CALLBACK_LOG_PREFIX} Secret validation failed`);
        return res.status(401).json({ error: 'Invalid callback secret' });
      }
    }

    const payload = normalizeCallbackPayload(req.body);
    const nestedBody = payload.body || {};

    const sessionId = getFirstString(
      payload.sessionId,
      payload.session_id,
      req.headers['x-portal-session-id'],
      nestedBody.sessionId,
      nestedBody.session_id
    );

    const userId = getFirstString(
      payload.userId,
      payload.user_id,
      nestedBody.userId,
      nestedBody.user_id
    );

    const replyText = getFirstString(
      payload.reply,
      payload.response,
      payload.message,
      payload.text,
      nestedBody.reply,
      nestedBody.response,
      nestedBody.message,
      nestedBody.text
    );

    console.log(`${CALLBACK_LOG_PREFIX} Extracted fields`, {
      sessionId,
      userId,
      hasReplyText: Boolean(replyText),
    });

    if (!replyText) {
      console.warn(`${CALLBACK_LOG_PREFIX} Missing reply text`);
      return res.status(400).json({ error: 'Missing reply text in callback payload' });
    }

    let targetMessage = null;

    if (sessionId) {
      targetMessage = await Message.findOne({
        where: { sessionId, role: 'assistant' },
        order: [['created_at', 'DESC']],
      });
      console.log(`${CALLBACK_LOG_PREFIX} Session lookup`, {
        sessionId,
        found: Boolean(targetMessage),
        messageId: targetMessage?.id,
      });
    }

    if (!targetMessage && userId) {
      const webhookUser = await WebhookUser.findOne({ where: { userId } });
      console.log(`${CALLBACK_LOG_PREFIX} User lookup`, {
        userId,
        webhookUserFound: Boolean(webhookUser),
        mappedEmail: webhookUser?.email,
      });
      if (webhookUser) {
        const appUser = await User.findOne({ where: { email: webhookUser.email } });
        if (appUser) {
          const conversation = await Conversation.findOne({
            where: { userId: appUser.id },
            order: [['updated_at', 'DESC']],
          });

          if (conversation) {
            targetMessage = await Message.findOne({
              where: {
                conversationId: conversation.id,
                role: 'assistant',
                content: { [Op.like]: `${WEBHOOK_PENDING_PREFIX}%` },
              },
              order: [['created_at', 'DESC']],
            });
            console.log(`${CALLBACK_LOG_PREFIX} Pending message lookup`, {
              conversationId: conversation.id,
              found: Boolean(targetMessage),
              messageId: targetMessage?.id,
            });
          }
        }
      }
    }

    if (!targetMessage) {
      console.warn(`${CALLBACK_LOG_PREFIX} No matching pending message found`);
      return res.status(404).json({ error: 'No pending assistant message found for callback' });
    }

    await targetMessage.update({ content: replyText });
    await Conversation.update(
      { updated_at: new Date() },
      { where: { id: targetMessage.conversationId } }
    );

    console.log(`${CALLBACK_LOG_PREFIX} Message updated`, {
      messageId: targetMessage.id,
      conversationId: targetMessage.conversationId,
      sessionId: targetMessage.sessionId,
    });

    return res.json({
      status: 'updated',
      conversationId: targetMessage.conversationId,
      messageId: targetMessage.id,
      sessionId: targetMessage.sessionId,
    });
  } catch (error) {
    console.error(`${CALLBACK_LOG_PREFIX} Error processing callback:`, error);
    return res.status(500).json({ error: 'Failed to process webhook callback' });
  }
});

// All authenticated chat routes require approved user
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
      {
        conversationHistory,
        userEmail: req.user.email,
      }
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
