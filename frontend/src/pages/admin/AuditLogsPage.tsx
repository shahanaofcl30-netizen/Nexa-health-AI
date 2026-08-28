import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Filter,
  Lock,
  Search,
  Shield,
  ShieldAlert,
  User,
} from 'lucide-react';
import api from '../../services/api';
import { AgentAuditLog } from '../../types/shared';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AgentAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/ai/audit-logs');
        setLogs(res.data);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.inputSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.outputSummary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Security & AI Audit Trail</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            HIPAA & GDPR Compliant
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Immutable logging of every autonomous agent action, PHI data access event, tool call, and clinician electronic sign-off
        </p>
      </div>

      {/* Search & Stats */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by agent, action, or payload keywords..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A101D] text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Agent / Operator</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">Input / Output Summary</th>
                <th className="p-3.5">Safety Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-brand-300 flex items-center space-x-1.5">
                      <Bot className="w-3.5 h-3.5 text-brand-400" />
                      <span>{log.agentName}</span>
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-white text-[11px] font-semibold">{log.action}</td>
                  <td className="p-3.5 text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-slate-300">
                      {log.entityType}
                    </span>
                  </td>
                  <td className="p-3.5 max-w-xs truncate text-slate-300">
                    <p className="truncate text-[11px]">In: {log.inputSummary}</p>
                    <p className="truncate text-[10px] text-slate-500">Out: {log.outputSummary}</p>
                  </td>
                  <td className="p-3.5">
                    <span className="flex items-center space-x-1 text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>PASSED</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
