import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { useAuthStore } from './store/useAuthStore';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Main Application Pages
import { ClinicalDashboard } from './pages/dashboard/ClinicalDashboard';
import { FindHospitalPage } from './pages/hospital/FindHospitalPage';
import { HospitalDetailsPage } from './pages/hospital/HospitalDetailsPage';
import { BookAppointmentFlowPage } from './pages/appointment/BookAppointmentFlowPage';
import { DoctorConsultationPage } from './pages/clinical/DoctorConsultationPage';
import { PatientTreatmentsPage } from './pages/patient/PatientTreatmentsPage';
import { PatientDirectoryPage } from './pages/patient/PatientDirectoryPage';
import { PatientProfilePage } from './pages/patient/PatientProfilePage';
import { PatientPortalPage } from './pages/patient/PatientPortalPage';
import { AppointmentsPage } from './pages/appointment/AppointmentsPage';
import { SoapNotesPage } from './pages/clinical/SoapNotesPage';
import { PrescriptionsPage } from './pages/prescription/PrescriptionsPage';
import { LabManagementPage } from './pages/lab/LabManagementPage';
import { BillingManagementPage } from './pages/billing/BillingManagementPage';
import { TelehealthRoomPage } from './pages/telehealth/TelehealthRoomPage';
import { PharmacyFinderPage } from './pages/pharmacy/PharmacyFinderPage';
import { ClinicalAlertsPage } from './pages/alerts/ClinicalAlertsPage';
import { PracticeAnalyticsPage } from './pages/admin/PracticeAnalyticsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { MedicalRecordsVaultPage } from './pages/admin/MedicalRecordsVaultPage';
import { MedicationRemindersPage } from './pages/patient/MedicationRemindersPage';
import { AdminHospitalManagementPage } from './pages/admin/AdminHospitalManagementPage';

// Smart Role-Based Home Dispatcher
const HomeRedirector: React.FC = () => {
  const { currentUser, token, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B101E]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-brand-300 font-mono text-sm tracking-wider">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!token || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'patient') {
    return <Navigate to="/patient/dashboard" replace />;
  }

  if (currentUser.role === 'doctor') {
    return <Navigate to="/doctor/dashboard" replace />;
  }

  if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
    return <Navigate to="/admin/analytics" replace />;
  }

  return <Navigate to="/patient/dashboard" replace />;
};

export const App: React.FC = () => {
  const { initAuthListener } = useAuthStore();

  // Initialize Supabase Auth Session listener on app lifecycle
  useEffect(() => {
    const unsubscribe = initAuthListener();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [initAuthListener]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Application Routes Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppLayout />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            {/* Intelligent Home Dispatcher */}
            <Route index element={<HomeRedirector />} />

            {/* Role-Specific Primary Dashboards */}
            <Route
              path="patient/dashboard"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PatientPortalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="patient-portal"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <PatientPortalPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="doctor/dashboard"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'super_admin']}>
                  <ClinicalDashboard />
                </ProtectedRoute>
              }
            />

            {/* Healthcare Network & Discovery */}
            <Route path="hospitals" element={<FindHospitalPage />} />
            <Route path="hospitals/:id" element={<HospitalDetailsPage />} />
            <Route path="find-hospital" element={<FindHospitalPage />} />
            <Route
              path="admin/hospitals"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <AdminHospitalManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Appointment & Encounter Scheduling */}
            <Route path="book-appointment" element={<BookAppointmentFlowPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />

            {/* Clinical Consultations & Doctor Tools */}
            <Route
              path="consultations"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'nurse', 'admin', 'super_admin']}>
                  <DoctorConsultationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="consultations/:appointmentId"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'nurse', 'admin', 'super_admin']}>
                  <DoctorConsultationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="clinical-notes"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'admin', 'super_admin']}>
                  <SoapNotesPage />
                </ProtectedRoute>
              }
            />

            {/* Treatment History & Prescriptions */}
            <Route path="treatments" element={<PatientTreatmentsPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="pharmacies" element={<PharmacyFinderPage />} />
            <Route path="reminders" element={<MedicationRemindersPage />} />

            {/* Patients & Profiles */}
            <Route
              path="patients"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'nurse', 'front_desk', 'billing', 'admin', 'super_admin']}>
                  <PatientDirectoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="patients/:id"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'nurse', 'front_desk', 'billing', 'admin', 'super_admin']}>
                  <PatientProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Diagnostics, Billing & Telehealth */}
            <Route path="labs" element={<LabManagementPage />} />
            <Route path="billing" element={<BillingManagementPage />} />
            <Route path="billing/claims" element={<BillingManagementPage />} />
            <Route path="telehealth" element={<TelehealthRoomPage />} />
            <Route path="alerts" element={<ClinicalAlertsPage />} />

            {/* Administrative & Vault */}
            <Route
              path="admin/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin', 'billing']}>
                  <PracticeAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route path="records-vault" element={<MedicalRecordsVaultPage />} />

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
