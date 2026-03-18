const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { WebhookUser } = require('../models');

const LATENODE_WEBHOOK_URL = 'https://webhook.latenode.com/88477/dev/genie';
const PORTAL_ORIGIN = 'genieportal';
const PORTAL_API_KEY = '8pclqdc0lUhMq2GohuU821OK9tc3Y1J3';
const ENV_FILE_PATH = path.resolve(__dirname, '../../.env');
const ASYNC_LOG_PREFIX = '[Webhook Async]';
const WEBHOOK_PENDING_PREFIX = 'Request accepted by webhook.';
const UNSUPPORTED_CALLBACK_HOST_PATTERNS = [
  /(^|\.)loca\.lt$/i,
  /(^|\.)localtunnel\.me$/i,
];
const M2M_TUNNEL_HOST_PATTERNS = [
  /(^|\.)trycloudflare\.com$/i,
  /(^|\.)ngrok-free\.app$/i,
  /(^|\.)ngrok\.io$/i,
];

const getLiveEnvValue = (key) => {
  try {
    const raw = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    const parsed = dotenv.parse(raw);
    return parsed[key];
  } catch (error) {
    return undefined;
  }
};

const getPortalCallbackUrl = () => {
  const explicitUrl = getLiveEnvValue('PORTAL_CALLBACK_URL') || process.env.PORTAL_CALLBACK_URL;
  if (explicitUrl) return explicitUrl;

  const publicBaseUrl = getLiveEnvValue('PUBLIC_BASE_URL') || process.env.PUBLIC_BASE_URL;
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/api/chat/webhook/callback`;
  }

  return 'http://localhost:3001/api/chat/webhook/callback';
};

const validateCallbackHost = (callbackUrl) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch (error) {
    throw new Error(`Invalid callback URL: ${callbackUrl}`);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported callback protocol: ${parsedUrl.protocol}`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const blockedHostPattern = UNSUPPORTED_CALLBACK_HOST_PATTERNS.find((pattern) => pattern.test(hostname));
  if (blockedHostPattern) {
    throw new Error(
      `Unsupported callback tunnel host "${hostname}". Use cloudflared/ngrok without protection layers.`
    );
  }

  return parsedUrl;
};

const isMachineToMachineTunnelHost = (hostname) => (
  M2M_TUNNEL_HOST_PATTERNS.some((pattern) => pattern.test(hostname))
);

const validateLocalCallbackHealth = async (parsedCallbackUrl) => {
  const localPort = getLiveEnvValue('PORT') || process.env.PORT || '3001';
  const localCallbackUrl = `http://127.0.0.1:${localPort}${parsedCallbackUrl.pathname}${parsedCallbackUrl.search}`;
  const response = await axios.get(localCallbackUrl, {
    timeout: 10000,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Local callback health check failed with status ${response.status}`);
  }

  const status = response.data?.status;
  if (status !== 'callback-ready') {
    throw new Error(
      `Local callback health check returned unexpected body. Expected status="callback-ready", got "${status || 'unknown'}"`
    );
  }
};

const validateCallbackHealth = async (parsedCallbackUrl) => {
  const callbackUrl = parsedCallbackUrl.toString();
  const response = await axios.get(callbackUrl, {
    timeout: 10000,
    validateStatus: () => true,
  });

  if (response.status >= 200 && response.status < 300) {
    const status = response.data?.status;
    if (status !== 'callback-ready') {
      throw new Error(
        `Callback health check returned unexpected body. Expected status="callback-ready", got "${status || 'unknown'}"`
      );
    }
    return { mode: 'public' };
  }

  const hostname = parsedCallbackUrl.hostname.toLowerCase();
  if (response.status === 403 && isMachineToMachineTunnelHost(hostname)) {
    console.warn(`${ASYNC_LOG_PREFIX} phase=callback_healthcheck_public_blocked`, {
      callbackUrl,
      status: response.status,
      fallback: 'local',
    });
    await validateLocalCallbackHealth(parsedCallbackUrl);
    return { mode: 'local_fallback' };
  }

  throw new Error(`Callback health check failed with status ${response.status}`);
};

const extractWebhookReply = (data) => {
  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    return data.reply || data.response || data.message || JSON.stringify(data);
  }

  return '';
};

const isMeaningfulFinalReply = (rawReply) => {
  const normalizedReply = String(rawReply || '').trim();
  if (!normalizedReply) return false;

  const lowerReply = normalizedReply.toLowerCase();
  const nonFinalPhrases = [
    'request accepted',
    'accepted',
    'queued',
    'processing',
    'in progress',
    'async',
    'asynchronous',
  ];

  // Treat short status-like replies as non-final placeholders.
  if (normalizedReply.length < 40 && nonFinalPhrases.some((phrase) => lowerReply.includes(phrase))) {
    return false;
  }

  return true;
};

const isAsyncAcceptedResponse = (responseStatus, responseData, rawReply) => {
  const normalizedReply = String(rawReply || '').trim().toLowerCase();
  const normalizedStatusField = String(responseData?.status || '').trim().toLowerCase();
  const normalizedStateField = String(responseData?.state || '').trim().toLowerCase();
  const normalizedResultField = String(responseData?.result || '').trim().toLowerCase();

  const acceptedIndicators = [
    normalizedReply,
    normalizedStatusField,
    normalizedStateField,
    normalizedResultField,
  ].filter(Boolean);

  // Treat any accepted/queued wording as async mode so the UI can poll reliably.
  const hasAcceptedIndicator = acceptedIndicators.some(
    (value) => value.includes('accepted') || value.includes('queued') || value.includes('async')
  );

  // If webhook returns 2xx but no meaningful final text, assume async handoff.
  if (responseStatus >= 200 && responseStatus < 300 && !isMeaningfulFinalReply(rawReply)) {
    return true;
  }

  return responseStatus >= 200 && responseStatus < 300 && hasAcceptedIndicator;
};
/**
 * Save or update user mapping by email and return the persisted user ID.
 *
 * @param {string} email - Email address key
 * @param {string} userId - User ID value to store
 * @returns {Promise<string>} - Persisted user ID for this email
 */
const persistUserIdByEmail = async (email, userId) => {
  const existing = await WebhookUser.findOne({ where: { email } });
  if (existing?.userId) {
    return existing.userId;
  }

  await WebhookUser.create({ email, userId });
  return userId;
};

/**
 * Send a message by posting the portal payload to the Latenode webhook.
 *
 * @param {string} userId - The user's ID
 * @param {string} message - The user's message
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Webhook response wrapper
 */
const sendMessage = async (userId, message, options = {}) => {
  try {
    const normalizedEmail = typeof options.userEmail === 'string' ? options.userEmail.trim() : '';
    if (normalizedEmail) {
      await persistUserIdByEmail(normalizedEmail, userId);
    }
    const callbackUrl = getPortalCallbackUrl();
    const parsedCallbackUrl = validateCallbackHost(callbackUrl);
    const localSessionId = `webhook_session_${Date.now()}`;

    console.log(`${ASYNC_LOG_PREFIX} phase=callback_url_selected`, {
      sessionId: localSessionId,
      callbackUrl,
      callbackHost: parsedCallbackUrl.host,
    });

    console.log(`${ASYNC_LOG_PREFIX} phase=callback_healthcheck_start`, {
      sessionId: localSessionId,
      callbackUrl,
    });
    const healthResult = await validateCallbackHealth(parsedCallbackUrl);
    console.log(`${ASYNC_LOG_PREFIX} phase=callback_healthcheck_ok`, {
      sessionId: localSessionId,
      callbackUrl,
      mode: healthResult.mode,
    });

    const payload = {
      Origin: PORTAL_ORIGIN,
      text: message,
      apikey: PORTAL_API_KEY,
      ...(normalizedEmail ? { Email: normalizedEmail } : {}),
    };
    console.log(`${ASYNC_LOG_PREFIX} phase=webhook_send_start`, {
      sessionId: localSessionId,
      webhookUrl: LATENODE_WEBHOOK_URL,
    });

    const response = await axios.post(LATENODE_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Portal-Session-Id': localSessionId,
        'X-Portal-Callback-Url': callbackUrl,
      },
      timeout: 60000,
    });
    const rawReply = extractWebhookReply(response.data);
    const requestId = response.headers?.['x-request-id'] || null;
    console.log(`${ASYNC_LOG_PREFIX} phase=webhook_sent`, {
      sessionId: localSessionId,
      status: response.status,
      requestId,
    });

    const isPending = isAsyncAcceptedResponse(response.status, response.data, rawReply);
    const reply = isPending
      ? `${WEBHOOK_PENDING_PREFIX} This endpoint is asynchronous and did not return a final chat reply in the HTTP response.${requestId ? ` (requestId: ${requestId})` : ''}`
      : rawReply;

    return {
      status: isPending ? 'pending' : 'success',
      reply,
      timestamp: new Date().toISOString(),
      sessionId: localSessionId,
    };
  } catch (error) {
    console.error(`${ASYNC_LOG_PREFIX} phase=webhook_send_error`, {
      message: error.message,
      status: error.response?.status,
      responseData: error.response?.data,
    });

    return {
      status: 'error',
      reply: `I encountered an error while processing your request: ${error.message}`,
      timestamp: new Date().toISOString(),
      sessionId: `webhook_error_session_${Date.now()}`,
    };
  }
};

const getAvailableTools = () => {
  return [];
};

const fetchRss = async (url) => {
  return { success: false, error: `RSS tools are disabled. URL provided: ${url}` };
};

const executeTool = async (toolName, params) => {
  return { error: `Tool execution is disabled. Unknown tool: ${toolName}`, params };
};

module.exports = {
  sendMessage,
  getAvailableTools,
  fetchRss,
  executeTool,
};
