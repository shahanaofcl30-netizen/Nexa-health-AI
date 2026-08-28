import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
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
  MapPin,
  Pill,
  Shield,
  User,
  Video,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, Appointment, MedicationReminder, LabOrder } from '../../types/shared';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentPatient } from '../../hooks/usePatients';

export const PatientPortalPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { data: currentPatient, isLoading: loadingPatient } = useCurrentPatient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Profile completion form state
  const [completingProfile, setCompletingProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profileBloodGroup, setProfileBloodGroup] = useState('O+');

  const fetchPortalData = async (targetPatientId: string) => {
    setLoadingData(true);
    try {
      const [appointmentsRes, remindersRes, labsRes, prescriptionsRes] = await Promise.all([
        api.get(`/appointments?patientId=${targetPatientId}`),
        api.get(`/communications/reminders?patientId=${targetPatientId}`),
        api.get(`/labs?patientId=${targetPatientId}`),
        api.get(`/prescriptions?patientId=${targetPatientId}`),
      ]);

      setAppointments(appointmentsRes.data);
      setReminders(remindersRes.data);
      setLabs(labsRes.data);
      setPrescriptions(prescriptionsRes.data);
    } catch (err) {
      console.error('Failed to load patient portal data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (currentPatient?.id) {
      fetchPortalData(currentPatient.id);
    }
  }, [currentPatient?.id]);

  const handleMarkTaken = async (reminderId: string) => {
    try {
      await api.put(`/communications/reminders/${reminderId}/status`, { status: 'taken' });
      if (currentPatient?.id) fetchPortalData(currentPatient.id);
    } catch (err) {
      console.error('Failed to update reminder:', err);
    }
  };

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-brand-400 mr-2" />
        <span>Loading your personal health portal...</span>
      </div>
    );
  }

  // If user has no patient profile yet
  if (!currentPatient) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in duration-200">
        <div className="p-8 rounded-3xl glass-card border border-amber-500/40 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border-2 border-amber-500 mx-auto flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
              Profile Setup Required
            </span>
            <h2 className="text-2xl font-black text-white">Profile not found. Please complete your profile.</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              We could not locate an active patient profile for <span className="font-mono text-cyan-300">{currentUser?.email}</span>. Complete your details below to activate your digital medical record.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCompletingProfile(true);
              try {
                await api.post('/patients', {
                  firstName: profileName.split(' ')[0] || 'Patient',
                  lastName: profileName.split(' ').slice(1).join(' ') || '',
                  phone: profilePhone,
                  dateOfBirth: '1995-01-01',
                  bloodGroup: profileBloodGroup,
                  email: currentUser?.email,
                });
                window.location.reload();
              } catch (err) {
                console.error('Failed to create profile:', err);
              } finally {
                setCompletingProfile(false);
              }
            }}
            className="space-y-4 text-left text-xs"
          >
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+91 98400 00000"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-xs placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Blood Group</label>
                <select
                  value={profileBloodGroup}
                  onChange={(e) => setProfileBloodGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white bg-slate-900 text-xs focus:outline-none"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={completingProfile}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 via-brand-400 to-teal-400 hover:from-brand-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
            >
              {completingProfile ? 'Saving Profile...' : 'Complete Profile & Open Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const patient = currentPatient;
  const displayName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ''}`.trim()
    : (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : (currentUser?.email ? currentUser.email.split('@')[0] : 'Patient'));
  const nextAppointment = appointments.find((a) => a.status === 'scheduled' || a.status === 'in_consultation');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-950/80 via-slate-900 to-teal-950/40 border border-brand-500/30 glass-card space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 font-mono">
              Patient Portal • MRN: {patient.mrn}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white mt-1">
              Welcome, {displayName}
            </h1>
            <p className="text-xs md:text-sm text-slate-300">
              Your centralized digital health records, daily medication tracker, and telehealth access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/hospitals"
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan flex items-center space-x-1.5 transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Find Hospital & Book</span>
            </Link>

            <Link
              to="/treatments"
              className="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold text-xs flex items-center space-x-1.5 transition-all"
            >
              <History className="w-4 h-4" />
              <span>My Treatments</span>
            </Link>

            <Link
              to="/pharmacies"
              className="px-4 py-2.5 rounded-xl bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-brand-300 font-bold text-xs flex items-center space-x-1.5 transition-all"
            >
              <Pill className="w-4 h-4" />
              <span>Nearby Pharmacies</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Box 1: Next Appointment */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next Appointment</span>
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          {nextAppointment ? (
            <div className="space-y-2">
              <p className="text-sm font-bold text-white">{nextAppointment.reason}</p>
              <p className="text-xs text-brand-300 font-mono">
                {new Date(nextAppointment.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p className="text-xs text-slate-400">
                Dr. Sophia Chen • {nextAppointment.type === 'telehealth' ? 'Virtual Video Visit' : 'In-Person Clinic'}
              </p>
              {nextAppointment.type === 'telehealth' && (
                <Link
                  to={`/telehealth?room=${nextAppointment.telehealthRoomId || 'demo-room'}`}
                  className="mt-2 flex items-center justify-center space-x-2 w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-colors"
                >
                  <Video className="w-4 h-4" />
                  <span>Enter Telehealth Waiting Room</span>
                </Link>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4">No upcoming appointments scheduled.</p>
          )}
        </div>

        {/* Box 2: Today's Medication Reminders */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medication Tracker</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">
                    {rem.medicationName} <span className="text-brand-300 font-normal">({rem.dosage})</span>
                  </p>
                  <p className="text-[10px] text-slate-400">Scheduled: {rem.scheduledTime}</p>
                </div>

                {rem.status === 'taken' ? (
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Taken</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleMarkTaken(rem.id)}
                    className="px-2.5 py-1 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/40 text-[10px] font-bold transition-colors"
                  >
                    Mark Taken
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Box 3: AI Health Brief for Patient */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Health Summary</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            "{patient.livingSummary || 'No summary compiled.'}"
          </p>

          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Allergies:</span>
            <span className="text-rose-400 font-bold">{patient.allergies?.join(', ') || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Recent Lab Results & Plain Language AI Explanations */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm text-white">Recent Lab Test Results</h2>
            <p className="text-xs text-slate-400">Reviewed by LabReportAgent with plain-language explanations</p>
          </div>
          <Link to="/labs" className="text-xs text-brand-400 hover:underline">
            View All Labs
          </Link>
        </div>

        {labs.slice(0, 1).map((lab) => (
          <div key={lab.id} className="space-y-3">
            {lab.aiAnalysis && (
              <div className="p-3.5 rounded-xl bg-brand-950/40 border border-brand-500/30 text-xs space-y-1">
                <span className="font-bold text-brand-400 flex items-center space-x-1.5">
                  <Bot className="w-4 h-4" />
                  <span>Plain Language Clinical Explanation</span>
                </span>
                <p className="text-slate-200 leading-relaxed">{lab.aiAnalysis.plainLanguageSummary}</p>
                <p className="text-[11px] text-brand-300 pt-1">
                  <strong>Recommended Next Step:</strong> {lab.aiAnalysis.suggestedFollowUp}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {lab.tests?.map((test) => (
                <div key={test.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold">{test.testName}</span>
                  <div className="flex items-center justify-between">
                    <span className={`text-base font-bold font-mono ${test.isAbnormal ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {test.resultValue} {test.unit}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Ref: {test.referenceRange}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Box 4: My Active Medications (Added per requirements) */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h2 className="font-bold text-sm text-white">My Active Medications</h2>
            <p className="text-xs text-slate-400">Current prescribed medications from your consultations</p>
          </div>
        </div>

        {prescriptions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            No active medications prescribed.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((rx) => (
              rx.items?.map((item: any, idx: number) => (
                <div key={`${rx.id}-${idx}`} className="p-4 rounded-xl bg-slate-900/60 border border-brand-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Pill className="w-4 h-4 text-brand-400" />
                      <span className="font-bold text-sm text-white">{item.medicationName}</span>
                    </div>
                    <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                      {rx.status === 'signed' || rx.status === 'issued' ? 'Active' : rx.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Dosage:</span>
                      <p className="font-mono text-slate-300">{item.dosage}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Frequency:</span>
                      <p className="font-mono text-slate-300">{item.frequency}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Duration:</span>
                      <p className="font-mono text-slate-300">{item.durationDays ? `${item.durationDays} Days` : 'Ongoing'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Start Date:</span>
                      <p className="font-mono text-slate-300">{new Date(rx.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500 font-medium">Instructions:</span>
                    <p className="text-xs text-slate-300 italic">"{item.instructions}"</p>
                  </div>
                </div>
              ))
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
