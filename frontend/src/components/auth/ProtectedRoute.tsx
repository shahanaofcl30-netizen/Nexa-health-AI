import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../types/shared';
import { Clock, LogOut, ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { currentUser, token, isInitialized, logout } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-slate-600 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // 1. Check Authentication
  if (!token || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check Doctor Verification Status
  if (currentUser.role === 'doctor' && currentUser.verificationStatus === 'pending') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl glass-card border border-amber-500/40 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border-2 border-amber-500 mx-auto flex items-center justify-center animate-pulse">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Verification Required
            </span>
            <h2 className="text-2xl font-black text-white">Your doctor account is pending admin verification.</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your medical credentials have been submitted. For clinical security and patient safety, an authorized Super Admin must verify your credentials before clinical access is granted.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Doctor Name:</span>
              <span className="font-bold text-white">Dr. {currentUser.firstName} {currentUser.lastName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Registered Email:</span>
              <span className="font-mono text-cyan-300">{currentUser.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Approval Status:</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px]">
                PENDING APPROVAL
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={async () => {
                await logout();
                window.location.href = '/login';
              }}
              className="w-full px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out to Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Check Role Authorization & Smart Cross-Role Redirection
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = currentUser.role;

    // Super Admin has universal access
    if (userRole !== 'super_admin' && !allowedRoles.includes(userRole)) {
      // Patient trying to access doctor dashboard -> redirect to patient dashboard
      if (userRole === 'patient') {
        return <Navigate to="/patient/dashboard" replace />;
      }
      // Doctor trying to access patient portal -> redirect to doctor dashboard
      if (userRole === 'doctor') {
        return <Navigate to="/doctor/dashboard" replace />;
      }
      // Other roles default to home
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
