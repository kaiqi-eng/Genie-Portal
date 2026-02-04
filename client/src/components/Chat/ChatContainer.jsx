import { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

function ChatContainer({
  messages,
  onSendMessage,
  loading,
  sidebarOpen,
  onToggleSidebar,
  activeConversation,
}) {
  const [sending, setSending] = useState(false);

  const handleSend = async (message) => {
    if (sending) return;
    setSending(true);
    try {
      await onSendMessage(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h1 className="font-semibold text-gray-800">
            {activeConversation?.title || 'New Chat'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            LLM Portal
          </span>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <MessageList messages={messages} sending={sending} />
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
      <p className="text-gray-500 text-center max-w-md">
        Start a conversation by typing a message below. I'm here to assist you with any questions.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 max-w-2xl w-full">
        <ExamplePrompt text="How can I access the vertical farm build logs?" />
        <ExamplePrompt text="Summarize the latest project updates" />
        <ExamplePrompt text="What are the current system alerts?" />
        <ExamplePrompt text="Help me draft a status report" />
      </div>
    </div>
  );
}

function ExamplePrompt({ text }) {
  return (
    <button className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <p className="text-sm text-gray-700">{text}</p>
    </button>
  );
}

export default ChatContainer;
