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
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="p-8 rounded-3xl bg-white border border-secondary text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-secondary/50 text-slate-700 mx-auto flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Profile Setup
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Please complete your profile.</h2>
            <p className="text-sm text-slate-600">
              We need a few details to activate your digital medical record.
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
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+91 98400 00000"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Blood Group</label>
                <select
                  value={profileBloodGroup}
                  onChange={(e) => setProfileBloodGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-slate-900 bg-white text-sm focus:outline-none"
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
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {completingProfile ? 'Saving...' : 'Complete Profile'}
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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-white border border-secondary shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-slate-700 uppercase">
              Patient Portal • MRN: {patient.mrn}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              Welcome, {displayName}
            </h1>
            <p className="text-sm text-slate-600">
              Your health records, medicines, and appointments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/hospitals"
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm flex items-center space-x-1.5 transition-all"
            >
              <Building2 className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>

            <Link
              to="/treatments"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-secondary/20 border border-secondary text-slate-700 font-bold text-sm flex items-center space-x-1.5 transition-all"
            >
              <History className="w-4 h-4" />
              <span>View Treatments</span>
            </Link>

            <Link
              to="/pharmacies"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-secondary/20 border border-secondary text-slate-700 font-bold text-sm flex items-center space-x-1.5 transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span>Find Pharmacy</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Box 1: Next Appointment */}
        <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Next Appointment</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          {nextAppointment ? (
            <div className="space-y-2">
              <p className="text-base font-bold text-slate-900">{nextAppointment.reason}</p>
              <p className="text-sm text-slate-700">
                {new Date(nextAppointment.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p className="text-sm text-slate-600">
                {nextAppointment.type === 'telehealth' ? 'Video Visit' : 'Clinic Visit'}
              </p>
              {nextAppointment.type === 'telehealth' && (
                <Link
                  to={`/telehealth?room=${nextAppointment.telehealthRoomId || 'demo-room'}`}
                  className="mt-2 flex items-center justify-center space-x-2 w-full py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm transition-colors"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Video Call</span>
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4">No upcoming appointments.</p>
          )}
        </div>

        {/* Box 2: Today's Medication Reminders */}
        <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Take Your Medicines</span>
            <div className="w-8 h-8 rounded-xl bg-secondary/50 text-slate-700 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-3 rounded-xl bg-secondary/20 border border-secondary flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {rem.medicationName} <span className="text-slate-600 font-normal">({rem.dosage})</span>
                  </p>
                  <p className="text-xs text-slate-500">Scheduled: {rem.scheduledTime}</p>
                </div>

                {rem.status === 'taken' ? (
                  <span className="flex items-center space-x-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Taken</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleMarkTaken(rem.id)}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors"
                  >
                    Mark Taken
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Box 3: Health Brief for Patient */}
        <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Health Summary</span>
            <div className="w-8 h-8 rounded-xl bg-secondary/50 text-slate-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed bg-secondary/20 p-3 rounded-xl border border-secondary">
            "{patient.livingSummary || 'No summary available.'}"
          </p>

          <div className="pt-1 flex items-center justify-between text-sm border-t border-secondary mt-2">
            <span className="text-slate-600 mt-2">Allergies:</span>
            <span className="text-critical font-bold mt-2">{patient.allergies?.join(', ') || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Recent Lab Results */}
      <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Recent Lab Results</h2>
          </div>
          <Link to="/labs" className="text-sm text-primary hover:underline font-bold">
            View All
          </Link>
        </div>

        {labs.slice(0, 1).map((lab) => (
          <div key={lab.id} className="space-y-3">
            {lab.aiAnalysis && (
              <div className="p-3.5 rounded-xl bg-secondary/20 border border-secondary text-sm space-y-1">
                <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Bot className="w-4 h-4 text-primary" />
                  <span>Explanation</span>
                </span>
                <p className="text-slate-700 leading-relaxed">{lab.aiAnalysis.plainLanguageSummary}</p>
                <p className="text-sm text-slate-800 pt-1">
                  <strong>Next Step:</strong> {lab.aiAnalysis.suggestedFollowUp}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {lab.tests?.map((test) => (
                <div key={test.id} className="p-3 rounded-xl bg-secondary/10 border border-secondary text-sm space-y-1">
                  <span className="text-slate-700 font-semibold">{test.testName}</span>
                  <div className="flex items-center justify-between">
                    <span className={`text-base font-bold ${test.isAbnormal ? 'text-critical' : 'text-slate-900'}`}>
                      {test.resultValue} {test.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Box 4: My Active Medications (Added per requirements) */}
      <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-secondary pb-2">
          <div>
            <h2 className="font-bold text-lg text-slate-900">Your Medicines</h2>
          </div>
        </div>

        {prescriptions.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500 bg-secondary/10 rounded-xl border border-secondary">
            No active medicines.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((rx) => (
              rx.items?.map((item: any, idx: number) => (
                <div key={`${rx.id}-${idx}`} className="p-4 rounded-xl bg-secondary/10 border border-secondary space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Pill className="w-4 h-4 text-primary" />
                      <span className="font-bold text-base text-slate-900">{item.medicationName}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {rx.status === 'signed' || rx.status === 'issued' ? 'Active' : 'Ended'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div>
                      <span className="text-slate-600 block">Dose:</span>
                      <span className="font-medium text-slate-900">{item.dosage}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block">How often:</span>
                      <span className="font-medium text-slate-900">{item.frequency}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-600 block">Instructions:</span>
                      <span className="text-slate-900">{item.instructions}</span>
                    </div>
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
