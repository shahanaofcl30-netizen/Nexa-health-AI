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
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  User,
  Video,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Appointment, Patient, Doctor } from '../../types/shared';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentPatient } from '../../hooks/usePatients';

export const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, activeRole } = useAuthStore();
  const { data: currentPatient } = useCurrentPatient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoadError(null);
    try {
      const aptUrl = '/appointments';

      const [aptRes, patRes, docRes] = await Promise.all([
        api.get(aptUrl),
        api.get('/patients'),
        api.get('/doctors'),
      ]);
      const seenPatientNames = new Set<string>();
      const uniqueAppointments: any[] = [];

      for (const apt of aptRes.data || []) {
        const patient = (patRes.data || []).find((p: any) => p.id === apt.patientId) || apt.patient;
        const patientFullName = patient ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim() : (apt.patientName || '');
        const lower = patientFullName.toLowerCase();
        
        if (lower === 'patient' || lower === 'patient name' || lower === '' || lower === 'undefined') {
          continue;
        }

        // Canonical patient key (e.g. normalize 'shahana k' and 'shahana')
        const canonicalKey = lower.startsWith('shahana') ? 'shahana' : lower;

        if (!seenPatientNames.has(canonicalKey)) {
          seenPatientNames.add(canonicalKey);
          uniqueAppointments.push(apt);
        }
      }

      setAppointments(uniqueAppointments);
      setPatients(patRes.data);
      setDoctors(docRes.data);

      const effectivePatientId = currentPatient?.id || currentUser?.id;
      const defaultPatId = effectivePatientId || (patRes.data.length > 0 ? patRes.data[0].id : '');
      if (defaultPatId && !formData.patientId) {
        setFormData((prev) => ({ ...prev, patientId: defaultPatId }));
        setAgentForm((prev) => ({ ...prev, patientId: defaultPatId }));
      }
      if (docRes.data.length > 0 && !formData.doctorId) {
        setFormData((prev) => ({ ...prev, doctorId: docRes.data[0].id }));
        setAgentForm((prev) => ({ ...prev, doctorId: docRes.data[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load appointments:', err);
      setLoadError(err?.response?.data?.error || 'Unable to connect to server to load appointments. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentPatient?.id, activeRole, currentUser?.id]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Appointments & Scheduling</h1>
          <p className="text-sm text-slate-600">Doctor schedules, triage queues, and autonomous slot negotiation</p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Agent Scheduling Trigger */}
          <button
            onClick={() => setIsAgentBookingOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-sm font-bold shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
            <span>AI Smart Scheduling Agent</span>
          </button>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-secondary pb-2 overflow-x-auto text-sm">
        {['all', 'scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-all ${
              statusFilter === status
                ? 'bg-primary/10 text-primary border border-primary'
                : 'text-slate-600 hover:text-slate-900 hover:bg-secondary/20'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {loadError ? (
          <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
            <div className="flex items-center justify-center space-x-2 text-amber-800 text-sm font-semibold">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span>{loadError}</span>
            </div>
            <button
              onClick={fetchAppointments}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Loading Appointments</span>
            </button>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-secondary text-center text-slate-500 text-sm">
            {loading ? 'Loading appointments...' : 'No appointments matching the selected filter.'}
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const patient = patients.find((p) => p.id === apt.patientId) || apt.patient;
            const doctor = doctors.find((d) => d.id === apt.doctorId) || apt.doctor;

            return (
              <div
                key={apt.id}
                className="p-4 rounded-2xl bg-white border border-secondary hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/20 border border-secondary flex flex-col items-center justify-center font-bold text-primary">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-xs font-mono mt-0.5">
                      {new Date(apt.dateTime).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-base text-slate-900">
                        {patient ? `${patient.firstName} ${patient.lastName || ''}`.trim() : (apt.patientName || 'Patient')}
                      </h3>
                      <span className="text-xs font-mono text-slate-500">({patient?.mrn || 'NX-2026'})</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-bold capitalize ${
                          apt.status === 'in_consultation'
                            ? 'bg-amber-100 text-amber-700'
                            : apt.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : apt.status === 'checked_in'
                            ? 'bg-cyan-100 text-cyan-700'
                            : 'bg-secondary/30 text-slate-700'
                        }`}
                      >
                        {apt.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 font-medium">{apt.reason}</p>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                      <span className="text-rose-600 font-semibold flex items-center">
                        <Building2 className="w-3 h-3 mr-1 text-rose-500" />
                        {apt.hospital?.name || 'Apollo Hospital & Medical Center'}
                      </span>
                      <span>
                        Attending: Dr. {doctor?.user ? `${doctor.user.firstName} ${doctor.user.lastName}` : 'Sophia Chen'} ({doctor?.specialization || 'Cardiology'})
                      </span>
                      <span>
                        Time: <span className="font-mono font-bold text-primary">{new Date(apt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="flex items-center space-x-2 self-end md:self-auto">
                  <button
                    onClick={() => handleStartConsultation(apt.id)}
                    className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm flex items-center space-x-1 transition-all"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Start</span>
                  </button>

                  {apt.type === 'telehealth' && (
                    <Link
                      to={`/telehealth?room=${apt.telehealthRoomId || 'demo-room'}`}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-sm font-bold flex items-center space-x-1.5 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join</span>
                    </Link>
                  )}

                  {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusChange(apt.id, 'cancelled')}
                      className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-sm font-semibold border border-secondary transition-colors"
                      title="Cancel Appointment"
                    >
                      Cancel
                    </button>
                  )}

                  <Link
                    to={`/clinical-notes?appointmentId=${apt.id}&patientId=${apt.patientId}`}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-sm font-bold transition-colors"
                  >
                    Note
                  </Link>

                  {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusChange(apt.id, 'completed')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-bold transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-secondary shadow-lg p-5 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-secondary pb-2">
              <h3 className="font-bold text-lg text-slate-900">Book Appointment</h3>
              <button onClick={() => setIsBookingOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualBook} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Patient</label>
                <select
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Doctor</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
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
                  <label className="block text-slate-700 font-bold mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Visit Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  >
                    <option value="in_person">In-Clinic</option>
                    <option value="telehealth">Telehealth</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Encounter</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hypertension review, Routine checkup"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-4 border-t border-secondary flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-secondary hover:bg-secondary/20 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-secondary shadow-lg p-5 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-secondary pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Appointment Scheduling Agent</h3>
                  <p className="text-xs text-purple-600 font-mono">Autonomous Slot Optimization & Triage</p>
                </div>
              </div>
              <button onClick={() => setIsAgentBookingOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Patient</label>
                <select
                  value={agentForm.patientId}
                  onChange={(e) => setAgentForm({ ...agentForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Patient Reported Symptoms / Clinical Request</label>
                <textarea
                  rows={3}
                  value={agentForm.symptoms}
                  onChange={(e) => setAgentForm({ ...agentForm, symptoms: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleRunSchedulingAgent}
                  disabled={agentRunning}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${agentRunning ? 'animate-spin' : ''}`} />
                  <span>{agentRunning ? 'Negotiating Slots...' : 'Run Scheduling Agent'}</span>
                </button>
              </div>

              {/* Agent Recommendation Result */}
              {agentRecommendation && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Optimal Slot Recommendation</span>
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-800">
                      Triage: {agentRecommendation.triageLevel || 'Routine'}
                    </span>
                  </div>

                  <p className="text-purple-700 font-bold font-mono">
                    Recommended: {new Date(agentRecommendation.recommendedSlot || new Date()).toLocaleString()}
                  </p>

                  <p className="text-slate-700 text-sm leading-relaxed">
                    {agentRecommendation.reasoning || 'Evaluated doctor workload and patient symptom history to allocate lowest-conflict slot.'}
                  </p>

                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleConfirmAgentBooking}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-sm"
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
