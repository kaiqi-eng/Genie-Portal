import UserActions from './UserActions';

function UserTable({ users, loading, currentUserId, onAction, actionLoading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Joined
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {user.name?.charAt(0) || user.email?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{user.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  {user.id === currentUserId && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isApproved
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {user.isApproved ? 'Approved' : 'Pending'}
                </span>
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isAdmin
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.isAdmin ? 'Admin' : 'User'}
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-4">
                <UserActions
                  user={user}
                  currentUserId={currentUserId}
                  onAction={onAction}
                  loading={actionLoading === user.id}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;
