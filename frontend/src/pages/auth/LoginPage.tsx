import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { AlertCircle, Loader2, ArrowRight, UserPlus } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isLoading, currentUser } = useAuthStore();

  const [emailOrDoctorId, setEmailOrDoctorId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailOrDoctorId(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

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

  if (currentUser) {
    navigate('/', { replace: true });
    return null;
  }

  const inputClassName = "w-full px-4 py-2 bg-white text-slate-900 border border-secondary rounded-md placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-white border border-secondary rounded-2xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-center text-slate-900 mb-2">Nexa Health AI</h1>
        <h2 className="text-xl text-center text-slate-600 mb-6">Welcome Back</h2>
        <p className="text-center text-slate-500 mb-4 font-semibold">Sign in to your account</p>

        <div className="flex justify-center space-x-2 mb-4">
          {['patient', 'doctor', 'admin'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r as any);
                if (error) setError(null);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors duration-200 ${
                role === r ? 'bg-primary text-white shadow-sm' : 'bg-secondary/30 text-slate-600 hover:bg-secondary/50'
              }`}
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
            onChange={handleEmailChange}
            className={inputClassName}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={handlePasswordChange}
            className={inputClassName}
            required
            autoComplete="current-password"
          />
          {error && (
            <div className="flex items-center text-sm text-critical space-x-1 bg-critical/10 border border-critical/20 rounded-md px-3 py-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-md font-bold transition shadow-sm disabled:opacity-50 mt-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            <span>{isLoading ? 'Signing In…' : 'Sign In'}</span>
          </button>
        </form>

        <div className="my-6 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-secondary after:mt-0.5 after:flex-1 after:border-t after:border-secondary">
          <p className="mx-4 mb-0 text-center font-bold text-slate-400 text-sm">OR</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-secondary/20 border border-secondary text-slate-700 rounded-md font-bold transition shadow-sm disabled:opacity-50 mb-4"
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

        <div className="mt-4">
          <Link
            to="/register"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 hover:border-primary/50 hover:bg-primary/20 text-primary rounded-md font-bold transition shadow-sm"
          >
            <UserPlus size={18} />
            <span>Create Account / Register</span>
          </Link>
        </div>

        {/* Quick Demo Login Fill Buttons */}
        <div className="mt-6 pt-4 border-t border-secondary">
          <p className="text-center text-xs font-bold text-slate-500 mb-2">Quick Sign-In Access</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={async () => {
                setError(null);
                setRole('doctor');
                setEmailOrDoctorId('dr.chen@nexahealth.ai');
                setPassword('password123');
                const res = await login({ emailOrDoctorId: 'dr.chen@nexahealth.ai', password: 'password123', role: 'doctor' });
                if (res.success) navigate('/', { replace: true });
              }}
              className="py-1.5 px-2 text-xs font-bold bg-secondary/20 hover:bg-secondary/40 border border-secondary text-slate-800 rounded-lg transition-colors"
            >
              👩‍⚕️ Doctor Sign-In
            </button>
            <button
              type="button"
              onClick={async () => {
                setError(null);
                setRole('patient');
                setEmailOrDoctorId('emily.davis@patient.nexa.ai');
                setPassword('password123');
                const res = await login({ emailOrDoctorId: 'emily.davis@patient.nexa.ai', password: 'password123', role: 'patient' });
                if (res.success) navigate('/', { replace: true });
              }}
              className="py-1.5 px-2 text-xs font-bold bg-secondary/20 hover:bg-secondary/40 border border-secondary text-slate-800 rounded-lg transition-colors"
            >
              🏥 Patient Sign-In
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-xs font-bold text-slate-500">
          <Link to="/forgot-password" className="hover:text-primary transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
};

