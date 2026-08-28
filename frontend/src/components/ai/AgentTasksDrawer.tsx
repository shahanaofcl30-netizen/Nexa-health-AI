import React, { useState, useEffect } from 'react';
import {
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  X,
  AlertCircle,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import api from '../../services/api';
import { AgentTask } from '../../types/shared';

interface AgentTasksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentTasksDrawer: React.FC<AgentTasksDrawerProps> = ({ isOpen, onClose }) => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/tasks');
      setTasks(res.data);
      if (res.data.length > 0 && !selectedTask) {
        setSelectedTask(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = async (taskId: string) => {
    try {
      const res = await api.post(`/ai/tasks/${taskId}/approve`);
      setSelectedTask(res.data);
      fetchTasks();
    } catch (err) {
      console.error('Failed to approve task:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl h-full bg-[#0A0F1D] border-l border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#070B16]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Autonomous Agent Runtime</h3>
              <p className="text-[10px] text-slate-400">Shared Multi-Agent Task Queue & Clinician Sign-Off</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchTasks}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Split view (Task List / Detail) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Task List Column */}
          <div className="w-72 border-r border-slate-800 overflow-y-auto p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 mb-2">
              Executed Workflows ({tasks.length})
            </p>

            {tasks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No agent tasks recorded yet.</p>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                    selectedTask?.id === task.id
                      ? 'bg-brand-500/20 border-brand-500/40 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold truncate max-w-[130px]">{task.agentName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : task.status === 'requires_human_review'
                          ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                          : task.status === 'running'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {task.reasoningSteps?.[task.reasoningSteps.length - 1] || 'Running task...'}
                  </p>
                  <span className="text-[9px] text-slate-500 block mt-1">
                    {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Task Detail Column */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {selectedTask ? (
              <>
                <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="font-bold text-base text-white">{selectedTask.agentName}</h4>
                    <p className="text-xs text-slate-400 font-mono">Task ID: {selectedTask.id}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedTask.status === 'requires_human_review' && (
                      <button
                        onClick={() => handleApprove(selectedTask.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Clinician Sign-Off & Approve</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Reasoning Chain */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Bot className="w-3.5 h-3.5 text-brand-400" />
                    <span>Autonomous Reasoning Chain</span>
                  </p>
                  <ul className="space-y-1 text-xs text-slate-400 pl-4 list-disc">
                    {selectedTask.reasoningSteps?.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tool Executions */}
                {selectedTask.toolCalls && selectedTask.toolCalls.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Executed Secure Tools ({selectedTask.toolCalls.length})</span>
                    </p>
                    <div className="space-y-2">
                      {selectedTask.toolCalls.map((tc, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                          <span className="font-mono text-brand-400 font-bold">{tc.tool}()</span>
                          <pre className="mt-1 text-[11px] text-slate-400 overflow-x-auto p-2 bg-[#060A13] rounded">
                            {JSON.stringify(tc.output, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structured Output Result */}
                {selectedTask.outputResult && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                      <span>Structured Agent Output</span>
                    </p>
                    <pre className="text-xs text-brand-200 bg-[#060A13] p-3 rounded-xl border border-slate-800 overflow-x-auto">
                      {JSON.stringify(selectedTask.outputResult, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    <strong>Regulatory Note:</strong> All agentic task outputs are logged to the immutable audit trail and require clinical sign-off when modifying patient treatment records.
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-12">Select an agent task from the left to inspect.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
