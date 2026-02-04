import { useState } from 'react';
import { Link } from 'react-router-dom';

function Sidebar({
  conversations,
  activeConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onToggle,
  user,
  onLogout,
  isAdmin,
  loading,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-30 w-72 bg-chat-sidebar text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <button
            onClick={onNewConversation}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-600 rounded-lg hover:bg-chat-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
          <button
            onClick={onToggle}
            className="ml-2 p-2 hover:bg-chat-hover rounded-lg lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversation?.id === conversation.id}
                onClick={() => onSelectConversation(conversation)}
                onDelete={() => onDeleteConversation(conversation.id)}
              />
            ))
          )}
        </div>

        {/* User Menu */}
        <div className="border-t border-gray-700 p-4">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-chat-hover transition-colors"
            >
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-4 py-3 hover:bg-gray-700 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-700 transition-colors text-red-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ConversationItem({ conversation, isActive, onClick, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={`group relative mx-2 my-1 rounded-lg cursor-pointer ${
        isActive ? 'bg-chat-hover' : 'hover:bg-chat-hover'
      }`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-3 pr-10"
      >
        <p className="text-sm truncate">{conversation.title}</p>
      </button>

      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-600 rounded"
        >
          <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Sidebar;
