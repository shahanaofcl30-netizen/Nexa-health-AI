import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  User,
  Video,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Appointment, Patient, Doctor } from '../../types/shared';

export const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isAgentBookingOpen, setIsAgentBookingOpen] = useState(false);

  // Manual Form
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    dateTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 16),
    type: 'in_person',
    triageLevel: 'routine',
    reason: '',
  });

  // Agent Form
  const [agentForm, setAgentForm] = useState({
    patientId: '',
    doctorId: '',
    symptoms: 'Mild episodic lightheadedness during summer heat; history of stage 1 hypertension',
    urgency: 'routine',
  });
  const [agentRecommendation, setAgentRecommendation] = useState<any>(null);
  const [agentRunning, setAgentRunning] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const [aptRes, patRes, docRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/patients'),
        api.get('/doctors'),
      ]);
      setAppointments(aptRes.data);
      setPatients(patRes.data);
      setDoctors(docRes.data);
      if (patRes.data.length > 0 && !formData.patientId) {
        setFormData((prev) => ({ ...prev, patientId: patRes.data[0].id }));
        setAgentForm((prev) => ({ ...prev, patientId: patRes.data[0].id }));
      }
      if (docRes.data.length > 0 && !formData.doctorId) {
        setFormData((prev) => ({ ...prev, doctorId: docRes.data[0].id }));
        setAgentForm((prev) => ({ ...prev, doctorId: docRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status: newStatus });
      fetchAppointments();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleStartConsultation = async (appointmentId: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status: 'in_consultation' });
      navigate(`/consultations/${appointmentId}`);
    } catch (err) {
      console.error('Failed to start consultation:', err);
    }
  };

  const handleManualBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/appointments', formData);
      setIsBookingOpen(false);
      fetchAppointments();
    } catch (err) {
      console.error('Failed to book appointment:', err);
    }
  };

  const handleRunSchedulingAgent = async () => {
    setAgentRunning(true);
    try {
      const res = await api.post('/appointments/agent-schedule', agentForm);
      setAgentRecommendation(res.data.outputResult);
    } catch (err) {
      console.error('Failed to run agent:', err);
    } finally {
      setAgentRunning(false);
    }
  };

  const handleConfirmAgentBooking = async () => {
    if (!agentRecommendation) return;
    try {
      await api.post('/appointments', {
        patientId: agentForm.patientId,
        doctorId: agentForm.doctorId,
        dateTime: agentRecommendation.recommendedSlot || new Date().toISOString(),
        triageLevel: agentRecommendation.triageLevel || 'routine',
        reason: agentForm.symptoms,
        type: 'in_person',
      });
      setIsAgentBookingOpen(false);
      setAgentRecommendation(null);
      fetchAppointments();
    } catch (err) {
      console.error('Failed to confirm agent booking:', err);
    }
  };

  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Appointments & Scheduling</h1>
          <p className="text-xs text-slate-400">Doctor schedules, triage queues, and autonomous slot negotiation</p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Agent Scheduling Trigger */}
          <button
            onClick={() => setIsAgentBookingOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-brand-600/30 hover:from-purple-600/50 hover:to-brand-600/50 border border-purple-500/40 text-purple-300 text-xs font-bold shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>AI Smart Scheduling Agent</span>
          </button>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        {['all', 'scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${
              statusFilter === status
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="p-12 rounded-2xl glass-card border border-slate-800 text-center text-slate-500 text-xs">
            No appointments matching the selected filter.
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const patient = patients.find((p) => p.id === apt.patientId) || apt.patient;
            const doctor = doctors.find((d) => d.id === apt.doctorId) || apt.doctor;

            return (
              <div
                key={apt.id}
                className="p-4 rounded-2xl glass-card border border-slate-800 glass-card-hover flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center font-bold text-brand-400">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-[10px] font-mono mt-0.5">
                      {new Date(apt.dateTime).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-white">
                        {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">({patient?.mrn || 'NX-2026'})</span>
                      <span
                        className={`text-[9px] px-2 py-0.2 rounded font-mono uppercase font-bold ${
                          apt.status === 'in_consultation'
                            ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                            : apt.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : apt.status === 'checked_in'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {apt.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium">{apt.reason}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                      <span className="text-rose-300 font-semibold flex items-center">
                        <Building2 className="w-3 h-3 mr-1 text-rose-400" />
                        {apt.hospital?.name || 'Apollo Hospital & Medical Center'}
                      </span>
                      <span>
                        Attending: Dr. {doctor?.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : 'Sophia Chen'} ({doctor?.specialization || 'Cardiology'})
                      </span>
                      <span>
                        Time: <span className="font-mono text-brand-300">{new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="flex items-center space-x-2 self-end md:self-auto">
                  <button
                    onClick={() => handleStartConsultation(apt.id)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan flex items-center space-x-1 transition-all"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Start Consultation</span>
                  </button>

                  {apt.type === 'telehealth' && (
                    <Link
                      to={`/telehealth?room=${apt.telehealthRoomId || 'demo-room'}`}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center space-x-1.5 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Consultation</span>
                    </Link>
                  )}

                  {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusChange(apt.id, 'cancelled')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 hover:text-rose-300 text-slate-500 text-xs font-semibold border border-slate-800 transition-colors"
                      title="Cancel Appointment"
                    >
                      Cancel
                    </button>
                  )}

                  <Link
                    to={`/clinical-notes?appointmentId=${apt.id}&patientId=${apt.patientId}`}
                    className="px-3 py-1.5 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/40 text-xs font-bold transition-colors"
                  >
                    SOAP Note
                  </Link>

                  {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusChange(apt.id, 'completed')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Booking Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-card rounded-2xl border border-slate-700 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Book Appointment</h3>
              <button onClick={() => setIsBookingOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualBook} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Select Patient</label>
                <select
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 focus:outline-none"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Select Doctor</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 focus:outline-none"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user?.firstName || 'Sophia'} {d.user?.lastName || 'Chen'} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Visit Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 focus:outline-none"
                  >
                    <option value="in_person">In-Person Clinic</option>
                    <option value="telehealth">Virtual Telehealth</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reason for Encounter</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hypertension review, Routine checkup"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold shadow-glow-cyan"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Autonomous Scheduling Agent Modal */}
      {isAgentBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl glass-card rounded-2xl border border-purple-500/40 p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Appointment Scheduling Agent</h3>
                  <p className="text-[10px] text-purple-300 font-mono">Autonomous Slot Optimization & Triage</p>
                </div>
              </div>
              <button onClick={() => setIsAgentBookingOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Patient</label>
                <select
                  value={agentForm.patientId}
                  onChange={(e) => setAgentForm({ ...agentForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 focus:outline-none"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Patient Reported Symptoms / Clinical Request</label>
                <textarea
                  rows={3}
                  value={agentForm.symptoms}
                  onChange={(e) => setAgentForm({ ...agentForm, symptoms: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRunSchedulingAgent}
                  disabled={agentRunning}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${agentRunning ? 'animate-spin' : ''}`} />
                  <span>{agentRunning ? 'Negotiating Slots...' : 'Run Scheduling Agent'}</span>
                </button>
              </div>

              {/* Agent Recommendation Result */}
              {agentRecommendation && (
                <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/40 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Optimal Slot Recommendation</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      Triage: {agentRecommendation.triageLevel || 'Routine'}
                    </span>
                  </div>

                  <p className="text-brand-300 font-mono text-sm">
                    Recommended: {new Date(agentRecommendation.recommendedSlot || new Date()).toLocaleString()}
                  </p>

                  <p className="text-slate-300 leading-relaxed">
                    {agentRecommendation.reasoning || 'Evaluated doctor workload and patient symptom history to allocate lowest-conflict slot.'}
                  </p>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleConfirmAgentBooking}
                      className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold"
                    >
                      Book Recommended Slot
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
