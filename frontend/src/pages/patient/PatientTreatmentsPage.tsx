import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  Eye,
  FileText,
  HeartPulse,
  MapPin,
  Pill,
  Search,
  Sparkles,
  Stethoscope,
  User,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { Treatment, Patient, Hospital } from '../../types/shared';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentPatient } from '../../hooks/usePatients';

export const PatientTreatmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { data: currentPatient } = useCurrentPatient();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTreatments = async () => {
      setLoading(true);
      try {
        const url = currentPatient?.id ? `/treatments?patientId=${currentPatient.id}` : '/treatments';
        const res = await api.get(url);
        setTreatments(res.data);
      } catch (err) {
        console.error('Failed to load treatments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTreatments();
  }, [currentPatient?.id]);

  const handleFindPharmacyNearHospital = (hospital?: Hospital) => {
    if (hospital) {
      navigate(`/pharmacies?hospitalId=${hospital.id}&lat=${hospital.latitude}&lng=${hospital.longitude}`);
    } else {
      navigate('/pharmacies');
    }
  };

  const filtered = treatments.filter(
    (t) =>
      t.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.symptoms.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.hospital?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.doctor?.user?.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">My Treatments & Clinical History</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
              EHR Synchronized
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Official consultation records, prescribed therapeutic regimens, diagnostic assessments, and hospital pharmacy connections
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search treatments by diagnosis, symptoms, hospital, or physician..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Treatments List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 rounded-3xl glass-card border border-slate-800 text-center text-slate-500 text-xs">
            No completed treatment records found.
          </div>
        ) : (
          filtered.map((treatment) => {
            const hospital = treatment.hospital;
            const doctor = treatment.doctor;
            const doctorUser = doctor?.user;

            return (
              <div
                key={treatment.id}
                className="p-6 rounded-3xl glass-card border border-slate-800 glass-card-hover space-y-4 transition-all"
              >
                {/* Top Row: Hospital & Doctor Information */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                        <span>{hospital?.name || 'Apollo Hospital & Medical Center'}</span>
                        <span className="text-xs font-normal text-slate-400 font-mono">
                          ({hospital?.city || 'San Francisco'})
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 flex items-center mt-0.5">
                        <Stethoscope className="w-3.5 h-3.5 text-brand-400 mr-1" />
                        Dr. {doctorUser ? `${doctorUser.firstName} ${doctorUser.lastName}` : 'Sophia Chen'} ({doctor?.specialization || 'Cardiology'})
                        <span className="mx-2 text-slate-600">•</span>
                        Encounter Date: {new Date(treatment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleFindPharmacyNearHospital(hospital)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan flex items-center space-x-1.5 transition-all"
                    >
                      <Pill className="w-3.5 h-3.5" />
                      <span>Find Pharmacy Near Hospital</span>
                    </button>

                    <button
                      onClick={() => setSelectedTreatment(treatment)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-brand-400" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>

                {/* Middle: Diagnosis & Treatment Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-brand-400">Clinical Diagnosis</span>
                    <p className="text-white font-semibold">{treatment.diagnosis}</p>
                    <p className="text-[11px] text-slate-400 pt-1">Symptoms: {treatment.symptoms}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-brand-400">Treatment Plan</span>
                    <p className="text-slate-200">{treatment.treatmentDetails}</p>
                    {treatment.followUpDate && (
                      <p className="text-[11px] text-emerald-400 font-mono pt-1">
                        Follow-up Scheduled: {treatment.followUpDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom: Prescribed Medicines Chips */}
                {treatment.medicines && treatment.medicines.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center">
                      <Pill className="w-3.5 h-3.5 mr-1" /> Prescribed:
                    </span>
                    {treatment.medicines.map((med, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 font-mono text-[11px] flex items-center space-x-1"
                      >
                        <span className="font-bold text-brand-300">{med.medicationName}</span>
                        <span className="text-slate-400">({med.dosage})</span>
                        <span className="text-slate-500">• {med.frequency}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Treatment Full Detail Modal */}
      {selectedTreatment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl glass-card rounded-3xl border border-slate-700 p-6 space-y-4 text-xs shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-brand-400">
                  Comprehensive Treatment Record
                </span>
                <h3 className="font-bold text-base text-white mt-0.5">{selectedTreatment.diagnosis}</h3>
                <p className="text-xs text-slate-400">
                  {selectedTreatment.hospital?.name} • Encounter {new Date(selectedTreatment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedTreatment(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-white">Presenting Symptoms:</span>
                <p className="text-slate-300">{selectedTreatment.symptoms}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-white">Treatment & Clinical Details:</span>
                <p className="text-slate-300">{selectedTreatment.treatmentDetails}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-white">Doctor Clinical Notes:</span>
                <p className="text-slate-300 italic">{selectedTreatment.clinicalNotes || 'None recorded.'}</p>
              </div>

              {selectedTreatment.medicines && selectedTreatment.medicines.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-white">Prescribed Medications:</span>
                  <div className="space-y-2">
                    {selectedTreatment.medicines.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-brand-300">{m.medicationName} ({m.dosage})</span>
                          <span className="font-mono text-[10px] text-slate-500">{m.durationDays} Days</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{m.instructions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedTreatment(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const hosp = selectedTreatment.hospital;
                  setSelectedTreatment(null);
                  handleFindPharmacyNearHospital(hosp);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold shadow-glow-cyan flex items-center space-x-1.5"
              >
                <Pill className="w-4 h-4" />
                <span>Find Nearby Pharmacy Around Hospital</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
