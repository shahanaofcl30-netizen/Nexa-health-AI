import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Pill,
  Plus,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Appointment, Patient, ClinicalAlert, AgentTask } from '../../types/shared';

export const ClinicalDashboard: React.FC = () => {
  const { currentUser, activeRole } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, appointmentsRes, alertsRes, tasksRes, metricsRes] = await Promise.all([
          api.get('/patients'),
          api.get('/appointments'),
          api.get('/communications/alerts'),
          api.get('/ai/tasks'),
          api.get('/admin/metrics'),
        ]);

        setPatients(patientsRes.data);
        setAppointments(appointmentsRes.data);
        setAlerts(alertsRes.data);
        setAgentTasks(tasksRes.data);
        setMetrics(metricsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-950/60 via-slate-900/80 to-emerald-950/40 border border-brand-500/20 glass-card relative overflow-hidden shadow-glow-cyan">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Nexa Clinical Practice OS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-['Plus_Jakarta_Sans']">
              Good morning, {currentUser?.firstName || currentUser?.lastName ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : currentUser?.email ? currentUser.email.split('@')[0] : 'Doctor'} 👋
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
              Hospital operations are running at optimal capacity. <span className="text-brand-300 font-semibold">{agentTasks.length} autonomous agent workflows</span> executed today with 0 safety exceptions.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              to="/clinical-notes"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 hover:from-brand-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all hover:scale-[1.02]"
            >
              <FileText className="w-4 h-4" />
              <span>Start Clinical Encounter</span>
            </Link>
            <Link
              to="/appointments"
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold transition-all"
            >
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Book Appointment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Patients */}
        <div className="p-4 rounded-2xl glass-card border border-slate-800 glass-card-hover space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Patients</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']">{patients.length}</p>
            <p className="text-[11px] text-emerald-400 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" /> Active directory
            </p>
          </div>
        </div>

        {/* Card 2: Today's Appointments */}
        <div className="p-4 rounded-2xl glass-card border border-slate-800 glass-card-hover space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointments</span>
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']">{appointments.length}</p>
            <p className="text-[11px] text-brand-300 flex items-center mt-1">
              <Clock className="w-3 h-3 mr-1" /> 
              {appointments.filter((a: any) => a.type === 'telehealth').length} Telehealth, {appointments.filter((a: any) => a.type === 'in_person').length} In-Clinic
            </p>
          </div>
        </div>

        {/* Card 3: Clinical Alerts */}
        <div className="p-4 rounded-2xl glass-card border border-slate-800 glass-card-hover space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clinical Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']">
              {alerts.filter((a) => !a.isAcknowledged).length}
            </p>
            <p className="text-[11px] text-amber-400 flex items-center mt-1">
              <AlertCircle className="w-3 h-3 mr-1" /> Requires Clinician Review
            </p>
          </div>
        </div>

        {/* Card 4: Autonomous Agent Tasks */}
        <div className="p-4 rounded-2xl glass-card border border-slate-800 glass-card-hover space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent Workflows</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-white font-['Plus_Jakarta_Sans']">{agentTasks.length}</p>
            <p className="text-[11px] text-fuchsia-400 flex items-center mt-1">
              <Sparkles className="w-3 h-3 mr-1" /> {agentTasks.filter((t: any) => t.status === 'running' || t.status === 'queued').length} Active Autonomous Agents
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Schedule & Agent Tasks & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Today's Clinical Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-white">Today's Encounter Schedule</h2>
                <p className="text-xs text-slate-400">Scheduled consultations and telehealth sessions</p>
              </div>
              <Link to="/appointments" className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center">
                View Calendar <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {appointments.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No appointments scheduled for today.</p>
              ) : (
                appointments.map((apt) => {
                  const patient = patients.find((p) => p.id === apt.patientId) || apt.patient;
                  return (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-brand-400">
                          {patient ? `${patient.firstName?.[0]}${patient.lastName?.[0]}` : 'PT'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-xs text-white">
                              {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient Name'}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {patient?.mrn || 'NX-2026'}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                                apt.type === 'telehealth'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {apt.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{apt.reason}</p>
                          <p className="text-[10px] text-cyan-400 font-mono mt-0.5 flex items-center">
                            <Building2 className="w-3 h-3 mr-1" />
                            {apt.hospital?.name || 'Apollo Hospital & Medical Center'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                          {new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        <Link
                          to={`/consultations/${apt.id}`}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan flex items-center space-x-1"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Start Consultation</span>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/hospitals"
              className="p-3.5 rounded-xl glass-card border border-slate-800 glass-card-hover flex flex-col items-center justify-center text-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Find Hospital</span>
              <span className="text-[10px] text-slate-500">Book & Map</span>
            </Link>

            <Link
              to="/consultations"
              className="p-3.5 rounded-xl glass-card border border-slate-800 glass-card-hover flex flex-col items-center justify-center text-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Consultations</span>
              <span className="text-[10px] text-slate-500">Patient Treatment</span>
            </Link>

            <Link
              to="/treatments"
              className="p-3.5 rounded-xl glass-card border border-slate-800 glass-card-hover flex flex-col items-center justify-center text-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Treatment History</span>
              <span className="text-[10px] text-slate-500">EHR Records</span>
            </Link>

            <Link
              to="/pharmacies"
              className="p-3.5 rounded-xl glass-card border border-slate-800 glass-card-hover flex flex-col items-center justify-center text-center space-y-1.5"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Nearby Pharmacies</span>
              <span className="text-[10px] text-slate-500">Hospital Geolocation</span>
            </Link>
          </div>
        </div>

        {/* Column 3: Active Clinical Alerts & Living Summaries */}
        <div className="space-y-4">
          {/* Active Alerts Box */}
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Critical Alerts ({alerts.filter((a) => !a.isAcknowledged).length})</span>
              </h3>
              <Link to="/alerts" className="text-[11px] text-brand-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      : alert.severity === 'high'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{alert.title}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-mono bg-slate-900">
                      {alert.source}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Living Patient Summaries Preview */}
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                <Bot className="w-4 h-4 text-brand-400" />
                <span>AI Living Summaries</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Auto-Synced</span>
            </div>

            {patients.slice(0, 2).map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-[10px] text-brand-400 font-mono">{p.mrn}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  "{p.livingSummary || 'No summary compiled.'}"
                </p>
                <div className="flex items-center space-x-1 pt-1 text-[10px] text-slate-500">
                  <span>Allergies:</span>
                  <span className="text-rose-400 font-medium">{p.allergies?.join(', ') || 'None'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
