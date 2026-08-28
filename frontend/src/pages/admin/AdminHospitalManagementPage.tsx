import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Filter,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserPlus,
  Users,
  X,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { Hospital, TamilNaduDistrict, Doctor, HospitalType } from '../../types/shared';

export const AdminHospitalManagementPage: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [districts, setDistricts] = useState<TamilNaduDistrict[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [assignDoctorHospital, setAssignDoctorHospital] = useState<Hospital | null>(null);

  // Form Data for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    hospitalType: 'Multi-Speciality Hospital' as HospitalType,
    district: 'Chennai',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    zipCode: '',
    phone: '',
    emergencyPhone: '108',
    email: '',
    latitude: 13.0827,
    longitude: 80.2707,
    openingHours: '24 Hours / 7 Days',
    departments: 'Cardiology, Neurology, General Medicine, Orthopedics, Emergency Medicine',
    specializations: 'Trauma Care, Dialysis, Cardiac Surgery',
    facilities: '24/7 ICU, Blood Bank, Pharmacy, Dialysis, CT/MRI',
    totalBeds: 250,
    emergencyAvailable: true,
  });

  // Assign Doctor Form
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [assignDepartment, setAssignDepartment] = useState('General Medicine');

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const [distRes, hospRes, docRes] = await Promise.all([
        api.get('/hospitals/districts'),
        api.get('/hospitals'),
        api.get('/doctors'),
      ]);

      setDistricts(distRes.data);
      setHospitals(hospRes.data);
      setAllDoctors(docRes.data);
    } catch (err) {
      console.error('Failed to load admin hospital data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  const handleSaveHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        departments: formData.departments.split(',').map((s) => s.trim()).filter(Boolean),
        specializations: formData.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        facilities: formData.facilities.split(',').map((s) => s.trim()).filter(Boolean),
        latitude: parseFloat(formData.latitude as any),
        longitude: parseFloat(formData.longitude as any),
        totalBeds: parseInt(formData.totalBeds as any),
      };

      if (editingHospital) {
        await api.put(`/hospitals/${editingHospital.id}`, payload);
      } else {
        await api.post('/hospitals', payload);
      }

      setIsAddOpen(false);
      setEditingHospital(null);
      fetchDirectory();
    } catch (err) {
      console.error('Failed to save hospital:', err);
    }
  };

  const handleDeactivate = async (hospitalId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this hospital?')) return;
    try {
      await api.delete(`/hospitals/${hospitalId}`);
      fetchDirectory();
    } catch (err) {
      console.error('Failed to deactivate hospital:', err);
    }
  };

  const handleAssignDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDoctorHospital || !selectedDoctorId) return;

    try {
      await api.post(`/hospitals/${assignDoctorHospital.id}/doctors`, {
        doctorId: selectedDoctorId,
        department: assignDepartment,
      });

      setAssignDoctorHospital(null);
      setSelectedDoctorId('');
      fetchDirectory();
    } catch (err) {
      console.error('Failed to assign doctor:', err);
    }
  };

  const openEdit = (hosp: Hospital) => {
    setEditingHospital(hosp);
    setFormData({
      name: hosp.name,
      hospitalType: hosp.hospitalType || 'Multi-Speciality Hospital',
      district: hosp.district || 'Chennai',
      address: hosp.address,
      city: hosp.city,
      state: hosp.state || 'Tamil Nadu',
      zipCode: hosp.zipCode || '',
      phone: hosp.phone,
      emergencyPhone: hosp.emergencyPhone || '108',
      email: hosp.email || '',
      latitude: hosp.latitude,
      longitude: hosp.longitude,
      openingHours: hosp.openingHours,
      departments: hosp.departments.join(', '),
      specializations: hosp.specializations.join(', '),
      facilities: hosp.facilities?.join(', ') || '',
      totalBeds: hosp.totalBeds || 100,
      emergencyAvailable: Boolean(hosp.emergencyAvailable),
    });
    setIsAddOpen(true);
  };

  const filteredHospitals = hospitals.filter((h) => {
    const matchesDistrict =
      selectedDistrict === 'all' || (h.district && h.district.toLowerCase() === selectedDistrict.toLowerCase());
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.district && h.district.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesDistrict && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Tamil Nadu Hospital Management</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              Admin Console
            </span>
          </div>
          <p className="text-xs text-slate-400">
            District-wise administration: Add/Edit hospitals, GPS coordinates, facilities, and assign clinical specialists
          </p>
        </div>

        <button
          onClick={() => {
            setEditingHospital(null);
            setFormData({
              name: '',
              hospitalType: 'Multi-Speciality Hospital',
              district: selectedDistrict !== 'all' ? selectedDistrict : 'Chennai',
              address: '',
              city: '',
              state: 'Tamil Nadu',
              zipCode: '',
              phone: '',
              emergencyPhone: '108',
              email: '',
              latitude: 13.0827,
              longitude: 80.2707,
              openingHours: '24 Hours / 7 Days',
              departments: 'Cardiology, Neurology, General Medicine, Orthopedics, Emergency Medicine',
              specializations: 'Trauma Care, Dialysis, Cardiac Surgery',
              facilities: '24/7 ICU, Blood Bank, Pharmacy, Dialysis, CT/MRI',
              totalBeds: 250,
              emergencyAvailable: true,
            });
            setIsAddOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Hospital</span>
        </button>
      </div>

      {/* District & Search Filter Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospitals by name, city, or district..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl glass-input text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl glass-input text-white bg-slate-900 border border-slate-700 focus:outline-none"
          >
            <option value="all">📍 All 38 Tamil Nadu Districts</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name} {d.hospitalCount ? `(${d.hospitalCount} Hospitals)` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hospitals Table */}
      <div className="rounded-3xl glass-card border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Hospital Name & District</th>
                <th className="p-4">Type</th>
                <th className="p-4">Location / Address</th>
                <th className="p-4">Emergency & Beds</th>
                <th className="p-4">Doctors</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredHospitals.map((hosp) => (
                <tr key={hosp.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold flex-shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{hosp.name}</p>
                        <p className="text-[11px] text-cyan-400 font-mono">{hosp.district} District • {hosp.city}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-medium">
                      {hosp.hospitalType || 'Multi-Speciality'}
                    </span>
                  </td>

                  <td className="p-4 max-w-xs truncate text-[11px] text-slate-400">
                    {hosp.address}
                    <span className="block text-[10px] font-mono text-slate-500">
                      GPS: {hosp.latitude.toFixed(4)}, {hosp.longitude.toFixed(4)}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-200 font-bold">{hosp.totalBeds || 100} Beds</span>
                      {hosp.emergencyAvailable ? (
                        <span className="text-[10px] text-emerald-400 block font-semibold">24/7 ER Available</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 block">Scheduled Only</span>
                      )}
                    </div>
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() => setAssignDoctorHospital(hosp)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center space-x-1"
                    >
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>{hosp.availableDoctorIds?.length || 1} Doctors</span>
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEdit(hosp)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Edit Hospital"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeactivate(hosp.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        title="Deactivate Hospital"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Hospital Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl glass-card rounded-3xl border border-slate-700 p-6 space-y-4 text-xs shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-brand-400" />
                <span>{editingHospital ? 'Edit Hospital Information' : 'Add New Hospital in Tamil Nadu'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingHospital(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHospital} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    placeholder="e.g. Coimbatore Medical Center"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">District *</label>
                  <select
                    value={formData.district}
                    onChange={(e) => {
                      const distName = e.target.value;
                      const distObj = districts.find((d) => d.name === distName);
                      setFormData({
                        ...formData,
                        district: distName,
                        city: distName,
                        latitude: distObj ? distObj.latitude : formData.latitude,
                        longitude: distObj ? distObj.longitude : formData.longitude,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 text-xs"
                  >
                    {districts.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Hospital Type *</label>
                  <select
                    value={formData.hospitalType}
                    onChange={(e) => setFormData({ ...formData, hospitalType: e.target.value as HospitalType })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 text-xs"
                  >
                    <option value="Government Hospital">Government Hospital</option>
                    <option value="Medical College Hospital">Medical College Hospital</option>
                    <option value="Multi-Speciality Hospital">Multi-Speciality Hospital</option>
                    <option value="Specialty Hospital">Specialty Hospital</option>
                    <option value="Private Hospital">Private Hospital</option>
                    <option value="Clinic">Clinic</option>
                    <option value="Diagnostic Centre">Diagnostic Centre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">City / Town *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    placeholder="e.g. Coimbatore"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                  placeholder="e.g. 100 Trichy Road, Peelamedu"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    placeholder="+91 422 200 0000"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                    placeholder="108 or direct"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Total Bed Capacity</label>
                  <input
                    type="number"
                    value={formData.totalBeds}
                    onChange={(e) => setFormData({ ...formData, totalBeds: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">GPS Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">GPS Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Departments (comma separated)</label>
                <input
                  type="text"
                  value={formData.departments}
                  onChange={(e) => setFormData({ ...formData, departments: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Facilities (comma separated)</label>
                <input
                  type="text"
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingHospital(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-cyan"
                >
                  {editingHospital ? 'Update Hospital' : 'Save Hospital Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Doctor Modal */}
      {assignDoctorHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass-card rounded-3xl border border-slate-700 p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                Assign Doctor to {assignDoctorHospital.name}
              </h3>
              <button
                onClick={() => setAssignDoctorHospital(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignDoctor} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Select Physician *</label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900 text-xs"
                >
                  <option value="">Choose a doctor...</option>
                  {allDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.user?.firstName} {doc.user?.lastName} ({doc.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Hospital Department</label>
                <input
                  type="text"
                  value={assignDepartment}
                  onChange={(e) => setAssignDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs"
                  placeholder="e.g. Cardiology"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAssignDoctorHospital(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-glow-cyan"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
