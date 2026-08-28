import React, { useState, useEffect } from 'react';
import {
  Activity,
  Bell,
  Bot,
  ChevronDown,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../types/shared';
import { useCurrentPatient } from '../../hooks/usePatients';
import api from '../../services/api';

interface NavbarProps {
  onOpenMedAI: () => void;
  onOpenAgentTasks: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMedAI, onOpenAgentTasks }) => {
  const { currentUser, activeRole, setRole } = useAuthStore();
  const { data: currentPatient } = useCurrentPatient();
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [activeTasksCount, setActiveTasksCount] = useState<number>(0);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<boolean>(false);

  // Dynamic user display name & initial resolution
  const isPatientRole = activeRole === 'patient' || currentUser?.role === 'patient';

  const rawFirstName = isPatientRole && currentPatient?.firstName
    ? currentPatient.firstName
    : currentUser?.firstName;

  const rawLastName = isPatientRole && currentPatient?.lastName
    ? currentPatient.lastName
    : currentUser?.lastName;

  const displayName = rawFirstName || rawLastName
    ? `${rawFirstName || ''} ${rawLastName || ''}`.trim()
    : currentUser?.email
    ? currentUser.email.split('@')[0]
    : 'User';

  const avatarInitial = (displayName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase();
  const roleLabel = currentUser?.role ? currentUser.role.replace('_', ' ') : activeRole ? activeRole.replace('_', ' ') : 'USER';

  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const [alertsRes, tasksRes] = await Promise.all([
          api.get('/communications/alerts'),
          api.get('/ai/tasks'),
        ]);
        const unack = alertsRes.data.filter((a: any) => !a.isAcknowledged).length;
        setAlertsCount(unack);

        const running = tasksRes.data.filter(
          (t: any) => t.status === 'running' || t.status === 'requires_human_review'
        ).length;
        setActiveTasksCount(running);
      } catch (err) {
        // silent catch in local polling
      }
    };

    fetchCounters();
    const interval = setInterval(fetchCounters, 5000);
    return () => clearInterval(interval);
  }, []);



  return (
    <header className="h-16 border-b border-secondary bg-white sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand & Platform Identifier */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 p-[1.5px] flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
              Nexa <span className="text-primary">Health</span> AI
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Agentic Core
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">Clinical Intelligence & Autonomous Practice OS</p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl glass-input text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-slate-600 border border-slate-200">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Action Controls & Role Persona Switcher */}
      <div className="flex items-center space-x-3">
        {/* MedAI Assistant Trigger */}
        <button
          onClick={onOpenMedAI}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>MedAI Chat</span>
        </button>

        {/* Autonomous Agent Tasks Button */}
        <button
          onClick={onOpenAgentTasks}
          className="relative p-2 rounded-xl bg-secondary/50 border border-secondary text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
          title="Agent Tasks"
        >
          <Bot className="w-4 h-4 text-primary" />
          {activeTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white font-bold text-[9px] flex items-center justify-center">
              {activeTasksCount}
            </span>
          )}
        </button>

        {/* Clinical Alerts Indicator */}
        <button
          onClick={() => (window.location.href = '/alerts')}
          className="relative p-2 rounded-xl bg-secondary/50 border border-secondary text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
          title="Alerts"
        >
          <Bell className="w-4 h-4 text-slate-600" />
          {alertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-critical text-white font-bold text-[9px] flex items-center justify-center shadow-lg">
              {alertsCount}
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-secondary/50 border border-secondary hover:border-primary/40 transition-all text-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-primary font-bold text-xs uppercase border border-secondary">
              {avatarInitial}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-slate-900 font-semibold leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                {roleLabel}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-card p-2 z-50">
              <div className="px-3 py-3 border-b border-secondary mb-1 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary font-bold text-lg uppercase">
                  {avatarInitial}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{currentUser?.email || 'No email available'}</p>
                </div>
              </div>

              {/* Sign Out Action */}
              <div className="pt-1 mt-1">
                <button
                  onClick={async () => {
                    await useAuthStore.getState().logout();
                    window.location.href = '/login';
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-critical hover:bg-critical/10 font-semibold flex items-center space-x-2 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
