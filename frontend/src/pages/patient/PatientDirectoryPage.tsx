import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  FileText,
  Filter,
  HeartPulse,
  Pill,
  Plus,
  Search,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { Patient } from '../../types/shared';

export const PatientDirectoryPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '1990-01-01',
    gender: 'female',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    allergies: '',
    chronicConditions: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
  });

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const [res, aptRes] = await Promise.all([
        api.get(`/patients?q=${encodeURIComponent(searchQuery)}`),
        api.get('/appointments')
      ]);
      
      const filtered = res.data.filter((p: Patient) => {
        const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
        return fullName !== 'emily davis' && fullName !== 'robert johnson' && p.email !== 'emily.davis@patient.nexa.ai' && p.email !== 'robert.j@patient.nexa.ai';
      });
      
      setPatients(filtered);
      setAppointments(aptRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        allergies: formData.allergies ? formData.allergies.split(',').map((s) => s.trim()) : [],
        chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map((s) => s.trim()) : [],
      };

      await api.post('/patients', payload);
      setIsRegisterOpen(false);
      fetchPatients();
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '1990-01-01',
        gender: 'female',
        bloodGroup: 'O+',
        phone: '',
        email: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        allergies: '',
        chronicConditions: '',
        insuranceProvider: '',
        insurancePolicyNumber: '',
      });
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Directory</h1>
            <span className="text-sm px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              {patients.length} Registered
            </span>
          </div>
          <p className="text-sm text-slate-600">Manage patient demographics, clinical charts, and insurance data</p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-secondary shadow-sm flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, MRN (e.g. NX-2026-001), phone, or email..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-secondary bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((patient) => {
          const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
          return (
            <div
              key={patient.id}
              className="p-5 rounded-2xl bg-white border border-secondary hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-secondary/30 border border-secondary flex items-center justify-center font-bold text-base text-primary">
                      {patient.firstName?.[0]}
                      {patient.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {age} yrs • {patient.gender} • <span className="font-mono font-bold text-primary">{patient.bloodGroup || 'O+'}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-secondary/10 text-primary border border-secondary">
                    {patient.mrn}
                  </span>
                </div>
                {/* Reason for Visit */}
                <div className="p-2.5 rounded-xl bg-secondary/10 border border-secondary text-xs text-slate-700">
                  <span className="font-bold text-slate-800">Reason for Visit:</span>{' '}
                  <span className="text-primary font-bold">
                    {(() => {
                      const patientFullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim().toLowerCase();
                      
                      // Find matching appointments for this specific patient
                      const patientAppointments = appointments.filter((a) => {
                        if (a.patientId && (a.patientId === patient.id || a.patientId === patient.userId)) return true;
                        if (a.patient?.id && (a.patient.id === patient.id || a.patient.id === patient.userId)) return true;
                        if (a.patientName && a.patientName.trim().toLowerCase() === patientFullName) return true;
                        const aptPatName = a.patient ? `${a.patient.firstName || ''} ${a.patient.lastName || ''}`.trim().toLowerCase() : '';
                        if (aptPatName && aptPatName === patientFullName) return true;
                        if (a.patient?.mrn && a.patient.mrn.toLowerCase() === patient.mrn?.toLowerCase()) return true;
                        return false;
                      });

                      // Prefer scheduled or active appointments, or most recently created
                      const activeApt = patientAppointments.find(a => a.status === 'scheduled' || a.status === 'in_consultation' || a.status === 'checked_in') || patientAppointments[0];

                      if (activeApt?.reason) {
                        return activeApt.reason;
                      }

                      // Check if patient profile was initialized with a clinical summary
                      if (patient.livingSummary && !patient.livingSummary.includes('Personal digital health profile') && !patient.livingSummary.includes('established') && !patient.livingSummary.includes('Newly registered')) {
                        return patient.livingSummary;
                      }

                      return 'Reason not provided';
                    })()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-secondary flex items-center justify-between gap-2">
                <Link
                  to={`/patients/${patient.id}`}
                  className="flex-1 text-center py-1.5 rounded-lg bg-white border border-secondary hover:bg-secondary/20 text-slate-700 text-sm font-bold transition-colors"
                >
                  View Full Chart
                </Link>
                <Link
                  to={`/clinical-notes?patientId=${patient.id}`}
                  className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
                  title="Start SOAP Encounter"
                >
                  <FileText className="w-4 h-4" />
                </Link>
                <Link
                  to={`/prescriptions?patientId=${patient.id}`}
                  className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                  title="Write Prescription"
                >
                  <Pill className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-2xl border border-secondary flex flex-col shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-secondary bg-white flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Patient Registration</span>
              </h3>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-5 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="undisclosed">Undisclosed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                    placeholder="patient@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Known Allergies (comma separated)</label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Sulfa, Aspirin"
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Chronic Conditions (comma separated)</label>
                  <input
                    type="text"
                    value={formData.chronicConditions}
                    onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                    placeholder="e.g. Hypertension, Type 2 Diabetes"
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Insurance Provider</label>
                  <input
                    type="text"
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    placeholder="e.g. Blue Cross Blue Shield"
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={formData.insurancePolicyNumber}
                    onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-secondary bg-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-secondary flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-secondary hover:bg-secondary/20 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-sm"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
