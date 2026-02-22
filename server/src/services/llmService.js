const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { WebhookUser } = require('../models');

const LATENODE_WEBHOOK_URL = 'https://webhook.latenode.com/88477/dev/genieslackorigin';
const ENV_FILE_PATH = path.resolve(__dirname, '../../.env');
const ASYNC_LOG_PREFIX = '[Webhook Async]';
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


const WEBHOOK_CONSTANT_PACKET = {
  body: {
    api_app_id: 'A0AEL4QQFPA',
    channel_id: 'C0AEL7U2X32',
    channel_name: 'bot-channel',
    command: '/askgenieportal',
    is_enterprise_install: 'false',
    response_url: 'https://hooks.slack.com/commands/T0A9A0BEK0B/10565544043232/53b5upnXGY42N2azc4M6rncK',
    team_domain: 'bayshorizonnetwork',
    team_id: 'T0A9A0BEK0B',
    text: '',
    token: '4Bidj759IPMikzhUloAE6pce',
    trigger_id: '10537267003346.10316011495011.73c3febc5ef91a2323ef2626666a8d15',
    user_id: '',
    user_name: 'onya321800',
    portal_callback_url: '',
  },
  client_ip: '',
  headers: {
    Accept: 'application/json,*/*',
    'Accept-Encoding': 'gzip, br',
    'Cdn-Loop': 'cloudflare; loops=1',
    'Cf-Connecting-Ip': '44.214.100.201',
    'Cf-Ipcity': 'Ashburn',
    'Cf-Ipcontinent': 'NA',
    'Cf-Ipcountry': 'US',
    'Cf-Iplatitude': '39.04372',
    'Cf-Iplongitude': '-77.48749',
    'Cf-Metro-Code': '511',
    'Cf-Postal-Code': '20147',
    'Cf-Ray': '9d00b6a369b01877-IAD',
    'Cf-Region': 'Virginia',
    'Cf-Region-Code': 'VA',
    'Cf-Timezone': 'America/New_York',
    'Cf-Visitor': '{"scheme":"https"}',
    'Content-Length': '473',
    'Content-Type': 'application/x-www-form-urlencoded',
    'True-Client-Ip': '44.214.100.201',
    'User-Agent': 'Slackbot 1.0 (+https://api.slack.com/robots)',
    'X-Forwarded-For': '44.214.100.201',
    'X-Forwarded-Host': 'webhook.latenode.com',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
    'X-Forwarded-Scheme': 'https',
    'X-Original-Forwarded-For': '44.214.100.201',
    'X-Real-Ip': '44.214.100.201',
    'X-Request-Id': '6da5e9f1f4a044bc8bcf72c09af42171',
    'X-Scheme': 'https',
    'X-Slack-Request-Timestamp': '1771451146',
    'X-Slack-Signature': 'v0=884781d803d7b22675471cdaabce9512ecbd162c5dc28a5a32a9b1228011bbd5',
  },
  method: 'POST',
  query: {},
  url: 'http://',
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
 * Send a message by posting a hardcoded packet to Latenode webhook.
 *
 * Only `body.text` and `body.user_id` are dynamic.
 *
 * @param {string} userId - The user's ID
 * @param {string} message - The user's message
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Webhook response wrapper
 */
const sendMessage = async (userId, message, options = {}) => {
  try {
    if (!options.userEmail) {
      throw new Error('userEmail is required to store user ID mapping.');
    }

    const persistedUserId = await persistUserIdByEmail(options.userEmail, userId);
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

    const packet = JSON.parse(JSON.stringify(WEBHOOK_CONSTANT_PACKET));
    packet.body.text = message;
    packet.body.user_id = persistedUserId;
    packet.body.portal_callback_url = callbackUrl;
    console.log(`${ASYNC_LOG_PREFIX} phase=webhook_send_start`, {
      sessionId: localSessionId,
      webhookUrl: LATENODE_WEBHOOK_URL,
    });

    // Send only the inner Slack-like body to avoid nested `body.body` at webhook receiver.
    const response = await axios.post(LATENODE_WEBHOOK_URL, packet.body, {
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

    const reply = rawReply === 'request accepted'
      ? `Request accepted by webhook. This endpoint is asynchronous and did not return a final chat reply in the HTTP response.${requestId ? ` (requestId: ${requestId})` : ''}`
      : rawReply;

    return {
      status: 'success',
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
