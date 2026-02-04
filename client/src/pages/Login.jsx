import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginButton from '../components/Auth/LoginButton';

function Login() {
  const { isAuthenticated, isApproved, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (!loading && isAuthenticated && isApproved) {
      navigate('/chat');
    }
  }, [isAuthenticated, isApproved, loading, navigate]);

  const getErrorMessage = () => {
    switch (error) {
      case 'not_approved':
        return 'Your account is pending approval. Please contact an administrator.';
      case 'auth_failed':
        return 'Authentication failed. Please try again.';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Genie Portal</h1>
          <p className="text-gray-600">Sign in to access the AI assistant</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8">
          <LoginButton />
          <p className="mt-6 text-center text-xs text-gray-500">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Need access? Contact your administrator.
        </p>
      </div>
    </div>
  );
}

export default Login;
