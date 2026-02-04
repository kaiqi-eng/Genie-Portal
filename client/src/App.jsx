import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Admin from './pages/Admin';

// Protected route wrapper
const ProtectedRoute = ({ children, requireApproval = true, requireAdmin = false }) => {
  const { isAuthenticated, isApproved, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireApproval && !isApproved) {
    return <Navigate to="/login?error=not_approved" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

export default App;
