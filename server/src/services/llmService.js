const axios = require('axios');

// Placeholder LLM endpoint configuration
const LLM_PROMPT_URL = 'https://placeholder.com/prompt';
const LLM_RESPONSE_URL = 'https://placeholder.com/response';

/**
 * Send a message to the LLM and get a response
 * @param {string} userId - The user's ID
 * @param {string} message - The user's message
 * @returns {Promise<Object>} - The LLM response
 */
const sendMessage = async (userId, message) => {
  try {
    const timestamp = new Date().toISOString();
    
    // Send prompt to LLM
    const promptResponse = await axios.post(LLM_PROMPT_URL, {
      user_id: userId,
      message: message,
      timestamp: timestamp,
    });

    // Get response from LLM
    const llmResponse = await axios.get(LLM_RESPONSE_URL);

    return {
      status: llmResponse.data.status || 'success',
      reply: llmResponse.data.reply || 'Response from LLM model',
      timestamp: llmResponse.data.timestamp || new Date().toISOString(),
      sessionId: llmResponse.data.session_id || `session_${Date.now()}`,
    };
  } catch (error) {
    console.error('LLM Service Error:', error.message);
    
    // Return a mock response for development/testing when placeholder endpoint is unavailable
    return {
      status: 'success',
      reply: `[Mock Response] I received your message: "${message}". This is a placeholder response since the LLM endpoint is not available. Configure the actual endpoint in llmService.js.`,
      timestamp: new Date().toISOString(),
      sessionId: `mock_session_${Date.now()}`,
    };
  }
};

module.exports = {
  sendMessage,
};
