import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { AlertCircle, Loader2, ArrowRight, UserPlus } from 'lucide-react';

// Premium UI with glassmorphism, gradient background, microâ€‘animations
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isLoading, currentUser } = useAuthStore();

  const [emailOrDoctorId, setEmailOrDoctorId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!emailOrDoctorId.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    const result = await login({ emailOrDoctorId, password, role, rememberMe: true });
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const result = await loginWithGoogle(role);
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Google login failed');
    }
  };

  // If already logged in, redirect to home
  if (currentUser) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md glass-card backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl animate-in fade-in-90">
        <h1 className="text-3xl font-bold text-center text-white mb-2">Nexa Health AI</h1>
        <h2 className="text-xl text-center text-gray-300 mb-6">Welcome Back</h2>
        <p className="text-center text-gray-400 mb-4">Sign in to your account</p>

        {/* Role selection toggle */}
        <div className="flex justify-center space-x-2 mb-4">
          {['patient', 'doctor', 'admin'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r as any)}
              className={`px-4 py-1 rounded-full text-sm transition-colors duration-200 ${role === r ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'} `}
            >
              {r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder={role === 'doctor' ? 'Email or Doctor ID / License' : 'Email Address'}
            value={emailOrDoctorId}
            onChange={(e) => setEmailOrDoctorId(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
            autoComplete="current-password"
          />
          {error && (
            <div className="flex items-center text-sm text-red-400 space-x-1 bg-red-400/10 rounded-md px-3 py-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            <span>{isLoading ? 'Signing Inâ€¦' : 'Sign In'}</span>
          </button>
        </form>

        {/* Google Login Divider */}
        <div className="my-6 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-white/10 after:mt-0.5 after:flex-1 after:border-t after:border-white/10">
          <p className="mx-4 mb-0 text-center font-semibold text-gray-400 text-sm">OR</p>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-md font-medium transition disabled:opacity-50 mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Register link */}
        <div className="mt-3">
          <Link
            to="/register"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent border border-indigo-500/50 hover:border-indigo-400 hover:bg-indigo-600/10 text-indigo-300 hover:text-indigo-200 rounded-md font-medium transition"
          >
            <UserPlus size={18} />
            <span>Create Account / Register</span>
          </Link>
        </div>

        <div className="mt-3 text-center text-sm text-gray-400">
          <Link to="/forgot-password" className="hover:underline hover:text-gray-200 transition">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
};

