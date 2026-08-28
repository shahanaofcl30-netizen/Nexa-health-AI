import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  HeartPulse,
  Pill,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import api from '../../services/api';
import { MedicationReminder } from '../../types/shared';
import { useCurrentPatient } from '../../hooks/usePatients';

export const MedicationRemindersPage: React.FC = () => {
  const { data: currentPatient } = useCurrentPatient();
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const url = currentPatient?.id ? `/communications/reminders?patientId=${currentPatient.id}` : '/communications/reminders';
      const res = await api.get(url);
      setReminders(res.data);
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [currentPatient?.id]);

  const handleUpdateStatus = async (id: string, status: 'taken' | 'skipped') => {
    try {
      await api.put(`/communications/reminders/${id}/status`, { status });
      fetchReminders();
    } catch (err) {
      console.error('Failed to update reminder status:', err);
    }
  };

  const takenCount = reminders.filter((r) => r.status === 'taken').length;
  const adherenceRate = reminders.length > 0 ? Math.round((takenCount / reminders.length) * 100) : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Medication Reminders & Adherence</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
            Care Protocol Sync
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Automated dose scheduling tied to signed e-prescriptions, SMS/WhatsApp notification dispatch, and patient compliance tracking
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Medication Adherence Score</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{adherenceRate}%</p>
          <span className="text-[11px] text-emerald-300 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" /> High clinical compliance
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Scheduled Doses Today</span>
          <p className="text-2xl font-black text-brand-400 font-mono">{reminders.length} Doses</p>
          <span className="text-[11px] text-slate-400 flex items-center">
            <Clock className="w-3 h-3 mr-1" /> Morning & Evening regimens
          </span>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Active Prescriptions</span>
          <p className="text-2xl font-black text-purple-400 font-mono">2 Medications</p>
          <span className="text-[11px] text-purple-300 flex items-center">
            <Pill className="w-3 h-3 mr-1" /> Lisinopril & Metformin
          </span>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {reminders.map((rem) => (
          <div
            key={rem.id}
            className="p-5 rounded-2xl glass-card border border-slate-800 glass-card-hover flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-brand-400 font-bold">
                <Pill className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-white">
                    {rem.medicationName} <span className="text-brand-300 font-normal">({rem.dosage})</span>
                  </h3>
                  <span
                    className={`text-[9px] font-mono uppercase font-bold px-2 py-0.2 rounded ${
                      rem.status === 'taken'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : rem.status === 'skipped'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300 animate-pulse'
                    }`}
                  >
                    {rem.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{rem.notes || 'Take with water after meal'}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Scheduled for: <strong className="text-slate-300">{rem.scheduledTime}</strong> • Date: {rem.date}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end md:self-auto">
              {rem.status !== 'taken' ? (
                <>
                  <button
                    onClick={() => handleUpdateStatus(rem.id, 'skipped')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(rem.id, 'taken')}
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                  >
                    Mark as Taken
                  </button>
                </>
              ) : (
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Taken at {rem.takenAt ? new Date(rem.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:15 AM'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
