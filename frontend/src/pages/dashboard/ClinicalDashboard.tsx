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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-white border border-secondary relative overflow-hidden shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-slate-700">
                Clinical Dashboard
              </span>
              <span className="text-xs text-slate-600 font-mono">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans']">
              Good morning, Dr. {currentUser?.firstName || currentUser?.lastName ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : currentUser?.email ? currentUser.email.split('@')[0] : 'Doctor'}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              <span className="text-primary font-semibold">{agentTasks.length} active tasks</span> running today.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              to="/clinical-notes"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm transition-all hover:scale-[1.02]"
            >
              <FileText className="w-4 h-4" />
              <span>Start Encounter</span>
            </Link>
            <Link
              to="/appointments"
              className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white border border-secondary hover:bg-secondary/20 text-slate-700 text-sm font-semibold transition-all"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span>Book Appointment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Patients */}
        <div className="p-4 rounded-2xl bg-white border border-secondary hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Patients</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{patients.length}</p>
          </div>
        </div>

        {/* Card 2: Today's Appointments */}
        <div className="p-4 rounded-2xl bg-white border border-secondary hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Appointments</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
          </div>
        </div>

        {/* Card 3: Clinical Alerts */}
        <div className="p-4 rounded-2xl bg-white border border-secondary hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-critical/10 text-critical flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {alerts.filter((a) => !a.isAcknowledged).length}
            </p>
          </div>
        </div>

        {/* Card 4: Tasks */}
        <div className="p-4 rounded-2xl bg-white border border-secondary hover:shadow-md transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Pending Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{agentTasks.length}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Schedule & Agent Tasks & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Today's Clinical Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-slate-900">Today's Appointments</h2>
              </div>
              <Link to="/appointments" className="text-sm text-primary hover:underline font-bold flex items-center">
                View All <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No appointments today.</p>
              ) : (
                appointments.map((apt) => {
                  const patient = patients.find((p) => p.id === apt.patientId) || apt.patient;
                  const patientFullName = patient ? `${patient.firstName} ${patient.lastName || ''}`.trim() : (apt.patientName || 'Patient');
                  const initials = patientFullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PT';

                  return (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-xl bg-secondary/10 border border-secondary hover:bg-secondary/20 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-sm text-slate-900">
                              {patientFullName}
                            </p>
                            <span className="text-xs font-mono text-slate-500">
                              {patient?.mrn || 'NX-2026'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{apt.reason}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-700 px-2.5 py-1">
                          {new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        <Link
                          to={`/consultations/${apt.id}`}
                          className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm flex items-center space-x-1"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Start</span>
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
              className="p-3.5 rounded-xl bg-white border border-secondary hover:shadow-md flex flex-col items-center justify-center text-center space-y-1.5 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">Find Hospital</span>
            </Link>

            <Link
              to="/consultations"
              className="p-3.5 rounded-xl bg-white border border-secondary hover:shadow-md flex flex-col items-center justify-center text-center space-y-1.5 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">Consultations</span>
            </Link>

            <Link
              to="/treatments"
              className="p-3.5 rounded-xl bg-white border border-secondary hover:shadow-md flex flex-col items-center justify-center text-center space-y-1.5 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">History</span>
            </Link>

            <Link
              to="/pharmacies"
              className="p-3.5 rounded-xl bg-white border border-secondary hover:shadow-md flex flex-col items-center justify-center text-center space-y-1.5 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">Pharmacies</span>
            </Link>
          </div>
        </div>

        {/* Column 3: Active Clinical Alerts & Living Summaries */}
        <div className="space-y-4">
          {/* Active Alerts Box */}
          <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-1.5">
                <AlertTriangle className="w-5 h-5 text-critical" />
                <span>Critical Alerts ({alerts.filter((a) => !a.isAcknowledged).length})</span>
              </h3>
              <Link to="/alerts" className="text-sm font-bold text-primary hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border text-sm space-y-1 ${
                    alert.severity === 'critical'
                      ? 'bg-critical/10 border-critical/30 text-critical'
                      : alert.severity === 'high'
                      ? 'bg-secondary/30 border-secondary text-slate-800'
                      : 'bg-white border-secondary text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{alert.title}</span>
                  </div>
                  <p className="text-xs mt-1 text-slate-600">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Summaries Preview */}
          <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-1.5">
                <Bot className="w-5 h-5 text-primary" />
                <span>Patient Summaries</span>
              </h3>
            </div>

            {patients.slice(0, 2).map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-secondary/10 border border-secondary text-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{p.mrn}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed bg-white p-2 rounded border border-secondary">
                  "{p.livingSummary || 'No summary compiled.'}"
                </p>
                <div className="flex items-center space-x-1 pt-1 text-xs text-slate-500">
                  <span>Allergies:</span>
                  <span className="text-critical font-bold">{p.allergies?.join(', ') || 'None'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
