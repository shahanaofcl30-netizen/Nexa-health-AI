import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Home,
  MapPin,
  Pill,
  Shield,
  Stethoscope,
  Users,
  Video,
  Clock,
  FolderLock,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { activeRole } = useAuthStore();

  const getNavItems = (): NavItem[] => {
    // Role-specific primary navigation
    switch (activeRole) {
      case 'patient':
        return [
          { to: '/patient-portal', label: 'Dashboard', icon: Home },
          { to: '/hospitals', label: 'Hospitals', icon: Building2, badge: 'New' },
          { to: '/appointments', label: 'Appointments', icon: Calendar },
          { to: '/treatments', label: 'Treatments', icon: History },
          { to: '/prescriptions', label: 'Medicines', icon: Pill },
          { to: '/pharmacies', label: 'Pharmacies', icon: MapPin },
          { to: '/labs', label: 'Lab Results', icon: FlaskConical },
          { to: '/billing', label: 'Billing', icon: CreditCard },
          { to: '/telehealth', label: 'Video Calls', icon: Video },
          { to: '/reminders', label: 'Reminders', icon: Clock },
          { to: '/records-vault', label: 'Medical Records', icon: FolderLock },
        ];

      case 'nurse':
        return [
          { to: '/', label: 'Triage Overview', icon: HeartPulse },
          { to: '/hospitals', label: 'Hospital Directory', icon: Building2 },
          { to: '/patients', label: 'Patient Directory', icon: Users },
          { to: '/appointments', label: 'Encounter Queue', icon: Calendar },
          { to: '/treatments', label: 'Treatment Records', icon: History },
          { to: '/alerts', label: 'Clinical Alerts', icon: AlertTriangle, badge: 'Live' },
          { to: '/reminders', label: 'Medication Rounds', icon: Clock },
          { to: '/labs', label: 'Lab Specimens', icon: FlaskConical },
        ];

      case 'front_desk':
        return [
          { to: '/', label: 'Reception Dashboard', icon: Home },
          { to: '/hospitals', label: 'Hospital Network', icon: Building2 },
          { to: '/appointments', label: 'Appointment Desk', icon: Calendar },
          { to: '/book-appointment', label: 'Book Encounter', icon: Calendar },
          { to: '/patients', label: 'Patient Registration', icon: Users },
          { to: '/doctors', label: 'Doctor Availability', icon: Stethoscope },
          { to: '/billing', label: 'Payment Counter', icon: CreditCard },
        ];

      case 'billing':
        return [
          { to: '/billing', label: 'Revenue Dashboard', icon: CreditCard },
          { to: '/billing/claims', label: 'Insurance Claims', icon: FileText },
          { to: '/patients', label: 'Patient Accounts', icon: Users },
          { to: '/admin/analytics', label: 'Financial Reports', icon: BarChart3 },
        ];

      case 'lab_tech':
        return [
          { to: '/labs', label: 'Lab Orders Queue', icon: FlaskConical },
          { to: '/patients', label: 'Patient Directory', icon: Users },
          { to: '/alerts', label: 'Critical Values', icon: AlertTriangle },
        ];

      case 'doctor':
        return [
          { to: '/doctor/dashboard', label: 'Clinical Dashboard', icon: Home },
          { to: '/patients', label: 'My Patients', icon: Users },
          { to: '/appointments', label: 'Appointments & Calendar', icon: Calendar },
          { to: '/consultations', label: 'Doctor Consultations', icon: Stethoscope, badge: 'Live' },
          { to: '/treatments', label: 'Treatments & Follow-ups', icon: History },
          { to: '/clinical-notes', label: 'SOAP Notes Studio', icon: FileText, badge: 'AI' },
          { to: '/prescriptions', label: 'E-Prescriptions', icon: Pill },
          { to: '/labs', label: 'Laboratory Reports', icon: FlaskConical },
          { to: '/records-vault', label: 'Patient Medical Records', icon: FolderLock },
          { to: '/telehealth', label: 'Telehealth Consults', icon: Video },
          { to: '/alerts', label: 'Clinical Alerts', icon: AlertTriangle },
        ];

      case 'admin':
      case 'super_admin':
        return [
          { to: '/admin/analytics', label: 'Admin Dashboard', icon: BarChart3 },
          { to: '/patients', label: 'User / Patient Management', icon: Users },
          { to: '/admin/hospitals', label: 'Hospital Management', icon: Building2 },
          { to: '/appointments', label: 'Appointment Management', icon: Calendar },
          { to: '/billing', label: 'Billing & Claims', icon: CreditCard },
          { to: '/admin/audit-logs', label: 'Security & Audit Logs', icon: Shield },
        ];
      default:
        return [
          { to: '/', label: 'Home Dashboard', icon: Home }
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 border-r border-secondary bg-white flex flex-col justify-between p-4 hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
            Navigation — {activeRole.replace('_', ' ')}
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-primary hover:bg-secondary/20'
                    }`
                  }
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => {
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs text-critical hover:text-critical hover:bg-critical/10 border border-critical/20 font-semibold transition-all"
        >
          <FolderLock className="w-4 h-4" />
          <span>Sign Out</span>
        </button>

        <div className="p-3 rounded-2xl bg-secondary/30 border border-secondary text-xs">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-mono uppercase text-primary font-bold">Agents Active</span>
          </div>
          <p className="text-[11px] text-slate-500">9 Medical AI Agents running.</p>
        </div>
      </div>
    </aside>
  );
};
