import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
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
  Stethoscope,
  User,
  Video,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, Appointment, MedicationReminder, LabOrder, Treatment } from '../../types/shared';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentPatient } from '../../hooks/usePatients';

export const PatientPortalPage: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { data: currentPatient, isLoading: loadingPatient } = useCurrentPatient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Dynamic full name from authenticated patient profile
  const dynamicAuthenticatedName = (() => {
    if (currentPatient?.firstName) {
      return `${currentPatient.firstName} ${currentPatient.lastName || ''}`.trim();
    }
    if (currentUser?.firstName || currentUser?.lastName) {
      const full = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      if (full.toLowerCase() !== 'patient user' && full.toLowerCase() !== 'user') return full;
    }
    if (currentUser?.email) {
      const emailPrefix = currentUser.email.split('@')[0];
      return emailPrefix.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return 'Patient';
  })();

  const fetchPortalData = async (targetPatientId: string) => {
    setLoadingData(true);
    try {
      const [appointmentsRes, remindersRes, labsRes, prescriptionsRes, treatmentsRes, invoicesRes] = await Promise.all([
        api.get(`/appointments?patientId=${targetPatientId}`),
        api.get(`/communications/reminders?patientId=${targetPatientId}`),
        api.get(`/labs?patientId=${targetPatientId}`),
        api.get(`/prescriptions?patientId=${targetPatientId}`),
        api.get(`/treatments?patientId=${targetPatientId}`),
        api.get(`/billing/invoices?patientId=${targetPatientId}`),
      ]);

      setAppointments(appointmentsRes.data || []);
      setReminders(remindersRes.data || []);
      setLabs(labsRes.data || []);
      setPrescriptions(prescriptionsRes.data || []);
      setTreatments(treatmentsRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (err) {
      console.error('Failed to load patient portal data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const effectiveId = currentPatient?.id || currentUser?.id;
    if (effectiveId) {
      fetchPortalData(effectiveId);
    }
  }, [currentPatient?.id, currentUser?.id]);

  const handleMarkTaken = async (reminderId: string) => {
    try {
      await api.put(`/communications/reminders/${reminderId}/status`, { status: 'taken' });
      const effectiveId = currentPatient?.id || currentUser?.id;
      if (effectiveId) fetchPortalData(effectiveId);
    } catch (err) {
      console.error('Failed to update reminder:', err);
    }
  };

  // Effective patient record
  const effectivePatient: Patient = currentPatient || {
    id: currentUser?.id || 'patient-user',
    userId: currentUser?.id,
    mrn: `NX-${new Date().getFullYear()}-${currentUser?.id?.slice(0, 4) || '1001'}`,
    firstName: currentUser?.firstName || currentUser?.email?.split('@')[0] || 'Patient',
    lastName: currentUser?.lastName || '',
    dateOfBirth: '1995-01-01',
    gender: 'undisclosed',
    bloodGroup: 'O+',
    phone: currentUser?.phone || '+91 98400 00000',
    email: currentUser?.email || 'patient@nexahealth.ai',
    address: 'Tamil Nadu, India',
    emergencyContactName: 'Family Contact',
    emergencyContactPhone: '+91 98400 00001',
    emergencyContactRelation: 'Family',
    allergies: [],
    chronicConditions: [],
    livingSummary: `Personal digital health profile.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const patient = effectivePatient;
  const displayName = dynamicAuthenticatedName;
  const nextAppointment = appointments.find((a) => a.status === 'scheduled' || a.status === 'in_consultation');

  // Billing calculations
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + (i.patientPayable || 0), 0);
  const totalOutstanding = invoices.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + (i.patientPayable || 0), 0);

  return (
    <div className="space-y-6">
      {/* Patient Welcome & Demographic Profile Banner */}
      <div className="p-6 rounded-3xl bg-white border border-secondary shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-secondary/30 text-slate-800 uppercase font-mono">
                MRN: {patient.mrn}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Verified Patient
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Welcome, {displayName}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              DOB: <strong className="text-slate-800">{patient.dateOfBirth}</strong> • Gender:{' '}
              <strong className="text-slate-800 capitalize">{patient.gender}</strong> • Blood Group:{' '}
              <strong className="text-primary font-mono">{patient.bloodGroup || 'O+'}</strong> • Phone:{' '}
              <strong className="text-slate-800">{patient.phone || '+91 98400 00000'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/hospitals"
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
            >
              <Building2 className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>

            <Link
              to="/records-vault"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-secondary/20 border border-secondary text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-all"
            >
              <History className="w-4 h-4" />
              <span>Medical Records</span>
            </Link>

            <Link
              to="/pharmacies"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-secondary/20 border border-secondary text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-all"
            >
              <MapPin className="w-4 h-4" />
              <span>Find Pharmacy</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Appointment Card */}
        <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Next Appointment</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>

          {nextAppointment ? (
            <div className="space-y-2 text-xs">
              <p className="text-sm font-bold text-slate-900">{nextAppointment.reason}</p>
              <p className="text-slate-700 font-medium">
                {new Date(nextAppointment.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p className="text-slate-500">
                Facility: <strong>Apollo Health & Medical Center</strong>
              </p>
              <p className="text-slate-500">
                Type: <strong>{nextAppointment.type === 'telehealth' ? 'Telehealth Video Visit' : 'In-Person Clinic Visit'}</strong>
              </p>
              {nextAppointment.type === 'telehealth' && (
                <Link
                  to={`/telehealth?room=${nextAppointment.telehealthRoomId || 'demo-room'}`}
                  className="mt-2 flex items-center justify-center space-x-2 w-full py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Video Call</span>
                </Link>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4">No upcoming appointments.</p>
          )}
        </div>

        {/* Today's Medication Reminders */}
        <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Medication Reminders</span>
            <div className="w-8 h-8 rounded-xl bg-secondary/30 text-slate-700 flex items-center justify-center">
              <Pill className="w-4 h-4 text-primary" />
            </div>
          </div>

          {reminders.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">No medication reminders scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-3 rounded-xl bg-secondary/10 border border-secondary flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {rem.medicationName} <span className="text-slate-500 font-normal">({rem.dosage})</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Scheduled: {rem.scheduledTime}</p>
                  </div>

                  {rem.status === 'taken' ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Taken</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkTaken(rem.id)}
                      className="px-3 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white text-[10px] font-bold transition-colors shadow-sm"
                    >
                      Mark Taken
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Health Brief & Allergies */}
        <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Health Summary</span>
            <div className="w-8 h-8 rounded-xl bg-secondary/30 text-slate-700 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed bg-secondary/10 p-3 rounded-xl border border-secondary font-medium">
            "{patient.livingSummary || 'Personal digital health record profile active.'}"
          </p>

          <div className="pt-2 flex items-center justify-between text-xs border-t border-secondary">
            <span className="text-slate-600 font-bold">Documented Allergies:</span>
            <span className="text-rose-600 font-bold">
              {patient.allergies?.length ? patient.allergies.join(', ') : 'No known drug allergies'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Prescriptions & Medications */}
      <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-secondary pb-3">
          <div>
            <h2 className="font-bold text-base text-slate-900">Current Medications & Prescriptions</h2>
            <p className="text-xs text-slate-500">Active formulations prescribed by your attending physicians</p>
          </div>
          <Link to="/prescriptions" className="text-xs text-primary font-bold hover:underline">
            View Rx Studio
          </Link>
        </div>

        {prescriptions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-secondary/10 rounded-xl border border-secondary">
            No active prescriptions recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {prescriptions.map((rx) =>
              rx.items?.map((item: any, idx: number) => (
                <div key={`${rx.id}-${idx}`} className="p-4 rounded-xl bg-secondary/10 border border-secondary space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Pill className="w-4 h-4 text-primary" />
                      <span className="font-bold text-slate-900">{item.medicationName}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 uppercase">
                      {rx.status || 'Active'}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-700 pt-1">
                    <p><strong className="text-slate-900">Dosage:</strong> {item.dosage} • <strong className="text-slate-900">Frequency:</strong> {item.frequency}</p>
                    {item.instructions && (
                      <p className="text-slate-600 bg-white/60 p-1.5 rounded border border-secondary">
                        <strong className="text-slate-800">Sig:</strong> {item.instructions}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Recent Lab Results */}
      <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-secondary pb-3">
          <div>
            <h2 className="font-bold text-base text-slate-900">Recent Laboratory Results</h2>
            <p className="text-xs text-slate-500">Diagnostic lab tests and biomarker evaluations</p>
          </div>
          <Link to="/labs" className="text-xs text-primary font-bold hover:underline">
            View All Lab Reports
          </Link>
        </div>

        {labs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-secondary/10 rounded-xl border border-secondary">
            No lab results available.
          </div>
        ) : (
          <div className="space-y-3">
            {labs.slice(0, 2).map((lab) => (
              <div key={lab.id} className="p-4 rounded-xl bg-secondary/10 border border-secondary space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs text-slate-900">
                      {lab.tests?.map((t) => t.testName).join(', ')}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-secondary uppercase">
                    {lab.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {lab.tests?.map((test) => (
                    <div
                      key={test.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        test.isAbnormal ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-secondary text-slate-800'
                      }`}
                    >
                      <span className="font-semibold truncate">{test.testName}</span>
                      <span className={`font-mono font-bold ${test.isAbnormal ? 'text-rose-600' : 'text-slate-900'}`}>
                        {test.resultValue ? `${test.resultValue} ${test.unit}` : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consultation & Clinical History */}
      <div className="p-5 rounded-2xl bg-white border border-secondary shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-secondary pb-3">
          <div>
            <h2 className="font-bold text-base text-slate-900">Clinical Consultation History</h2>
            <p className="text-xs text-slate-500">Physician encounter diagnoses, clinical notes, and treatment plans</p>
          </div>
          <Link to="/records-vault" className="text-xs text-primary font-bold hover:underline">
            Open Medical Records Vault
          </Link>
        </div>

        {treatments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-secondary/10 rounded-xl border border-secondary">
            No clinical consultations recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {treatments.slice(0, 3).map((t) => (
              <div key={t.id} className="p-4 rounded-xl bg-secondary/10 border border-secondary space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Stethoscope className="w-4 h-4 text-primary" />
                    <span className="font-bold text-slate-900">{t.diagnosis || 'Clinical Consultation'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {t.treatmentDetails && (
                  <p className="text-slate-700">
                    <strong className="text-slate-900">Treatment Plan:</strong> {t.treatmentDetails}
                  </p>
                )}

                {t.clinicalNotes && (
                  <p className="text-slate-600 bg-white/70 p-2 rounded border border-secondary">
                    <strong className="text-slate-800">Doctor's Notes:</strong> {t.clinicalNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
