import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  FileCheck,
  MapPin,
  Pill,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
  Printer,
  FileText,
} from 'lucide-react';
import api from '../../services/api';
import { Prescription, Patient, Medication, Pharmacy } from '../../types/shared';

export const PrescriptionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientIdParam = searchParams.get('patientId');

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientIdParam || '');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState('Essential (primary) hypertension');
  const [items, setItems] = useState<any[]>([
    {
      medicationName: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily in morning',
      durationDays: 30,
      instructions: 'Take with a glass of water every morning.',
    },
  ]);

  // AI Interaction Check state
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [interactionResult, setInteractionResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rxRes, patRes, medRes, pharmRes] = await Promise.all([
        api.get('/prescriptions'),
        api.get('/patients'),
        api.get('/prescriptions/medications'),
        api.get('/pharmacies'),
      ]);
      setPrescriptions(rxRes.data);
      setPatients(patRes.data);
      setMedications(medRes.data);
      setPharmacies(pharmRes.data);
      if (pharmRes.data.length > 0) {
        setSelectedPharmacyId(pharmRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load prescription data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = (med: Medication) => {
    setItems((prev) => [
      ...prev,
      {
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.strength,
        frequency: 'Once daily',
        durationDays: 14,
        instructions: med.standardDosage || 'Take as directed with food',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckInteractions = async () => {
    if (items.length === 0) return;
    setCheckingInteractions(true);
    try {
      const res = await api.post('/prescriptions/check-interactions', {
        patientId: selectedPatientId,
        medicationNames: items.map((i) => i.medicationName),
      });
      setInteractionResult(res.data.checkResult);
    } catch (err) {
      console.error('Interaction check failed:', err);
    } finally {
      setCheckingInteractions(false);
    }
  };

  const handleCreateAndSign = async () => {
    try {
      await api.post('/prescriptions', {
        patientId: selectedPatientId,
        doctorId: '40000000-0000-0000-0000-000000000001',
        pharmacyId: selectedPharmacyId,
        items,
        diagnosis,
        status: 'signed',
      });
      setIsCreateOpen(false);
      setInteractionResult(null);
      fetchData();
    } catch (err) {
      console.error('Failed to sign prescription:', err);
    }
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">E-Prescriptions Studio</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Rx Assistance Agent Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Autonomous allergy checking, drug-drug interaction matrix verification, and digital pharmacy dispatch
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Write E-Prescription</span>
        </button>
      </div>

      {/* Drug Reference Catalog Quick Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Hospital Formulary & Medication Catalog ({medications.length} Drugs Available)
        </span>
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          {medications.map((med) => (
            <div
              key={med.id}
              className="flex-shrink-0 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-2"
            >
              <Pill className="w-3.5 h-3.5 text-brand-400" />
              <div>
                <p className="font-bold text-white leading-tight">
                  {med.name} <span className="text-[10px] text-slate-400">({med.strength})</span>
                </p>
                <span className="text-[10px] text-slate-500">{med.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-3">
        {prescriptions.length === 0 ? (
          <div className="p-12 rounded-2xl glass-card border border-slate-800 text-center text-slate-500 text-xs">
            No e-prescriptions recorded yet.
          </div>
        ) : (
          prescriptions.map((rx) => {
            const patient = patients.find((p) => p.id === rx.patientId) || rx.patient;
            const pharmacy = pharmacies.find((ph) => ph.id === rx.pharmacyId) || (rx as any).pharmacy;

            return (
              <div
                key={rx.id}
                className="p-5 rounded-2xl glass-card border border-slate-800 glass-card-hover flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">
                      {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
                    </span>
                    <span className="text-xs font-mono text-slate-400">({patient?.mrn || 'NX-2026'})</span>
                    <span
                      className={`text-[9px] px-2 py-0.2 rounded font-mono uppercase font-bold ${
                        rx.status === 'signed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : rx.status === 'dispensed'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {rx.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-mono">
                    <span>RxID: {rx.id.split('-')[0].toUpperCase()}</span>
                    <span>Issued: {new Date(rx.createdAt || Date.now()).toLocaleDateString()}</span>
                    <span className="text-emerald-400 font-semibold uppercase">Physician: Signed / Approved</span>
                  </div>

                  <p className="text-xs text-brand-300 font-semibold">Diagnosis: {rx.diagnosis}</p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {rx.items?.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 flex items-center space-x-1.5"
                      >
                        <Pill className="w-3 h-3 text-emerald-400" />
                        <span>
                          {item.medicationName} {item.dosage} ({item.frequency} for {item.durationDays}d)
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center text-rose-300 font-semibold">
                      <Building2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
                      {rx.hospital?.name || 'Apollo Hospital & Medical Center'}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="w-3 h-3 mr-1 text-slate-500" />
                      Dispensing Station: {pharmacy?.name || 'Apollo Hospital Care Pharmacy'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-auto">
                  <button
                    onClick={() => {
                      alert(`Viewing Prescription Details for ${rx.id}\nDiagnosis: ${rx.diagnosis}\nItems: ${rx.items?.map(i => i.medicationName).join(', ')}`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => {
                      const hospId = rx.hospitalId || rx.hospital?.id;
                      if (hospId) {
                        navigate(`/pharmacies?hospitalId=${hospId}`);
                      } else {
                        navigate('/pharmacies');
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan flex items-center space-x-1.5 transition-all"
                  >
                    <Pill className="w-3.5 h-3.5" />
                    <span>Find Pharmacy</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Prescription Builder Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] glass-card rounded-2xl border border-slate-700 p-5 space-y-4 text-xs shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">E-Prescription Composer</h3>
                  <p className="text-[10px] text-slate-400">Prescription Assistance Agent Safety Checker</p>
                </div>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Patient & Pharmacy select */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Select Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    setInteractionResult(null);
                  }}
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
                <label className="block text-slate-400 mb-1">Target Pharmacy</label>
                <select
                  value={selectedPharmacyId}
                  onChange={(e) => setSelectedPharmacyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 focus:outline-none"
                >
                  {pharmacies.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name} ({ph.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Patient Allergy Alert Header */}
            {selectedPatient && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span>
                  Documented Allergies:{' '}
                  <strong className="text-rose-400">{selectedPatient.allergies?.join(', ') || 'None'}</strong>
                </span>
                <span className="text-slate-400">Conditions: {selectedPatient.chronicConditions?.join(', ') || 'None'}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1">Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
              />
            </div>

            {/* Prescribed Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Prescribed Medications ({items.length})</span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-slate-500">Quick Add:</span>
                  {medications.slice(0, 3).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleAddItem(m)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      + {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Medication name"
                      value={item.medicationName}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].medicationName = e.target.value;
                        setItems(next);
                      }}
                      className="px-2.5 py-1.5 rounded-lg glass-input text-white text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Dosage (e.g. 10mg)"
                      value={item.dosage}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx].dosage = e.target.value;
                        setItems(next);
                      }}
                      className="px-2.5 py-1.5 rounded-lg glass-input text-white text-xs"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        placeholder="Days (e.g. 30)"
                        value={item.durationDays}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx].durationDays = parseInt(e.target.value);
                          setItems(next);
                        }}
                        className="w-20 px-2.5 py-1.5 rounded-lg glass-input text-white text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Instructions (e.g. Take once daily with breakfast)"
                    value={item.instructions}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx].instructions = e.target.value;
                      setItems(next);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg glass-input text-white text-xs"
                  />
                </div>
              ))}
            </div>

            {/* AI Interaction Check Button */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCheckInteractions}
                disabled={checkingInteractions || items.length === 0}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all disabled:opacity-50"
              >
                <Bot className={`w-4 h-4 ${checkingInteractions ? 'animate-spin' : ''}`} />
                <span>{checkingInteractions ? 'Checking Safety...' : 'Run Prescription Agent Safety Check'}</span>
              </button>

              <button
                type="button"
                onClick={handleCreateAndSign}
                disabled={items.length === 0}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md transition-all"
              >
                <FileCheck className="w-4 h-4" />
                <span>Doctor Sign & Transmit Rx</span>
              </button>
            </div>

            {/* AI Interaction Results Banner */}
            {interactionResult && (
              <div
                className={`p-3.5 rounded-xl border space-y-1.5 animate-in fade-in ${
                  interactionResult.severity === 'severe'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : interactionResult.severity === 'moderate'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Prescription Safety Evaluation ({interactionResult.severity.toUpperCase()})</span>
                  </span>
                  <span className="text-[10px] font-mono">Agent Verified</span>
                </div>

                <ul className="text-xs list-disc pl-4 space-y-1">
                  {interactionResult.details?.map((detail: string, idx: number) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>

                <p className="text-[10px] opacity-80 pt-1">
                  {/* DISCLAIMER: Requires clinical validation, not a substitute for professional judgment */}
                  *Requires clinical validation, not a substitute for professional judgment.*
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
