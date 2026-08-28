import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileCheck,
  FileText,
  HeartPulse,
  Mic,
  MicOff,
  Pill,
  Save,
  Search,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, Vitals, ClinicalNote } from '../../types/shared';

export const SoapNotesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const appointmentIdParam = searchParams.get('appointmentId');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientIdParam || '');
  const [patient, setPatient] = useState<Patient | null>(null);

  // Dictation & SOAP State
  const [dictationText, setDictationText] = useState<string>(
    'Patient presents for 6-month hypertension review. Complains of mild morning dizziness when standing quickly in hot weather. Adherent with Lisinopril 10mg daily. Denies chest pressure, shortness of breath, or palpitations. Vitals BP 122/80, HR 72 regular, lungs clear.'
  );
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [signed, setSigned] = useState<boolean>(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  // Structured SOAP
  const [soapData, setSoapData] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    icd10Codes: [
      { code: 'I10', description: 'Essential (primary) hypertension' },
      { code: 'R42', description: 'Dizziness and giddiness' },
    ],
  });

  const [vitals, setVitals] = useState<Vitals>({
    heartRateBpm: 72,
    bloodPressureSystolic: 122,
    bloodPressureDiastolic: 80,
    respiratoryRate: 16,
    temperatureCelsius: 36.8,
    oxygenSaturationPercent: 99.0,
    weightKg: 64.5,
    heightCm: 168.0,
    bmi: 22.9,
    recordedAt: new Date().toISOString(),
  });

  useEffect(() => {
    api.get('/patients').then((res) => {
      setPatients(res.data);
      if (res.data.length > 0) {
        const found = res.data.find((p: any) => p.id === selectedPatientId) || res.data[0];
        setPatient(found);
      }
    });
  }, [selectedPatientId]);

  const handleToggleRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate live speech dictation insertion
      const sampleAddition = ' Follow-up CMP and lipid panel ordered. Increase daily hydration to 2.5 liters.';
      setTimeout(() => {
        setDictationText((prev) => prev + sampleAddition);
        setIsRecording(false);
      }, 3000);
    }
  };

  const handleGenerateSoap = async () => {
    if (!dictationText.trim()) return;
    setGenerating(true);
    try {
      const res = await api.post('/clinical-notes/generate-soap', {
        dictationText,
        patientId: selectedPatientId,
        appointmentId: appointmentIdParam || undefined,
        vitals,
      });

      const note = res.data.soapNote;
      setSoapData({
        subjective: note.subjective || '',
        objective: note.objective || '',
        assessment: note.assessment || '',
        plan: note.plan || '',
        icd10Codes: note.icd10Codes || soapData.icd10Codes,
      });
    } catch (err) {
      console.error('Failed to generate SOAP note:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSignNote = async () => {
    try {
      await api.post('/clinical-notes', {
        patientId: selectedPatientId,
        doctorId: '40000000-0000-0000-0000-000000000001',
        appointmentId: appointmentIdParam || undefined,
        subjective: soapData.subjective,
        objective: soapData.objective,
        assessment: soapData.assessment,
        plan: soapData.plan,
        vitals,
        icd10Codes: soapData.icd10Codes,
        aiGenerated: true,
        status: 'signed',
      });

      setSigned(true);
      setSignedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to sign clinical note:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Clinical Documentation Studio</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 font-mono">
              SOAP Architecture
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Converts clinician speech & shorthand into structured, signed EHR clinical notes with ICD-10 tagging
          </p>
        </div>

        {/* Patient Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400">Patient:</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="text-xs bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.mrn})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Clinical Context Banner */}
      {patient && (
        <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center font-bold">
              {patient.firstName?.[0]}
              {patient.lastName?.[0]}
            </div>
            <div>
              <p className="font-bold text-white">
                {patient.firstName} {patient.lastName}{' '}
                <span className="font-mono text-brand-400 font-normal">({patient.mrn})</span>
              </p>
              <div className="mt-2 text-[10px] bg-slate-900/60 p-2 rounded-lg border border-slate-700/50">
                <span className="text-slate-400">Allergies: </span>
                <span className="text-rose-400 font-semibold">{patient.allergies?.join(', ') || 'None'}</span> • Conditions:{' '}
                <span className="text-slate-200">{patient.chronicConditions?.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 font-mono text-[11px] bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>
              BP: <strong className="text-white">122/80</strong>
            </span>
            <span>
              HR: <strong className="text-brand-400">72 BPM</strong>
            </span>
            <span>
              SpO2: <strong className="text-emerald-400">99%</strong>
            </span>
          </div>
        </div>
      )}

      {/* Main Encounter Workspace: Left Dictation / Right Structured Note */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dictation & Shorthand Capture (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-300 flex items-center space-x-1.5">
                <Mic className="w-4 h-4 text-brand-400" />
                <span>Dictation / Clinician Shorthand</span>
              </span>

              <button
                onClick={handleToggleRecord}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-brand-400" />}
                <span>{isRecording ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={dictationText}
              onChange={(e) => setDictationText(e.target.value)}
              placeholder="Speak or type clinical shorthand, physical findings, and patient complaints here..."
              className="w-full p-3.5 rounded-xl glass-input text-xs text-slate-200 focus:outline-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-mono">
                {dictationText.split(' ').filter(Boolean).length} words captured
              </span>

              <button
                onClick={handleGenerateSoap}
                disabled={generating || !dictationText.trim()}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 hover:from-brand-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                <span>{generating ? 'Drafting SOAP Note...' : 'Generate AI SOAP Note'}</span>
              </button>
            </div>
          </div>

          {/* Quick ICD-10 Selector */}
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
            <span className="font-bold text-xs text-slate-300 flex items-center space-x-1.5">
              <Search className="w-4 h-4 text-cyan-400" />
              <span>Assigned ICD-10 Clinical Codes</span>
            </span>

            <div className="space-y-1.5">
              {soapData.icd10Codes.map((c, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="font-bold font-mono text-brand-400">{c.code}</span>
                  <span className="text-slate-300 text-[11px]">{c.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Structured SOAP Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">Structured SOAP Clinical Note</h3>
                <p className="text-[10px] text-slate-400">Editable EHR sections with instant clinical validation</p>
              </div>

              {signed ? (
                <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Electronically Signed at {signedAt}</span>
                </span>
              ) : (
                <button
                  onClick={handleSignNote}
                  disabled={!soapData.subjective && !soapData.assessment}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Doctor Sign-Off & Lock</span>
                </button>
              )}
            </div>

            {/* S: Subjective */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-400 uppercase tracking-wider">
                [S] Subjective — Chief Complaint & History
              </label>
              <textarea
                rows={3}
                value={soapData.subjective}
                onChange={(e) => setSoapData({ ...soapData, subjective: e.target.value })}
                placeholder="Patient history of present illness, adherence, and reported symptoms..."
                className="w-full p-3 rounded-xl glass-input text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {/* O: Objective */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-400 uppercase tracking-wider">
                [O] Objective — Physical Exam & Vitals
              </label>
              <textarea
                rows={3}
                value={soapData.objective}
                onChange={(e) => setSoapData({ ...soapData, objective: e.target.value })}
                placeholder="Physical examination, heart & lung auscultation, vitals observation..."
                className="w-full p-3 rounded-xl glass-input text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {/* A: Assessment */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-400 uppercase tracking-wider">
                [A] Assessment — Diagnosis & Clinical Impression
              </label>
              <textarea
                rows={3}
                value={soapData.assessment}
                onChange={(e) => setSoapData({ ...soapData, assessment: e.target.value })}
                placeholder="Differential diagnoses, acute vs chronic disease progression..."
                className="w-full p-3 rounded-xl glass-input text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {/* P: Plan */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-400 uppercase tracking-wider">
                [P] Plan — Orders, Prescriptions & Follow-up
              </label>
              <textarea
                rows={3}
                value={soapData.plan}
                onChange={(e) => setSoapData({ ...soapData, plan: e.target.value })}
                placeholder="Prescription changes, lab orders, lifestyle recommendations, next visit..."
                className="w-full p-3 rounded-xl glass-input text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {/* Clinical Disclaimer */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center space-x-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                <strong>Regulatory Notice:</strong> AI generated SOAP notes are assistive drafts. Clinician electronic signature certifies medical accuracy.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
