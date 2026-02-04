import ReactMarkdown from 'react-markdown';

function MessageBubble({ message, isLast }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 py-6 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-600' : 'bg-gray-900'
        }`}
      >
        {isUser ? (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 overflow-hidden ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-full ${isUser ? 'text-left' : ''}`}>
          <p className="text-xs font-medium text-gray-500 mb-1">
            {isUser ? 'You' : 'Assistant'}
          </p>
          <div
            className={`rounded-2xl px-4 py-3 ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="markdown-content prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    // Customize code blocks
                    code({ node, inline, className, children, ...props }) {
                      return inline ? (
                        <code className="bg-gray-200 px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto">
                          <code {...props}>{children}</code>
                        </pre>
                      );
                    },
                    // Customize links
                    a({ node, children, ...props }) {
                      return (
                        <a
                          className="text-blue-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-400 mt-1">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
