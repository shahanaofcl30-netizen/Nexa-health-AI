import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';

// Premium Forgot Password page with glass‑morphism UI
export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { forgotPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const result = await forgotPassword(email);
    if (result.success) {
      setMessage(result.message || 'Password reset link sent. Please check your email.');
      // Optionally redirect to login after a short delay
      setTimeout(() => navigate('/login'), 3000);
    } else {
      setError(result.error || 'Failed to send reset link');
    }
  };

  // If already authenticated, redirect home
  const { currentUser } = useAuthStore();
  if (currentUser) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md glass-card backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl animate-in fade-in-90">
        <h1 className="text-3xl font-bold text-center text-white mb-2">Nexa Health AI</h1>
        <h2 className="text-xl text-center text-gray-300 mb-6">Forgot Password</h2>
        <p className="text-center text-gray-400 mb-4">
          Enter your registered email address to receive a password reset link.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            <span>{isLoading ? 'Sending…' : 'Send Reset Link'}</span>
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-400">
          <a href="/login" className="hover:underline">Back to Sign In</a>
        </div>
      </div>
    </div>
  );
};
