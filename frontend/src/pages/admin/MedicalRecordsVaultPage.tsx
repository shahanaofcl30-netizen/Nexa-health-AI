import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  FlaskConical,
  FolderLock,
  HeartPulse,
  Pill,
  Plus,
  Printer,
  Search,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, Treatment, Prescription, LabOrder } from '../../types/shared';

export const MedicalRecordsVaultPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState<'all' | 'consultation' | 'prescription' | 'lab' | 'document'>('all');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);

  // Upload Form
  const [uploadForm, setUploadForm] = useState({
    patientId: '',
    title: '',
    category: 'Clinical Summary / EHR',
    description: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [patRes, treatRes, rxRes, labRes, docRes] = await Promise.all([
        api.get('/patients'),
        api.get('/treatments'),
        api.get('/prescriptions'),
        api.get('/labs'),
        api.get('/admin/documents'),
      ]);

      const validPatients = (patRes.data || []).filter((p: any) => {
        const name = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
        return name !== 'emily davis' && name !== 'robert johnson' && name !== 'patient' && name !== 'patient name' && name.length > 0;
      });

      setPatients(validPatients);
      setTreatments(treatRes.data || []);
      setPrescriptions(rxRes.data || []);
      setLabOrders(labRes.data || []);
      setDocuments(docRes.data || []);

      if (validPatients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(validPatients[0].id);
        setUploadForm((prev) => ({ ...prev, patientId: validPatients[0].id }));
      }
    } catch (err) {
      console.error('Failed to load medical records vault:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Patients List for Search
  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.firstName} ${p.lastName || ''}`.toLowerCase();
    const mrn = (p.mrn || '').toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || mrn.includes(searchQuery.toLowerCase());
  });

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || filteredPatients[0] || patients[0];

  // Medical History Records for selected patient
  const patientTreatments = treatments.filter((t) => t.patientId === selectedPatient?.id || (selectedPatient?.userId && t.patientId === selectedPatient.userId));
  const patientPrescriptions = prescriptions.filter((p) => p.patientId === selectedPatient?.id || (selectedPatient?.userId && p.patientId === selectedPatient.userId));
  const patientLabs = labOrders.filter((l) => l.patientId === selectedPatient?.id || (selectedPatient?.userId && l.patientId === selectedPatient.userId));
  const patientDocs = documents.filter((d) => d.patientId === selectedPatient?.id || (selectedPatient?.userId && d.patientId === selectedPatient.userId));

  // Combined Chronological Timeline
  const timelineItems: any[] = [];

  patientTreatments.forEach((t) => {
    timelineItems.push({
      id: `treat-${t.id}`,
      type: 'consultation',
      date: t.createdAt || new Date().toISOString(),
      title: `Clinical Consultation — ${t.diagnosis || 'General Assessment'}`,
      doctor: t.doctor ? `Dr. ${(t.doctor as any).user?.firstName || (t.doctor as any).firstName || 'Sophia'} ${(t.doctor as any).user?.lastName || (t.doctor as any).lastName || 'Chen'}` : 'Dr. Sophia Chen (Attending Physician)',
      details: {
        symptoms: t.symptoms,
        diagnosis: t.diagnosis,
        treatmentDetails: t.treatmentDetails,
        clinicalNotes: t.clinicalNotes,
        medicines: t.medicines,
        followUpDate: t.followUpDate,
      },
    });
  });

  patientPrescriptions.forEach((rx) => {
    timelineItems.push({
      id: `rx-${rx.id}`,
      type: 'prescription',
      date: rx.createdAt || rx.signedAt || new Date().toISOString(),
      title: `Official Electronic Prescription (${rx.status.toUpperCase()})`,
      doctor: rx.doctor ? `Dr. ${(rx.doctor as any).firstName || (rx.doctor as any).user?.firstName || 'Sophia'} ${(rx.doctor as any).lastName || (rx.doctor as any).user?.lastName || 'Chen'}` : 'Dr. Sophia Chen',
      details: {
        diagnosis: rx.diagnosis,
        items: rx.items,
        notes: rx.notes,
        status: rx.status,
      },
    });
  });

  patientLabs.forEach((lab) => {
    timelineItems.push({
      id: `lab-${lab.id}`,
      type: 'lab',
      date: lab.orderedAt || new Date().toISOString(),
      title: `Diagnostic Lab Order — ${lab.tests?.map((t) => t.testName).join(', ')}`,
      doctor: lab.doctor ? `Dr. ${(lab.doctor as any).firstName || (lab.doctor as any).user?.firstName || 'Sophia'} ${(lab.doctor as any).lastName || (lab.doctor as any).user?.lastName || 'Chen'}` : 'Dr. Sophia Chen',
      details: {
        status: lab.status,
        tests: lab.tests,
        notes: lab.clinicalNotes,
        aiAnalysis: lab.aiAnalysis,
      },
    });
  });

  patientDocs.forEach((doc) => {
    timelineItems.push({
      id: `doc-${doc.id}`,
      type: 'document',
      date: doc.createdAt || new Date().toISOString(),
      title: `Medical Record Document — ${doc.title}`,
      doctor: 'Health Records Department',
      details: {
        category: doc.category,
        description: doc.description,
        fileUrl: doc.fileUrl,
      },
    });
  });

  // Sort descending by date
  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredTimeline = timelineItems.filter((item) => {
    if (recordTypeFilter === 'all') return true;
    return item.type === recordTypeFilter;
  });

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.patientId || !uploadForm.title) return;

    try {
      await api.post('/admin/documents', {
        ...uploadForm,
        fileUrl: `/documents/${uploadForm.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      });

      setIsUploadOpen(false);
      setUploadForm({
        patientId: selectedPatient?.id || '',
        title: '',
        category: 'Clinical Summary / EHR',
        description: '',
      });
      fetchData();
    } catch (err) {
      console.error('Failed to upload medical record document:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Medical Records Vault</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              EHR History Synced
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Encrypted longitudinal medical records, clinical consultations, e-prescriptions, diagnostic labs & EHR artifacts
          </p>
        </div>

        <button
          onClick={() => {
            if (selectedPatient) {
              setUploadForm((prev) => ({ ...prev, patientId: selectedPatient.id }));
            }
            setIsUploadOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-sm transition-all hover:scale-[1.02]"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Record Document</span>
        </button>
      </div>

      {/* Main Vault Split (Left: Patient Selector, Right: Comprehensive Patient Records) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patient Directory & Search (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Patients Directory</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/20 text-slate-700">
                {patients.length} Registered
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name or MRN..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-secondary bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-primary font-medium"
              />
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredPatients.map((patient) => {
                const isSelected = selectedPatient?.id === patient.id;
                return (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`p-3 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'bg-secondary/10 hover:bg-secondary/20 text-slate-800 border border-secondary'
                    }`}
                  >
                    <div className="space-y-0.5 truncate">
                      <p className="truncate text-xs font-bold">
                        {patient.firstName} {patient.lastName || ''}
                      </p>
                      <p className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                        {patient.mrn} • {patient.gender} • DOB {patient.dateOfBirth}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white border border-secondary text-primary'
                      }`}
                    >
                      {patient.bloodGroup || 'O+'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Patient EHR Dossier & Longitudinal Timeline (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedPatient ? (
            <>
              {/* Patient Demographics Hero Card */}
              <div className="p-6 rounded-2xl bg-white border border-secondary shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-secondary">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg">
                      {selectedPatient.firstName?.[0]}
                      {selectedPatient.lastName?.[0]}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {selectedPatient.firstName} {selectedPatient.lastName || ''}
                        </h2>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-secondary/10 text-primary border border-secondary">
                          {selectedPatient.mrn}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        DOB: <strong className="text-slate-800">{selectedPatient.dateOfBirth}</strong> • Gender:{' '}
                        <strong className="text-slate-800 capitalize">{selectedPatient.gender}</strong> • Blood Group:{' '}
                        <strong className="text-primary font-mono">{selectedPatient.bloodGroup || 'O+'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <p className="text-slate-500">
                      Phone: <span className="font-semibold text-slate-800">{selectedPatient.phone || '+91 98400 00000'}</span>
                    </p>
                    <p className="text-slate-500">
                      Email: <span className="font-semibold text-slate-800">{selectedPatient.email || 'patient@nexahealth.ai'}</span>
                    </p>
                  </div>
                </div>

                {/* Patient Summary & Documented Allergies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-secondary/10 border border-secondary space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Active EHR Clinical Summary
                    </span>
                    <p className="text-slate-800 font-medium">
                      {selectedPatient.livingSummary || 'Personal digital health record profile active.'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold text-rose-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Documented Allergies</span>
                    </div>
                    <p className="font-semibold">
                      {selectedPatient.allergies?.length ? selectedPatient.allergies.join(', ') : 'No known drug allergies'}
                    </p>
                  </div>
                </div>

                {/* Filter Tabs for Timeline */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-secondary">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Medical History Timeline ({filteredTimeline.length})
                  </span>

                  <div className="flex flex-wrap items-center gap-1 text-xs font-bold">
                    {[
                      { id: 'all', label: 'All Records' },
                      { id: 'consultation', label: 'Consultations' },
                      { id: 'prescription', label: 'Prescriptions' },
                      { id: 'lab', label: 'Lab Reports' },
                      { id: 'document', label: 'Documents' },
                    ].map((tab: any) => (
                      <button
                        key={tab.id}
                        onClick={() => setRecordTypeFilter(tab.id)}
                        className={`px-3 py-1 rounded-xl border transition-all ${
                          recordTypeFilter === tab.id
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-slate-600 border-secondary hover:bg-secondary/20'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Longitudinal Medical History Timeline */}
              <div className="space-y-3">
                {filteredTimeline.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-secondary shadow-sm">
                    No medical records recorded for this filter yet. When doctor consultations, prescriptions, or lab tests are completed, they will automatically appear here permanently.
                  </div>
                ) : (
                  filteredTimeline.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-white border border-secondary shadow-sm hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-secondary">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                              item.type === 'consultation'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : item.type === 'prescription'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.type === 'lab'
                                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                : 'bg-secondary/20 text-slate-700 border border-secondary'
                            }`}
                          >
                            {item.type === 'consultation' && <Stethoscope className="w-4 h-4" />}
                            {item.type === 'prescription' && <Pill className="w-4 h-4" />}
                            {item.type === 'lab' && <FlaskConical className="w-4 h-4" />}
                            {item.type === 'document' && <FileText className="w-4 h-4" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                            <p className="text-[11px] text-slate-500">
                              {new Date(item.date).toLocaleDateString()} • Clinician: <strong>{item.doctor}</strong>
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-secondary/10 text-slate-700 border border-secondary">
                          {item.type}
                        </span>
                      </div>

                      {/* Item Specific Content */}
                      {item.type === 'consultation' && (
                        <div className="space-y-2 text-xs">
                          {item.details.symptoms && (
                            <p className="text-slate-700">
                              <strong className="text-slate-900">Presenting Symptoms:</strong> {item.details.symptoms}
                            </p>
                          )}
                          {item.details.treatmentDetails && (
                            <p className="text-slate-700">
                              <strong className="text-slate-900">Treatment Plan:</strong> {item.details.treatmentDetails}
                            </p>
                          )}
                          {item.details.clinicalNotes && (
                            <p className="text-slate-600 bg-secondary/10 p-2.5 rounded-xl border border-secondary">
                              <strong className="text-slate-800">Clinical Notes:</strong> {item.details.clinicalNotes}
                            </p>
                          )}
                          {item.details.medicines && item.details.medicines.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {item.details.medicines.map((m: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium flex items-center space-x-1"
                                >
                                  <Pill className="w-3 h-3 text-emerald-600" />
                                  <span>
                                    {m.medicationName} ({m.dosage}) — {m.frequency}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {item.type === 'prescription' && (
                        <div className="space-y-2 text-xs">
                          <p className="text-primary font-bold">Diagnosis: {item.details.diagnosis}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {item.details.items?.map((med: any, idx: number) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium flex items-center space-x-1"
                              >
                                <Pill className="w-3 h-3 text-emerald-600" />
                                <span>
                                  {med.medicationName} {med.dosage} ({med.frequency})
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.type === 'lab' && (
                        <div className="space-y-2 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.details.tests?.map((t: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-2 rounded-xl border flex items-center justify-between ${
                                  t.isAbnormal ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-secondary/10 border-secondary text-slate-800'
                                }`}
                              >
                                <span className="font-semibold">{t.testName}</span>
                                <span className="font-mono font-bold">{t.resultValue ? `${t.resultValue} ${t.unit}` : 'Completed'}</span>
                              </div>
                            ))}
                          </div>
                          {item.details.notes && (
                            <p className="text-slate-600">
                              <strong>Clinical Notes:</strong> {item.details.notes}
                            </p>
                          )}
                        </div>
                      )}

                      {item.type === 'document' && (
                        <div className="flex items-center justify-between text-xs bg-secondary/10 p-3 rounded-xl border border-secondary">
                          <div>
                            <p className="font-bold text-slate-900">{item.title}</p>
                            <p className="text-[11px] text-slate-600">{item.details.description || 'Clinical PDF artifact.'}</p>
                          </div>
                          <button
                            onClick={() => alert(`Opening secure document preview for: ${item.title}`)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-secondary text-slate-700 font-bold hover:bg-secondary/20 transition-all flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-secondary text-center text-slate-500 text-xs shadow-sm">
              Please select a patient from the left directory to view their complete permanent medical record history.
            </div>
          )}
        </div>
      </div>

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-secondary p-6 space-y-4 text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-secondary pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-slate-900">Upload Record Document</h3>
              </div>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Patient</label>
                <select
                  value={uploadForm.patientId}
                  onChange={(e) => setUploadForm({ ...uploadForm, patientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white font-medium"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Chest X-Ray Report, Discharge Summary"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Document Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white font-medium"
                >
                  <option value="Clinical Summary / EHR">Clinical Summary / EHR</option>
                  <option value="Radiology & Imaging">Radiology & Imaging</option>
                  <option value="Pathology Report">Pathology Report</option>
                  <option value="Discharge Summary">Discharge Summary</option>
                  <option value="Operative Note">Operative Note</option>
                  <option value="Referral Letter">Referral Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Additional clinical context or notes regarding this document..."
                  className="w-full px-3 py-2 rounded-xl border border-secondary text-slate-900 bg-white font-medium"
                />
              </div>

              <div className="pt-3 border-t border-secondary flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-secondary text-slate-700 font-bold hover:bg-secondary/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-sm"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
