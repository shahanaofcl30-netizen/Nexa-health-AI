import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';

// Premium Reset Password page with glass‑morphism UI
export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, isLoading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Extract token from query parameters (e.g., /reset-password?token=abc123)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const result = await resetPassword(password, token ?? undefined);
    if (result.success) {
      setMessage(result.message || 'Password updated successfully');
      setTimeout(() => navigate('/login'), 2500);
    } else {
      setError(result.error || 'Failed to reset password');
    }
  };

  // Redirect logged‑in users away from reset flow
  const { currentUser } = useAuthStore();
  if (currentUser) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md glass-card backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl animate-in fade-in-90">
        <h1 className="text-3xl font-bold text-center text-white mb-2">Nexa Health AI</h1>
        <h2 className="text-xl text-center text-gray-300 mb-6">Reset Password</h2>
        <p className="text-center text-gray-400 mb-4">
          Choose a new password for your account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
          />
          {error && (
            <div className="flex items-center text-sm text-red-400 space-x-1">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="flex items-center text-sm text-green-400 space-x-1">
              <span>{message}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            <span>{isLoading ? 'Updating…' : 'Reset Password'}</span>
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-400">
          <a href="/login" className="hover:underline">Back to Sign In</a>
        </div>
      </div>
    </div>
  );
};
