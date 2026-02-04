import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

function MessageList({ messages, sending }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id || index}
            message={message}
            isLast={index === messages.length - 1}
          />
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-4 py-6">
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 py-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default MessageList;
