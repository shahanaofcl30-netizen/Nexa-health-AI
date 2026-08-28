import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MedAIAssistantModal } from '../ai/MedAIAssistantModal';
import { AgentTasksDrawer } from '../ai/AgentTasksDrawer';
import { Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [medAIOpen, setMedAIOpen] = useState(false);
  const [agentTasksOpen, setAgentTasksOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070A12] flex flex-col text-slate-100 selection:bg-brand-500 selection:text-slate-950">
      <Navbar
        onOpenMedAI={() => setMedAIOpen(true)}
        onOpenAgentTasks={() => setAgentTasksOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#090D18]/80">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating MedAI Quick Launch Button */}
      <button
        onClick={() => setMedAIOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-teal-500 text-slate-950 font-bold text-xs shadow-glow-cyan hover:scale-105 active:scale-95 transition-all"
      >
        <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
        <span>Ask MedAI</span>
      </button>

      {/* Modals & Drawers */}
      <MedAIAssistantModal isOpen={medAIOpen} onClose={() => setMedAIOpen(false)} />
      <AgentTasksDrawer isOpen={agentTasksOpen} onClose={() => setAgentTasksOpen(false)} />
    </div>
  );
};
