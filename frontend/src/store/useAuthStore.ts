import { create } from 'zustand';
import { UserProfile, UserRole } from '../types/shared';

import api from '../services/api';
import { queryClient } from '../services/queryClient';

export interface PatientRegisterData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface DoctorRegisterData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  doctorId?: string;
  licenseNumber?: string;
  specialization?: string;
  qualification?: string;
  experience?: string;
  password?: string;
  confirmPassword?: string;
}

interface AuthState {
  currentUser: UserProfile | null;
  activeRole: UserRole;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (credentials: {
    emailOrDoctorId: string;
    password?: string;
    role?: 'patient' | 'doctor' | 'admin';
    rememberMe?: boolean;
  }) => Promise<{ success: boolean; error?: string; verificationStatus?: string; user?: UserProfile }>;
  loginWithGoogle: (role?: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  registerPatient: (data: PatientRegisterData) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  registerDoctor: (data: DoctorRegisterData) => Promise<{ success: boolean; error?: string; verificationStatus?: string; user?: UserProfile }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (password: string, token?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  setRole: (role: UserRole) => Promise<void>;
  setUser: (user: UserProfile) => void;
  fetchCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
  initAuthListener: () => () => void;
}

const getInitialUser = (): UserProfile | null => {
  const savedUser = localStorage.getItem('nexa_user_profile') || sessionStorage.getItem('nexa_user_profile');
  if (savedUser) {
    try {
      return JSON.parse(savedUser);
    } catch {
      // ignore
    }
  }
  return null;
};

const getInitialToken = (): string | null => {
  return localStorage.getItem('nexa_token') || sessionStorage.getItem('nexa_token') || null;
};

const getInitialRole = (): UserRole => {
  return (
    (localStorage.getItem('nexa_active_role') as UserRole) ||
    (sessionStorage.getItem('nexa_active_role') as UserRole) ||
    'patient'
  );
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: getInitialUser(),
  activeRole: getInitialRole(),
  token: getInitialToken(),
  isLoading: false,
  isInitialized: false,

  login: async ({ emailOrDoctorId, password = '', role, rememberMe = true }) => {
    set({ isLoading: true });
    const cleanIdentifier = emailOrDoctorId.trim();

    if (!cleanIdentifier || !password) {
      set({ isLoading: false });
      return { success: false, error: 'Please enter your email and password.' };
    }

    // -------------------------------------------------------------
    // 1. Firebase Authentication
    // -------------------------------------------------------------
    try {
      let authEmail = cleanIdentifier;
      
      // If not a standard email format, resolve doctor ID / license to email
      if (!cleanIdentifier.includes('@')) {
        try {
          const res = await api.get(`/doctors?licenseNumber=${cleanIdentifier}`);
          if (res.data && res.data.length > 0 && res.data[0].email) {
            authEmail = res.data[0].email;
          }
        } catch {
          // ignore
        }
      }

      // 1. Sign in with Firebase
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      
      const userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
      const firebaseToken = await userCredential.user.getIdToken();
      
      // 2. Exchange Firebase Token for Supabase Custom JWT and Profile
      const res = await api.post('/auth/firebase-exchange', { firebaseToken, role });
      const { token, user: dbProfile, role: actualRole } = res.data;

      // 3. Apply profile to auth store
      let doctorVerificationStatus = 'approved';
      if (actualRole === 'doctor') {
        if (dbProfile.verificationStatus) {
          doctorVerificationStatus = dbProfile.verificationStatus;
        }
        if (doctorVerificationStatus === 'pending') {
          set({ isLoading: false });
          return {
            success: false,
            error: 'Your doctor account is waiting for admin approval.',
            verificationStatus: 'pending',
          };
        }
      }

      const userProfile: UserProfile = {
        id: dbProfile.id,
        email: dbProfile.email,
        role: actualRole,
        firstName: dbProfile.first_name || dbProfile.full_name?.split(' ')[0] || 'User',
        lastName: dbProfile.last_name || dbProfile.full_name?.split(' ').slice(1).join(' ') || '',
        phone: dbProfile.phone || '',
        avatarUrl: dbProfile.avatar_url,
        verificationStatus: doctorVerificationStatus as any,
        isActive: dbProfile.is_active !== false,
        createdAt: dbProfile.created_at || new Date().toISOString(),
        updatedAt: dbProfile.updated_at || new Date().toISOString(),
      };

      // Session persistence
      if (rememberMe) {
        localStorage.setItem('nexa_token', token);
        localStorage.setItem('nexa_active_role', userProfile.role);
        localStorage.setItem('nexa_active_user_id', userProfile.id);
        localStorage.setItem('nexa_user_profile', JSON.stringify(userProfile));
      } else {
        sessionStorage.setItem('nexa_token', token);
        sessionStorage.setItem('nexa_active_role', userProfile.role);
        sessionStorage.setItem('nexa_active_user_id', userProfile.id);
        sessionStorage.setItem('nexa_user_profile', JSON.stringify(userProfile));
      }

      set({
        currentUser: userProfile,
        activeRole: userProfile.role,
        token,
        isLoading: false,
      });

      return { success: true, user: userProfile };
    } catch (err: any) {
      console.warn('Firebase Auth error, checking fallback:', err);
      // Let it fall through to API fallback below if Firebase fails
    }

    // -------------------------------------------------------------
    // 2. Offline / API Fallback Auth
    // -------------------------------------------------------------
    try {
      const res = await api.post('/auth/login', {
        emailOrDoctorId: cleanIdentifier,
        password,
        role,
      });

      const { token, user, verificationStatus } = res.data;

      if (user.role === 'doctor' && (verificationStatus === 'pending' || user.verificationStatus === 'pending')) {
        set({ isLoading: false });
        return {
          success: false,
          error: 'Your doctor account is waiting for admin approval.',
          verificationStatus: 'pending',
        };
      }

      if (rememberMe) {
        localStorage.setItem('nexa_token', token);
        localStorage.setItem('nexa_active_role', user.role);
        localStorage.setItem('nexa_active_user_id', user.id);
        localStorage.setItem('nexa_user_profile', JSON.stringify(user));
      } else {
        sessionStorage.setItem('nexa_token', token);
        sessionStorage.setItem('nexa_active_role', user.role);
        sessionStorage.setItem('nexa_active_user_id', user.id);
        sessionStorage.setItem('nexa_user_profile', JSON.stringify(user));
      }

      set({
        currentUser: user,
        activeRole: user.role,
        token,
        isLoading: false,
      });

      return { success: true, user };
    } catch (err: any) {
      set({ isLoading: false });
      let errorMsg = 'Invalid email or password.';
      if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = 'Unable to connect. Please try again.';
      }

      return {
        success: false,
        error: errorMsg,
        verificationStatus: err.response?.data?.verificationStatus,
      };
    }
  },

  loginWithGoogle: async (role?: string) => {
    set({ isLoading: true });
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseToken = await userCredential.user.getIdToken();
      
      // Exchange Firebase Token for Supabase Custom JWT and Profile
      // For Google Sign-in, we default to patient role
      const res = await api.post('/auth/firebase-exchange', { 
        firebaseToken,
        role: role || 'patient', 
        firstName: userCredential.user.displayName?.split(' ')[0],
        lastName: userCredential.user.displayName?.split(' ').slice(1).join(' ')
      });
      
      const { token, user: userProfile } = res.data;

      // Session persistence
      localStorage.setItem('nexa_token', token);
      localStorage.setItem('nexa_active_role', userProfile.role);
      localStorage.setItem('nexa_active_user_id', userProfile.id);
      localStorage.setItem('nexa_user_profile', JSON.stringify(userProfile));

      set({
        currentUser: userProfile,
        activeRole: userProfile.role,
        token,
        isLoading: false,
      });

      return { success: true, user: userProfile };
    } catch (err: any) {
      console.warn('[Firebase Google Sign-In Error, falling back to API]:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        set({ isLoading: false });
        return { success: false, error: 'Google sign-in was cancelled.' };
      }
      
      // ── Fallback: Dummy login for demo/offline purposes ─────────────────────
      try {
        const res = await api.post('/auth/login', { role: role || 'patient' });
        const { token, user: userProfile } = res.data;

        localStorage.setItem('nexa_token', token);
        localStorage.setItem('nexa_active_role', userProfile.role);
        localStorage.setItem('nexa_active_user_id', userProfile.id);
        localStorage.setItem('nexa_user_profile', JSON.stringify(userProfile));

        set({
          currentUser: userProfile,
          activeRole: userProfile.role,
          token,
          isLoading: false,
        });

        return { success: true, user: userProfile };
      } catch (fallbackErr: any) {
        set({ isLoading: false });
        return { success: false, error: 'Google sign-in and fallback failed.' };
      }
    }
  },

  registerPatient: async (data) => {
    set({ isLoading: true });
    const fullName = data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ') || data.lastName || '';
    const email = data.email.trim();
    const password = data.password || '';

    // ── Firebase Auth Signup ──────────────────────────────────────────────────
    try {
      if (password) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseToken = await userCredential.user.getIdToken();
        
        // 2. Exchange Firebase Token for Supabase Custom JWT and create Profile
        const res = await api.post('/auth/firebase-exchange', { 
          firebaseToken,
          role: 'patient',
          firstName,
          lastName
        });
        
        const { token, user: userProfile } = res.data;

        // Session persistence
        localStorage.setItem('nexa_token', token);
        localStorage.setItem('nexa_active_role', 'patient');
        localStorage.setItem('nexa_active_user_id', userProfile.id);
        localStorage.setItem('nexa_user_profile', JSON.stringify(userProfile));

        set({ currentUser: userProfile, activeRole: 'patient', token, isLoading: false });
        return { success: true, user: userProfile };
      }
    } catch (err: any) {
      console.warn('[Firebase signup exception, falling back to API]:', err);
      // If Firebase fails (e.g. email already in use), we can just return the Firebase error
      if (err.code === 'auth/email-already-in-use') {
        set({ isLoading: false });
        return { success: false, error: 'An account with this email already exists.' };
      }
    }

    // ── Fallback: Express API Register ───────────────────────────────────────
    try {
      const res = await api.post('/auth/register', {
        fullName,
        firstName: firstName || 'Patient',
        lastName,
        email,
        phone: data.phone,
        password,
        role: 'patient',
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
      });

      const { token, user } = res.data;
      localStorage.setItem('nexa_token', token);
      localStorage.setItem('nexa_active_role', user.role);
      localStorage.setItem('nexa_active_user_id', user.id);
      localStorage.setItem('nexa_user_profile', JSON.stringify(user));

      set({ currentUser: user, activeRole: user.role, token, isLoading: false });
      return { success: true, user };
    } catch (err: any) {
      set({ isLoading: false });
      console.error('[API register error]', err.response?.data);
      return {
        success: false,
        error: err.response?.data?.error || 'Registration failed. Please try again.',
      };
    }
  },

  registerDoctor: async (data) => {
    set({ isLoading: true });
    const fullName = data.fullName || `Dr. ${data.firstName || ''} ${data.lastName || ''}`.trim();
    const cleanFullName = fullName.startsWith('Dr. ') ? fullName : `Dr. ${fullName}`;
    const [firstName, ...rest] = cleanFullName.replace(/^Dr\.\s*/, '').split(' ');
    const lastName = rest.join(' ') || data.lastName || '';
    const email = data.email.trim();
    const password = data.password || '';
    const doctorId = data.doctorId || data.licenseNumber || `TN-REG-${Math.floor(10000 + Math.random() * 90000)}`;

    // ── Firebase Auth Signup ──────────────────────────────────────────────────
    try {
      if (password) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseToken = await userCredential.user.getIdToken();
        
        // Exchange Firebase Token for Supabase Custom JWT and create Profile
        const res = await api.post('/auth/firebase-exchange', { 
          firebaseToken,
          role: 'doctor',
          firstName,
          lastName
        });
        
        const { token, user: userProfile } = res.data;

        set({ isLoading: false });
        return {
          success: true,
          verificationStatus: 'pending',
          user: userProfile,
        };
      }
    } catch (err: any) {
      console.warn('[Firebase doctor signup exception, falling back to API]:', err);
      if (err.code === 'auth/email-already-in-use') {
        set({ isLoading: false });
        return { success: false, error: 'An account with this email already exists.' };
      }
    }

    // Fallback API Register
    try {
      const res = await api.post('/auth/register', {
        fullName: cleanFullName,
        firstName,
        lastName,
        email,
        phone: data.phone,
        licenseNumber: doctorId,
        doctorId,
        specialization: data.specialization || 'General Medicine',
        qualification: data.qualification || 'MBBS, MD',
        password,
        role: 'doctor',
      });

      const { user, verificationStatus } = res.data;
      set({ isLoading: false });

      return {
        success: true,
        verificationStatus: verificationStatus || 'pending',
        user,
      };
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        error: err.response?.data?.error || 'Doctor registration failed. Please check your credentials.',
      };
    }
  },

  forgotPassword: async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your registered email address.' };
    }

    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        message: 'Password reset link has been sent to your email.',
      };
    } catch (err: any) {
      console.warn('Firebase reset password error, checking fallback:', err);
      try {
        const res = await api.post('/auth/forgot-password', { email: cleanEmail });
        return { success: true, message: res.data.message || 'Password reset link has been sent to your email.' };
      } catch (fallbackErr: any) {
        return {
          success: false,
          error: fallbackErr.response?.data?.error || 'Failed to send password reset email.',
        };
      }
    }
  },

  resetPassword: async (password: string, token?: string) => {
    // Reset password in Firebase is usually handled via OOB link sent to email,
    // which redirects to an action URL where Firebase handles the actual reset.
    // However, if we need to call it manually via API:
    return { success: false, error: 'Please use the link sent to your email to reset your password.' };
  },

  setRole: async (role: UserRole) => {
    localStorage.setItem('nexa_active_role', role);
    set({ activeRole: role, isLoading: true });

    try {
      const res = await api.post('/auth/login', { role });
      if (res.data.user) {
        localStorage.setItem('nexa_active_user_id', res.data.user.id);
        localStorage.setItem('nexa_token', res.data.token);
        localStorage.setItem('nexa_user_profile', JSON.stringify(res.data.user));
        set({ currentUser: res.data.user, token: res.data.token, isLoading: false });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  setUser: (user: UserProfile) => {
    set({ currentUser: user, activeRole: user.role });
    localStorage.setItem('nexa_active_role', user.role);
    localStorage.setItem('nexa_active_user_id', user.id);
    localStorage.setItem('nexa_user_profile', JSON.stringify(user));
  },

  fetchCurrentUser: async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.user) {
        set({ currentUser: res.data.user, activeRole: res.data.user.role });
        localStorage.setItem('nexa_user_profile', JSON.stringify(res.data.user));
      }
    } catch (err) {
      // ignore
    }
  },

  logout: async () => {
    // 1. Sign out from Firebase
    try {
      const { signOut } = await import('firebase/auth');
      const { auth } = await import('../lib/firebase');
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }

    // 2. Clear authentication state
    set({ currentUser: null, token: null, activeRole: 'patient' });

    // 3. Clear protected React Query cache
    queryClient.clear();

    // 4. Clear storage
    localStorage.removeItem('nexa_token');
    localStorage.removeItem('nexa_active_role');
    localStorage.removeItem('nexa_active_user_id');
    localStorage.removeItem('nexa_user_profile');
    sessionStorage.clear();
  },

  initAuthListener: () => {
    let unsubscribe = () => {};
    
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      import('../lib/firebase').then(({ auth }) => {
        unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Firebase user is signed in.
            // If we don't have a token, we might need to exchange it again if the page refreshed.
            // Check if we already have the Supabase custom JWT in localStorage.
            const savedToken = localStorage.getItem('nexa_token');
            const savedProfileStr = localStorage.getItem('nexa_user_profile');
            
            if (savedToken && savedProfileStr) {
              try {
                const savedProfile = JSON.parse(savedProfileStr);
                set({
                  currentUser: savedProfile,
                  activeRole: savedProfile.role,
                  token: savedToken,
                  isInitialized: true,
                });
                return;
              } catch {
                // ignore
              }
            }
            
            // If we don't have the profile, exchange token again
            try {
              const firebaseToken = await user.getIdToken();
              const res = await api.post('/auth/firebase-exchange', { firebaseToken });
              const { token, user: userProfile } = res.data;
              
              localStorage.setItem('nexa_token', token);
              localStorage.setItem('nexa_active_role', userProfile.role);
              localStorage.setItem('nexa_active_user_id', userProfile.id);
              localStorage.setItem('nexa_user_profile', JSON.stringify(userProfile));
              
              set({
                currentUser: userProfile,
                activeRole: userProfile.role,
                token,
                isInitialized: true,
              });
            } catch (error) {
              set({ isInitialized: true });
            }
          } else {
            // User is signed out
            set({ currentUser: null, token: null, activeRole: 'patient', isInitialized: true });
            queryClient.clear();
            localStorage.removeItem('nexa_token');
            localStorage.removeItem('nexa_active_role');
            localStorage.removeItem('nexa_active_user_id');
            localStorage.removeItem('nexa_user_profile');
            sessionStorage.clear();
          }
        });
      });
    });

    return () => unsubscribe();
  },
}));
