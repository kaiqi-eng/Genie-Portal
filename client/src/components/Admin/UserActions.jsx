import { useState, useRef, useEffect } from 'react';

function UserActions({ user, currentUserId, onAction, loading }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const isCurrentUser = user.id === currentUserId;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action) => {
    setShowMenu(false);
    onAction(action, user.id);
  };

  if (loading) {
    return (
      <div className="flex justify-end">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="relative flex justify-end" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          {/* Approve/Revoke */}
          {!isCurrentUser && (
            <>
              {user.isApproved ? (
                <button
                  onClick={() => handleAction('revoke')}
                  className="w-full text-left px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Revoke Access
                </button>
              ) : (
                <button
                  onClick={() => handleAction('approve')}
                  className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Approve Access
                </button>
              )}
            </>
          )}

          {/* Promote/Demote */}
          {!isCurrentUser && user.isApproved && (
            <>
              {user.isAdmin ? (
                <button
                  onClick={() => handleAction('demote')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Remove Admin
                </button>
              ) : (
                <button
                  onClick={() => handleAction('promote')}
                  className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Make Admin
                </button>
              )}
            </>
          )}

          {/* Delete */}
          {!isCurrentUser && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => handleAction('delete')}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete User
              </button>
            </>
          )}

          {isCurrentUser && (
            <p className="px-4 py-2 text-sm text-gray-400 italic">
              Cannot modify your own account
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default UserActions;
