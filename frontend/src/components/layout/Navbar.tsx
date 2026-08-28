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
import api from '../../services/api';

interface NavbarProps {
  onOpenMedAI: () => void;
  onOpenAgentTasks: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMedAI, onOpenAgentTasks }) => {
  const { currentUser, activeRole, setRole } = useAuthStore();
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [activeTasksCount, setActiveTasksCount] = useState<number>(0);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<boolean>(false);

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
    <header className="h-16 border-b border-slate-800/80 bg-[#0B101E]/90 backdrop-blur-md sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      {/* Brand & Platform Identifier */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 p-[1.5px] shadow-glow-cyan flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Activity className="w-5 h-5 text-brand-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white font-['Plus_Jakarta_Sans']">
              Nexa <span className="text-brand-400">Health</span> AI
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              Agentic Core
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">Clinical Intelligence & Autonomous Practice OS</p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patients, MRN, doctors, ICD-10, medications..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl glass-input text-slate-200 placeholder:text-slate-500 focus:outline-none transition-all"
          />
          <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Action Controls & Role Persona Switcher */}
      <div className="flex items-center space-x-3">
        {/* MedAI Assistant Trigger */}
        <button
          onClick={onOpenMedAI}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600/30 to-emerald-600/30 hover:from-brand-600/50 hover:to-emerald-600/50 border border-brand-500/40 text-brand-300 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
          <span>MedAI Chat</span>
        </button>

        {/* Autonomous Agent Tasks Button */}
        <button
          onClick={onOpenAgentTasks}
          className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          title="Agentic Workflows & Audit Log"
        >
          <Bot className="w-4 h-4 text-brand-400" />
          {activeTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 text-slate-950 font-bold text-[9px] flex items-center justify-center animate-pulse">
              {activeTasksCount}
            </span>
          )}
        </button>

        {/* Clinical Alerts Indicator */}
        <button
          onClick={() => (window.location.href = '/alerts')}
          className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          title="Clinical Alerts"
        >
          <Bell className="w-4 h-4 text-amber-400" />
          {alertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-lg">
              {alertsCount}
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-500/40 transition-all text-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-brand-400 font-bold text-xs uppercase">
              {currentUser?.firstName?.[0] || currentUser?.email?.[0] || 'U'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-slate-200 font-semibold leading-tight">
                {currentUser?.firstName || currentUser?.lastName
                  ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
                  : currentUser?.email
                  ? currentUser.email.split('@')[0]
                  : 'User'}
              </p>
              <p className="text-[10px] text-brand-400 uppercase font-mono tracking-wider">
                {currentUser?.role ? currentUser.role.replace('_', ' ') : 'USER'}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-card border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-3 border-b border-slate-800/80 mb-1 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-brand-400 font-bold text-lg uppercase">
                  {currentUser?.firstName?.[0] || currentUser?.email?.[0] || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-200 truncate">
                    {currentUser?.firstName || currentUser?.lastName
                      ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
                      : currentUser?.email
                      ? currentUser.email.split('@')[0]
                      : 'User'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{currentUser?.email || 'No email available'}</p>
                  <p className="text-[10px] text-brand-400 uppercase font-mono tracking-wider mt-0.5">
                    {currentUser?.role ? currentUser.role.replace('_', ' ') : 'USER'}
                  </p>
                </div>
              </div>

              {/* Sign Out Action */}
              <div className="pt-1 mt-1">
                <button
                  onClick={async () => {
                    await useAuthStore.getState().logout();
                    window.location.href = '/login';
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 font-semibold flex items-center space-x-2 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign Out / Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
