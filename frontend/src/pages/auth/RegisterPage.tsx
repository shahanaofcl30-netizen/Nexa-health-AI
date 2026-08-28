import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { AlertCircle, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

// Premium registration page with glass-morphism and role selection
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerPatient, registerDoctor, isLoading } = useAuthStore();

  const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // doctor‑specific fields
    licenseNumber: '',
    specialization: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = (): string | null => {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'First and last name are required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return 'Please enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
      return 'Password must contain at least one letter and one number.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (role === 'doctor' && !form.licenseNumber.trim()) return 'License / Doctor ID is required.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (role === 'patient') {
      const result = await registerPatient({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      if (result.success) {
        if ((result as any).emailConfirmationRequired) {
          setSuccess('Account created. Please verify your email before signing in.');
        } else {
          setSuccess('Registration successful! Redirecting to login…');
          setTimeout(() => navigate('/login'), 2000);
        }
      } else {
        setError(
          result.error?.includes('already')
            ? 'An account with this email already exists. Please sign in instead.'
            : result.error || 'Registration failed. Please try again.'
        );
      }
    } else if (role === 'doctor') {
      const result = await registerDoctor({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        licenseNumber: form.licenseNumber,
        specialization: form.specialization,
      });
      if (result.success) {
        if ((result as any).emailConfirmationRequired) {
          setSuccess('Account created. Please verify your email before signing in.');
        } else {
          setSuccess('Doctor account submitted! An admin will verify your credentials. Redirecting…');
          setTimeout(() => navigate('/login'), 3000);
        }
      } else {
        setError(
          result.error?.includes('already')
            ? 'An account with this email already exists. Please sign in instead.'
            : result.error || 'Doctor registration failed. Please check your details.'
        );
      }
    } else {
      // Admin registration — goes through patient register path with role override handled by Supabase metadata
      const result = await registerPatient({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      if (result.success) {
        if ((result as any).emailConfirmationRequired) {
          setSuccess('Account created. Please verify your email before signing in.');
        } else {
          setSuccess('Admin account request submitted! Please contact a Super Admin to approve your admin role. Redirecting…');
          setTimeout(() => navigate('/login'), 3000);
        }
      } else {
        setError(
          result.error?.includes('already')
            ? 'An account with this email already exists. Please sign in instead.'
            : result.error || 'Registration failed. Please try again.'
        );
      }
    }
  };

  // If already logged in, redirect home
  const { currentUser } = useAuthStore();
  if (currentUser) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-lg glass-card backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-xl animate-in fade-in-90">
        <h1 className="text-3xl font-bold text-center text-white mb-2">Nexa Health AI</h1>
        <h2 className="text-xl text-center text-gray-300 mb-6">Create Your Account</h2>
        {/* Role toggle */}
        <div className="flex justify-center space-x-2 mb-4">
          {(['patient', 'doctor', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-4 py-1 rounded-full text-sm transition-colors duration-200 ${role === r ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        {role === 'admin' && (
          <div className="mb-3 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2 text-center">
            Admin accounts require Super Admin approval after registration.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-2">
            <input
              name="firstName"
              placeholder="First Name"
              value={form.firstName}
              onChange={handleChange}
              className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              required
            />
            <input
              name="lastName"
              placeholder="Last Name"
              value={form.lastName}
              onChange={handleChange}
              className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              required
            />
          </div>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
          />
          <input
            name="phone"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={handleChange}
            className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {role === 'doctor' && (
            <>
              <input
                name="licenseNumber"
                placeholder="License / Doctor ID"
                value={form.licenseNumber}
                onChange={handleChange}
                className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                required
              />
              <input
                name="specialization"
                placeholder="Specialization"
                value={form.specialization}
                onChange={handleChange}
                className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </>
          )}
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="glass-input w-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-3 py-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-md px-3 py-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
            <span>{isLoading ? 'Creating…' : 'Create Account'}</span>
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-400">
          <Link to="/login" className="hover:underline hover:text-gray-200 transition">Already have an account? Sign In</Link>
        </div>
      </div>
    </div>
  );
};
