const axios = require('axios');
const rssService = require('./rssService');

// OpenRouter configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'arcee-ai/trinity-large-preview:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Available tools that the LLM can use
 */
const AVAILABLE_TOOLS = [
  {
    name: 'fetch_rss',
    description: 'Fetch RSS feed from a website URL. If the website has an RSS feed, it will be discovered and parsed. If no RSS feed exists, one will be generated from the page content.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The website URL to fetch RSS from (e.g., "https://example.com" or "techcrunch.com")',
        },
      },
      required: ['url'],
    },
  },
];

// ─── Low-level OpenRouter helper ────────────────────────────────────────────

/**
 * Send a chat completion request to OpenRouter
 * @param {Array} messages - Array of {role, content} message objects
 * @returns {Promise<string>} - The assistant's reply content
 */
const callOpenRouter = async (messages) => {
  const response = await axios.post(
    OPENROUTER_BASE_URL,
    {
      model: OPENROUTER_MODEL,
      messages,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
      },
      timeout: 60000,
    },
  );

  const choice = response.data?.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('Empty response from OpenRouter');
  }
  return choice.message.content;
};

// ─── Step 1: Planning – ask the LLM which URLs to fetch ─────────────────────

const PLANNING_SYSTEM_PROMPT = `You are a helpful assistant with the ability to fetch RSS feeds from websites.

When the user sends a message, decide whether fetching RSS feeds from one or more websites would help you give a better answer.

You MUST respond with ONLY a JSON object in the following format — no other text:
{"urls": ["https://example.com", "https://other-site.com"]}

Rules:
- If the query would benefit from real-time news or content from specific websites, include those website URLs.
- If the query is general conversation or does not need any RSS data, return an empty array: {"urls": []}
- Return full base URLs (e.g. "https://techcrunch.com"), not RSS feed URLs — the system will discover the feed automatically.
- Return at most 5 URLs.`;

/**
 * Step 1 – Ask the LLM which websites (if any) it wants RSS from
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages [{role, content}, ...]
 * @returns {Promise<string[]>} - Array of URLs to fetch RSS from (may be empty)
 */
const planRssFetches = async (userMessage, conversationHistory = []) => {
  const messages = [
    { role: 'system', content: PLANNING_SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  // Only add the current user message if it's not already the last message in history
  const lastMsg = conversationHistory[conversationHistory.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  const reply = await callOpenRouter(messages);

  // Extract JSON from the reply (handle cases where the LLM wraps it in markdown)
  const jsonMatch = reply.match(/\{[\s\S]*"urls"[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn('Planning step returned non-JSON response, assuming no URLs needed:', reply);
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.urls)) {
      // Sanitise: only keep strings, limit to 5
      return parsed.urls.filter((u) => typeof u === 'string').slice(0, 5);
    }
  } catch (err) {
    console.warn('Failed to parse planning response JSON:', err.message);
  }

  return [];
};

// ─── Step 2: Fetch all requested RSS feeds in parallel ──────────────────────

/**
 * Execute RSS fetch for a single URL
 * @param {string} url - Website URL
 * @returns {Promise<Object>} - RSS feed data
 */
const executeRssFetch = async (url) => {
  const result = await rssService.getRssFeed(url);
  return {
    success: true,
    url,
    source: result.source,
    feedUrl: result.feedUrl,
    feedTitle: result.feed.title,
    feedDescription: result.feed.description,
    itemCount: result.feed.items.length,
    items: result.feed.items.slice(0, 10).map((item) => ({
      title: item.title,
      link: item.link,
      description: item.description?.substring(0, 200),
      pubDate: item.pubDate,
      author: item.author,
    })),
  };
};

/**
 * Fetch RSS feeds for all URLs in parallel and return formatted context
 * @param {string[]} urls - Array of website URLs
 * @returns {Promise<{rssContext: string, toolResults: Array}>} - Formatted RSS text and raw results
 */
const fetchAllRssFeeds = async (urls) => {
  if (!urls || urls.length === 0) {
    return { rssContext: '', toolResults: [] };
  }

  const settled = await Promise.allSettled(
    urls.map((url) => executeRssFetch(url)),
  );

  const toolResults = [];

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      toolResults.push({ name: 'fetch_rss', url: urls[i], result: outcome.value });
    } else {
      toolResults.push({
        name: 'fetch_rss',
        url: urls[i],
        result: { success: false, url: urls[i], error: outcome.reason?.message || 'Unknown error' },
      });
    }
  }

  // Format results into readable text for the final LLM context
  const rssContext = formatToolResults(toolResults);
  return { rssContext, toolResults };
};

/**
 * Format tool results into readable text
 * @param {Array} toolResults - Results from tool executions
 * @returns {string} - Formatted string for LLM context
 */
const formatToolResults = (toolResults) => {
  return toolResults
    .map((entry) => {
      const r = entry.result;
      if (r.success) {
        let formatted = `\n--- RSS Feed: ${r.feedTitle} (${r.url}) ---\n`;
        formatted += `Source: ${r.source === 'discovered' ? 'Found existing feed' : 'Generated from page'}\n`;
        if (r.feedUrl) formatted += `Feed URL: ${r.feedUrl}\n`;
        formatted += `Description: ${r.feedDescription}\n`;
        formatted += `Total Items: ${r.itemCount}\n\n`;
        formatted += `Latest Articles:\n`;

        r.items.forEach((item, i) => {
          formatted += `${i + 1}. ${item.title}\n`;
          formatted += `   Link: ${item.link}\n`;
          if (item.pubDate) formatted += `   Date: ${item.pubDate}\n`;
          if (item.description) formatted += `   Summary: ${item.description}...\n`;
          formatted += '\n';
        });

        return formatted;
      }

      return `\n--- RSS Feed Error (${entry.url}) ---\nFailed to fetch: ${r.error}\n`;
    })
    .join('\n');
};

// ─── Step 3: Final response with RSS context ────────────────────────────────

const FINAL_SYSTEM_PROMPT = `You are a helpful assistant. Answer the user's question thoroughly.

If RSS feed data is provided below, use it to inform your answer with the latest content from those sources. Cite specific articles when relevant. If no RSS data is provided, answer based on your own knowledge.`;

/**
 * Step 3 – Send the user's message + RSS context to the LLM for a final answer
 * @param {string} userMessage - The original user message
 * @param {string} rssContext - Formatted RSS feed data (may be empty)
 * @param {Array} conversationHistory - Previous messages [{role, content}, ...]
 * @returns {Promise<string>} - The final assistant reply
 */
const generateFinalResponse = async (userMessage, rssContext, conversationHistory = []) => {
  let systemContent = FINAL_SYSTEM_PROMPT;
  if (rssContext) {
    systemContent += `\n\nHere is the RSS feed data that was retrieved:\n${rssContext}`;
  }

  const messages = [
    { role: 'system', content: systemContent },
    ...conversationHistory,
  ];

  // Only add the current user message if it's not already the last message in history
  const lastMsg = conversationHistory[conversationHistory.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  const reply = await callOpenRouter(messages);

  return reply;
};

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Send a message through the agent workflow:
 *   1. Ask the LLM which URLs need RSS fetched
 *   2. Fetch the RSS feeds in parallel
 *   3. Send the user's message + RSS data to the LLM for a final answer
 *
 * @param {string} userId - The user's ID
 * @param {string} message - The user's message
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - The LLM response
 */
const sendMessage = async (userId, message, options = {}) => {
  try {
    // Validate API key
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      throw new Error('OPENROUTER_API_KEY is not configured. Set it in your .env file.');
    }

    const conversationHistory = options.conversationHistory || [];

    console.log(`[Agent] Step 1: Planning RSS fetches for user ${userId} (${conversationHistory.length} prior messages)...`);
    const urls = await planRssFetches(message, conversationHistory);
    console.log(`[Agent] Planning result: ${urls.length} URL(s) requested:`, urls);

    // Step 2: Fetch RSS feeds (if any)
    let rssContext = '';
    let toolResults = [];

    if (urls.length > 0) {
      console.log(`[Agent] Step 2: Fetching ${urls.length} RSS feed(s) in parallel...`);
      const rssData = await fetchAllRssFeeds(urls);
      rssContext = rssData.rssContext;
      toolResults = rssData.toolResults;
      console.log(`[Agent] RSS fetch complete. ${toolResults.filter((t) => t.result.success).length}/${toolResults.length} succeeded.`);
    } else {
      console.log('[Agent] Step 2: Skipped (no RSS URLs requested).');
    }

    // Step 3: Final LLM call with RSS context and conversation history
    console.log('[Agent] Step 3: Generating final response...');
    const reply = await generateFinalResponse(message, rssContext, conversationHistory);

    return {
      status: 'success',
      reply,
      timestamp: new Date().toISOString(),
      sessionId: `agent_session_${Date.now()}`,
      toolsUsed: toolResults.filter((t) => t.result.success).map(() => 'fetch_rss'),
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    };
  } catch (error) {
    console.error('Agent Workflow Error:', error.message);

    return {
      status: 'error',
      reply: `I encountered an error while processing your request: ${error.message}`,
      timestamp: new Date().toISOString(),
      sessionId: `error_session_${Date.now()}`,
    };
  }
};

// ─── Utility exports (preserve existing API surface) ────────────────────────

/**
 * Get list of available tools
 * @returns {Array} - Available tools
 */
const getAvailableTools = () => {
  return AVAILABLE_TOOLS;
};

/**
 * Directly fetch RSS feed (for programmatic use)
 * @param {string} url - Website URL
 * @returns {Promise<Object>} - RSS feed data
 */
const fetchRss = async (url) => {
  try {
    return await executeRssFetch(url);
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Execute a tool call by name
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} params - Tool parameters
 * @returns {Promise<Object>} - Tool execution result
 */
const executeTool = async (toolName, params) => {
  switch (toolName) {
    case 'fetch_rss':
      try {
        return await executeRssFetch(params.url || params);
      } catch (error) {
        return { success: false, error: error.message };
      }
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};

module.exports = {
  sendMessage,
  getAvailableTools,
  fetchRss,
  executeTool,
};
