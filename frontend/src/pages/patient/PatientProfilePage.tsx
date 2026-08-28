import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  Pill,
  Plus,
  RefreshCw,
  Shield,
  User,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, Vitals, ClinicalNote, Prescription, LabOrder, Invoice, ClinicalAlert } from '../../types/shared';

export const PatientProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'vitals' | 'prescriptions' | 'labs' | 'billing'>('overview');
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);

  // Vitals form
  const [vitalsForm, setVitalsForm] = useState({
    heartRateBpm: 72,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    respiratoryRate: 16,
    temperatureCelsius: 36.8,
    oxygenSaturationPercent: 99.0,
    weightKg: 65,
    heightCm: 170,
  });
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  const fetchPatientDetails = async () => {
    try {
      const targetId = id && id !== 'me' ? id : 'me';
      const res = await api.get(`/patients/${targetId}`);
      setPatient(res.data);
    } catch (err) {
      console.error('Failed to fetch patient:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [id]);

  const handleRefreshSummary = async () => {
    if (!id) return;
    setSummarizing(true);
    try {
      const res = await api.post(`/patients/${id}/summarize`);
      if (res.data.livingSummary) {
        setPatient((prev: any) => ({ ...prev, livingSummary: res.data.livingSummary }));
      }
    } catch (err) {
      console.error('Failed to summarize patient:', err);
    } finally {
      setSummarizing(false);
    }
  };

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await api.post(`/patients/${id}/vitals`, vitalsForm);
      setShowVitalsModal(false);
      fetchPatientDetails();
    } catch (err) {
      console.error('Failed to record vitals:', err);
    }
  };

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-brand-400 mr-2" />
        <span>Loading patient chart...</span>
      </div>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Patient Header Card */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-500 border border-brand-400/40 flex items-center justify-center text-xl font-bold text-slate-950">
              {patient.firstName?.[0]}
              {patient.lastName?.[0]}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-black text-white">
                  {patient.firstName} {patient.lastName}
                </h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {patient.mrn}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {age} years old ({new Date(patient.dateOfBirth).toLocaleDateString()}) • {patient.gender} • Blood Group:{' '}
                <span className="text-brand-400 font-bold">{patient.bloodGroup || 'O+'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setShowVitalsModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold"
            >
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span>Record Vitals</span>
            </button>
            <Link
              to={`/clinical-notes?patientId=${patient.id}`}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-cyan"
            >
              <FileText className="w-4 h-4" />
              <span>New SOAP Encounter</span>
            </Link>
          </div>
        </div>

        {/* Demographics & Critical Flags */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Allergies</span>
            <span className="font-bold text-rose-400">
              {patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'None'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Chronic Conditions</span>
            <span className="font-semibold text-slate-200">
              {patient.chronicConditions?.length > 0 ? patient.chronicConditions.join(', ') : 'None'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Insurance</span>
            <span className="font-semibold text-cyan-300 truncate block">
              {patient.insuranceProvider || 'Self-pay'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-500 block text-[10px] uppercase">Emergency Contact</span>
            <span className="font-semibold text-slate-200">
              {patient.emergencyContactName ? `${patient.emergencyContactName} (${patient.emergencyContactRelation})` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Autonomous Living Summary Card */}
      <div className="p-5 rounded-2xl glass-card border border-brand-500/30 bg-gradient-to-r from-brand-950/30 via-slate-900 to-slate-900 space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">AI Living Clinical Brief</h3>
              <p className="text-[10px] text-slate-400">Maintained autonomously by PatientRecordSummaryAgent</p>
            </div>
          </div>

          <button
            onClick={handleRefreshSummary}
            disabled={summarizing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-brand-300 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${summarizing ? 'animate-spin' : ''}`} />
            <span>{summarizing ? 'Synthesizing...' : 'Refresh AI Summary'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          "{patient.livingSummary || 'No clinical summary generated yet. Click refresh to synthesize history.'}"
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
        {[
          { key: 'overview', label: 'Overview & Vitals', icon: HeartPulse },
          { key: 'notes', label: `Clinical Encounters (${patient.clinicalNotes?.length || 0})`, icon: FileText },
          { key: 'prescriptions', label: `Prescriptions (${patient.prescriptions?.length || 0})`, icon: Pill },
          { key: 'labs', label: `Lab Reports (${patient.labOrders?.length || 0})`, icon: FlaskConical },
          { key: 'billing', label: `Invoices (${patient.invoices?.length || 0})`, icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Overview & Vitals */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span>Latest Vitals History</span>
            </h3>

            {patient.vitals?.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No vitals logged yet for this patient.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {patient.vitals?.map((v: Vitals & { id: string }, idx: number) => (
                  <React.Fragment key={v.id || idx}>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block uppercase">Blood Pressure</span>
                      <span className="text-base font-extrabold text-white">
                        {v.bloodPressureSystolic}/{v.bloodPressureDiastolic} <span className="text-[10px] font-normal text-slate-400">mmHg</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block uppercase">Heart Rate</span>
                      <span className="text-base font-extrabold text-brand-400">
                        {v.heartRateBpm} <span className="text-[10px] font-normal text-slate-400">BPM</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block uppercase">Oxygen (SpO2)</span>
                      <span className="text-base font-extrabold text-emerald-400">
                        {v.oxygenSaturationPercent}%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 block uppercase">BMI / Weight</span>
                      <span className="text-base font-extrabold text-purple-400">
                        {v.bmi || '22.9'} <span className="text-[10px] font-normal text-slate-400">({v.weightKg} kg)</span>
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Clinical Encounters (SOAP) */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {patient.clinicalNotes?.map((note: ClinicalNote) => (
            <div key={note.id} className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-white">
                    Encounter Date: {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                    {note.status}
                  </span>
                  {note.aiGenerated && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-brand-500/20 text-brand-300">
                      AI Generated
                    </span>
                  )}
                </div>
                {note.signedAt && (
                  <span className="text-[10px] text-slate-400">
                    Signed at: {new Date(note.signedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="font-bold text-brand-400 uppercase text-[10px]">Subjective</span>
                  <p className="text-slate-300">{note.subjective}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="font-bold text-brand-400 uppercase text-[10px]">Objective</span>
                  <p className="text-slate-300">{note.objective}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="font-bold text-brand-400 uppercase text-[10px]">Assessment</span>
                  <p className="text-slate-300 whitespace-pre-wrap">{note.assessment}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="font-bold text-brand-400 uppercase text-[10px]">Plan</span>
                  <p className="text-slate-300 whitespace-pre-wrap">{note.plan}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content 3: Prescriptions */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {patient.prescriptions?.map((rx: Prescription) => (
            <div key={rx.id} className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <div>
                  <span className="font-bold text-white">Rx Diagnosis: {rx.diagnosis}</span>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {rx.id}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded uppercase font-mono bg-emerald-500/20 text-emerald-300">
                  {rx.status}
                </span>
              </div>

              <div className="space-y-2">
                {rx.items?.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-brand-300 text-sm">
                        {item.medicationName} ({item.dosage})
                      </p>
                      <p className="text-slate-400 text-[11px]">{item.instructions} • {item.frequency}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{item.durationDays} Days</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content 4: Lab Reports */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          {patient.labOrders?.map((lab: LabOrder) => (
            <div key={lab.id} className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-white">Lab Order #{lab.id.slice(0, 8)}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-cyan-500/20 text-cyan-300">
                  {lab.status}
                </span>
              </div>

              {lab.aiAnalysis && (
                <div className="p-3 rounded-xl bg-brand-950/40 border border-brand-500/30 text-xs space-y-1">
                  <span className="font-bold text-brand-400 flex items-center space-x-1">
                    <Bot className="w-3.5 h-3.5" />
                    <span>AI Lab Explanation (LabReportAgent)</span>
                  </span>
                  <p className="text-slate-300 leading-relaxed">{lab.aiAnalysis.plainLanguageSummary}</p>
                </div>
              )}

              <div className="space-y-1.5">
                {lab.tests?.map((test) => (
                  <div key={test.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{test.testName}</span>
                    <div className="flex items-center space-x-3">
                      <span className={`font-bold font-mono ${test.isAbnormal ? 'text-rose-400' : 'text-emerald-400'}`}>
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
      )}

      {/* Tab Content 5: Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          {patient.invoices?.map((inv: Invoice) => (
            <div key={inv.id} className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <div>
                  <span className="font-bold text-white">{inv.invoiceNumber}</span>
                  <p className="text-[10px] text-slate-400">Due: {inv.dueDate}</p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                    inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {inv.status}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                {inv.items?.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 text-slate-300">
                    <span>{it.description}</span>
                    <span className="font-mono">${it.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-white">
                <span>Patient Payable</span>
                <span className="text-brand-400 font-mono text-sm">${inv.patientPayable.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vitals Recording Modal */}
      {showVitalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl border border-slate-700 p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span>Record New Vitals</span>
            </h3>

            <form onSubmit={handleRecordVitals} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={vitalsForm.bloodPressureSystolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureSystolic: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={vitalsForm.bloodPressureDiastolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureDiastolic: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Heart Rate (BPM)</label>
                  <input
                    type="number"
                    value={vitalsForm.heartRateBpm}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, heartRateBpm: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitalsForm.oxygenSaturationPercent}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, oxygenSaturationPercent: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVitalsModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold"
                >
                  Save Vitals
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
