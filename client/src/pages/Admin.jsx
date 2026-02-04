import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';
import UserTable from '../components/Admin/UserTable';

function Admin() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search,
        filter,
      });
      setUsers(response.data.users);
      setPagination((prev) => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleAction = async (action, userId) => {
    setActionLoading(userId);
    try {
      switch (action) {
        case 'approve':
          await adminApi.approveUser(userId);
          break;
        case 'revoke':
          await adminApi.revokeUser(userId);
          break;
        case 'promote':
          await adminApi.promoteUser(userId);
          break;
        case 'demote':
          await adminApi.demoteUser(userId);
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this user?')) {
            await adminApi.deleteUser(userId);
          } else {
            setActionLoading(null);
            return;
          }
          break;
        default:
          break;
      }
      fetchUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      alert(error.response?.data?.error || `Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/chat"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Chat
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">
                  {user?.name?.charAt(0)}
                </div>
              )}
              <span className="text-sm text-gray-700">{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value={pagination.total}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <StatCard
            label="Approved"
            value={users.filter((u) => u.isApproved).length}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Pending"
            value={users.filter((u) => !u.isApproved).length}
            color="yellow"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Admins"
            value={users.filter((u) => u.isAdmin).length}
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Search
              </button>
            </form>

            <div className="flex gap-2">
              {['all', 'approved', 'pending', 'admin'].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <UserTable
            users={users}
            loading={loading}
            currentUserId={user?.id}
            onAction={handleAction}
            actionLoading={actionLoading}
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-700">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color = 'gray' }) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default Admin;
