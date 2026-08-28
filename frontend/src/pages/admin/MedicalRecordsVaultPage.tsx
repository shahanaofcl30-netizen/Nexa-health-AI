import React, { useState, useEffect } from 'react';
import {
  Download,
  Eye,
  FileCheck,
  FileText,
  FolderLock,
  Plus,
  Search,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Patient } from '../../types/shared';

export const MedicalRecordsVaultPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [form, setForm] = useState({
    patientId: '',
    title: '',
    category: 'imaging',
    description: '',
  });

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const [docRes, patRes] = await Promise.all([
        api.get('/admin/documents'),
        api.get('/patients'),
      ]);
      setDocuments(docRes.data);
      setPatients(patRes.data);
      if (patRes.data.length > 0 && !form.patientId) {
        setForm((prev) => ({ ...prev, patientId: patRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load records vault:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/documents', {
        ...form,
        fileUrl: `/documents/${form.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      });
      setIsUploadOpen(false);
      setForm({
        patientId: patients[0]?.id || '',
        title: '',
        category: 'imaging',
        description: '',
      });
      fetchDocs();
    } catch (err) {
      console.error('Failed to upload document:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Digital Medical Records Vault</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
              Vector Indexed (pgvector)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Centralized encrypted repository for clinical reports, imaging PDFs, discharge summaries, and versioned EHR artifacts
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Record Document</span>
        </button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => {
          const patient = patients.find((p) => p.id === doc.patientId) || doc.patient;
          return (
            <div
              key={doc.id}
              className="p-5 rounded-2xl glass-card border border-slate-800 glass-card-hover flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-brand-300 border border-slate-800 uppercase">
                    v{doc.version || 1} • {doc.category}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white">{doc.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-2">{doc.description || 'Clinical PDF document artifact.'}</p>

                <p className="text-[11px] text-slate-400 pt-1">
                  Patient: <strong className="text-slate-200">{patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}</strong> (
                  {patient?.mrn})
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono text-slate-500">
                  Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => alert(`Opening secure document preview for: ${doc.title}`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-300 font-semibold flex items-center space-x-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl border border-slate-700 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-white">Upload Medical Record</h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1">Select Patient</label>
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
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
                <label className="block text-slate-400 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brain MRI Scan Report, Discharge Summary"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 focus:outline-none"
                >
                  <option value="imaging">Medical Imaging (X-Ray / MRI / Echo)</option>
                  <option value="lab">External Lab Report</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="referral">Specialist Referral Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Clinical Description / Summary</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold shadow-glow-cyan"
                >
                  Upload & Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
