import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  Filter,
  HeartPulse,
  Pill,
  ShieldAlert,
  User,
} from 'lucide-react';
import api from '../../services/api';
import { ClinicalAlert, Patient } from '../../types/shared';

export const ClinicalAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical'>('unacknowledged');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [alertRes, patRes] = await Promise.all([
        api.get('/communications/alerts'),
        api.get('/patients'),
      ]);
      setAlerts(alertRes.data);
      setPatients(patRes.data);
    } catch (err) {
      console.error('Failed to load clinical alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.put(`/communications/alerts/${alertId}/acknowledge`);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'unacknowledged') return !a.isAcknowledged;
    if (filter === 'critical') return a.severity === 'critical';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Clinical Alerts & Triage Center</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
              Clinical Alert Agent Running
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time automated anomaly monitoring across patient vitals, lab biomarkers, and drug interaction triggers
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setFilter('unacknowledged')}
          className={`px-3.5 py-1.5 rounded-xl transition-all ${
            filter === 'unacknowledged'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Unacknowledged Warnings ({alerts.filter((a) => !a.isAcknowledged).length})
        </button>

        <button
          onClick={() => setFilter('critical')}
          className={`px-3.5 py-1.5 rounded-xl transition-all ${
            filter === 'critical'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Critical Severity Only ({alerts.filter((a) => a.severity === 'critical').length})
        </button>

        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl transition-all ${
            filter === 'all'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Recorded Alerts ({alerts.length})
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 rounded-2xl glass-card border border-slate-800 text-center text-slate-500 text-xs">
            No alerts matching the selected filter.
          </div>
        ) : (
          filtered.map((alert) => {
            const patient = patients.find((p) => p.id === alert.patientId) || alert.patient;

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  alert.severity === 'critical'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-100 shadow-lg'
                    : alert.severity === 'high'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                    : 'glass-card border-slate-800 text-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        alert.severity === 'critical'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : alert.severity === 'high'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <h3 className="font-bold text-sm text-white">{alert.title}</h3>
                    <span className="text-xs font-mono text-slate-400">• Source: {alert.source}</span>
                  </div>

                  <p className="text-xs text-slate-300">{alert.message}</p>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span>
                      Patient: <strong className="text-white">{patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}</strong> (
                      {patient?.mrn})
                    </span>
                    <span>• Logged at: {new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-auto">
                  {!alert.isAcknowledged ? (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      Acknowledge & Sign-Off
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-emerald-400 font-bold flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Acknowledged
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
