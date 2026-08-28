import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  HeartPulse,
  Locate,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Search,
  Sparkles,
  Star,
  Stethoscope,
  User,
  Users,
  X,
  List,
  Map as MapIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import { Hospital, Doctor, TamilNaduDistrict, HospitalType } from '../../types/shared';
import { InteractiveMap } from '../../components/map/InteractiveMap';

export const FindHospitalPage: React.FC = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [districts, setDistricts] = useState<TamilNaduDistrict[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Geolocation State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Doctors Drawer Modal
  const [activeHospitalDoctors, setActiveHospitalDoctors] = useState<Hospital | null>(null);
  const [hospitalDoctorsList, setHospitalDoctorsList] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Selected Doctor for detail preview
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);

  // Fetch Districts & Initial Hospitals
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [distRes, hospRes] = await Promise.all([
          api.get('/hospitals/districts'),
          api.get('/hospitals'),
        ]);

        setDistricts(distRes.data);
        setHospitals(hospRes.data);
        if (hospRes.data.length > 0) {
          setSelectedHospital(hospRes.data[0]);
        }
      } catch (err) {
        console.error('Failed to load hospitals directory:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle Geolocation "Hospitals Near Me"
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser. Please select your district manually.');
      return;
    }

    setLocating(true);
    setLocationStatus('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setLocating(false);
        setLocationStatus('📍 Location detected! Showing hospitals sorted by distance.');

        try {
          const res = await api.get(`/hospitals?lat=${lat}&lng=${lng}`);
          setHospitals(res.data);
          if (res.data.length > 0) {
            setSelectedHospital(res.data[0]);
          }
        } catch (err) {
          console.error('Failed to query hospitals by location:', err);
        }
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('Location permission denied. You can select your Tamil Nadu district below.');
        } else {
          setLocationStatus('Could not retrieve location. Please select your district from the dropdown.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleOpenDoctors = async (hospital: Hospital) => {
    setActiveHospitalDoctors(hospital);
    setLoadingDoctors(true);
    try {
      const res = await api.get(`/hospitals/${hospital.id}/doctors`);
      setHospitalDoctorsList(res.data);
    } catch (err) {
      console.error('Failed to load hospital doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleBookWithDoctor = (hospital: Hospital, doctor?: Doctor) => {
    const query = new URLSearchParams({
      hospitalId: hospital.id,
      ...(doctor ? { doctorId: doctor.id } : {}),
    }).toString();
    navigate(`/book-appointment?${query}`);
  };

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.district && h.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
        h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.hospitalType && h.hospitalType.toLowerCase().includes(searchQuery.toLowerCase())) ||
        h.specializations.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
        h.departments.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDistrict =
        selectedDistrict === 'all' || (h.district && h.district.toLowerCase() === selectedDistrict.toLowerCase());

      const matchesType =
        selectedType === 'all' || (h.hospitalType && h.hospitalType.toLowerCase() === selectedType.toLowerCase());

      const matchesDept =
        selectedDept === 'all' || h.departments.some((d) => d.toLowerCase().includes(selectedDept.toLowerCase()));

      const matchesEmergency = !emergencyOnly || h.emergencyAvailable === true;

      return matchesSearch && matchesDistrict && matchesType && matchesDept && matchesEmergency;
    });
  }, [hospitals, searchQuery, selectedDistrict, selectedType, selectedDept, emergencyOnly]);

  const hospitalTypes: HospitalType[] = [
    'Government Hospital',
    'Private Hospital',
    'Multi-Speciality Hospital',
    'Specialty Hospital',
    'Clinic',
    'Medical College Hospital',
    'Diagnostic Centre',
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-950/80 via-slate-900 to-cyan-950/40 border border-brand-500/30 glass-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 font-mono">
                Tamil Nadu Complete 38 District Directory
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mt-1.5 tracking-tight">
              Discover Hospitals Across Tamil Nadu
            </h1>
            <p className="text-xs md:text-sm text-slate-300">
              Search verified public medical colleges, government headquarters hospitals, and multi-speciality centers across all 38 districts of Tamil Nadu.
            </p>
          </div>

          {/* Action Buttons: Hospitals Near Me & Quick Booking */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleLocateMe}
              disabled={locating}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {locating ? <LocateFixed className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />}
              <span>{locating ? 'Detecting GPS...' : 'Hospitals Near Me'}</span>
            </button>

            <button
              onClick={() => navigate('/book-appointment')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
            >
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

        {locationStatus && (
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-cyan-300 font-mono flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              {locationStatus}
            </span>
            <button onClick={() => setLocationStatus(null)} className="text-slate-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Multi-Faceted District & Search Filters Bar */}
      <div className="p-5 rounded-3xl glass-card border border-slate-800 space-y-4">
        {/* Row 1: Search keyword & District Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hospital name, city, specialization, or medical department..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl glass-input text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {/* District Dropdown Selector (All 38 Districts) */}
          <div className="md:col-span-3">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-white bg-slate-900 border border-slate-700 focus:outline-none"
            >
              <option value="all">📍 Select Tamil Nadu District (All 38)</option>
              {districts.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} {d.hospitalCount ? `(${d.hospitalCount} Hospitals)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Hospital Type Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl glass-input text-white bg-slate-900 border border-slate-700 focus:outline-none"
            >
              <option value="all">🏥 All Hospital Types</option>
              {hospitalTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Secondary Quick Filter Badges & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center space-x-1.5 text-xs text-rose-300 font-semibold px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 cursor-pointer">
              <input
                type="checkbox"
                checked={emergencyOnly}
                onChange={(e) => setEmergencyOnly(e.target.checked)}
                className="rounded accent-rose-500"
              />
              <span>24/7 Emergency / Trauma ER</span>
            </label>

            {/* Quick District Buttons */}
            <div className="hidden lg:flex items-center space-x-1 text-xs">
              <span className="text-slate-500 text-[11px] mr-1">Popular:</span>
              {['Chennai', 'Coimbatore', 'Madurai', 'Vellore', 'Tiruchirappalli', 'Salem'].map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setSelectedDistrict(selectedDistrict === dist ? 'all' : dist)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                    selectedDistrict === dist
                      ? 'bg-brand-500 text-slate-950 font-bold shadow-glow-cyan'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {dist}
                </button>
              ))}
            </div>
          </div>

          {/* List vs Map View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-end sm:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'list' ? 'bg-brand-500 text-slate-950 shadow-glow-cyan' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'map' ? 'bg-brand-500 text-slate-950 shadow-glow-cyan' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'map' ? (
        /* Full Map View Mode */
        <div className="space-y-4">
          <InteractiveMap
            hospitalsList={filteredHospitals}
            hospital={selectedHospital}
            onSelectHospital={(h) => setSelectedHospital(h)}
            heightClass="h-[600px]"
          />
        </div>
      ) : (
        /* Split List View Mode (Left: Hospital Cards, Right: Interactive Map Preview) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Hospital Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Showing {filteredHospitals.length} hospitals in Tamil Nadu</span>
              {selectedDistrict !== 'all' && (
                <span className="font-mono text-cyan-400">Filtered: {selectedDistrict} District</span>
              )}
            </div>

            {filteredHospitals.length === 0 ? (
              <div className="p-12 rounded-3xl glass-card border border-slate-800 text-center text-slate-500 text-xs">
                No hospitals matching the selected criteria in this district. Please adjust your filters or search terms.
              </div>
            ) : (
              filteredHospitals.map((hospital) => {
                const isSelected = selectedHospital?.id === hospital.id;

                return (
                  <div
                    key={hospital.id}
                    onClick={() => setSelectedHospital(hospital)}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'glass-card border-brand-500/60 shadow-glow-cyan bg-brand-950/20'
                        : 'glass-card border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Hospital Thumbnail Image */}
                      <div className="w-full sm:w-36 h-32 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 flex-shrink-0 relative">
                        <img
                          src={hospital.imageUrl || 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=400&q=80'}
                          alt={hospital.name}
                          className="w-full h-full object-cover"
                        />
                        {hospital.emergencyAvailable && (
                          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-600/90 text-white shadow">
                            24/7 ER
                          </span>
                        )}
                        {hospital.distanceKm !== undefined && (
                          <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950/90 text-cyan-300 border border-cyan-500/40 shadow">
                            📍 {hospital.distanceKm} km
                          </span>
                        )}
                      </div>

                      {/* Hospital Details Information */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono uppercase px-2 py-0.2 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                                {hospital.hospitalType || 'Multi-Speciality'}
                              </span>
                              {hospital.district && (
                                <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                                  {hospital.district} District
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-base text-white hover:text-brand-300 transition-colors mt-0.5">
                              {hospital.name}
                            </h3>
                            <p className="text-xs text-slate-400 flex items-center mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-brand-400 mr-1 flex-shrink-0" />
                              {hospital.address}, {hospital.city}, {hospital.state || 'Tamil Nadu'} {hospital.zipCode}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{hospital.rating || 4.9}</span>
                          </div>
                        </div>

                        {/* Contact Phone & Emergency */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                          <span className="flex items-center font-mono">
                            <Phone className="w-3 h-3 text-slate-500 mr-1" />
                            {hospital.phone}
                          </span>
                          {hospital.emergencyPhone && (
                            <span className="flex items-center text-rose-300 font-bold font-mono">
                              ER: {hospital.emergencyPhone}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 text-slate-500 mr-1" />
                            {hospital.openingHours}
                          </span>
                        </div>

                        {/* Facilities Badges */}
                        {hospital.facilities && hospital.facilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {hospital.facilities.slice(0, 3).map((fac, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800"
                              >
                                {fac}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80">
                          <span className="text-[11px] font-mono text-cyan-400 flex items-center">
                            <Users className="w-3.5 h-3.5 mr-1" />
                            {hospital.availableDoctorIds?.length || 2} Specialists On Duty
                          </span>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link
                              to={`/hospitals/${hospital.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                            >
                              View Hospital
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDoctors(hospital);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 text-xs font-semibold flex items-center space-x-1 transition-colors"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>View Doctors</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookWithDoctor(hospital);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold shadow-glow-cyan transition-all"
                            >
                              Book Appointment
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Interactive Map Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-3xl glass-card border border-slate-800 space-y-3 sticky top-20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-brand-400 uppercase tracking-wider">
                  Tamil Nadu Hospital Map Pin
                </span>
                <span className="text-[10px] text-slate-500 font-mono">OpenStreetMap Layer</span>
              </div>

              {/* Interactive Map Visualizer */}
              <InteractiveMap
                hospital={selectedHospital}
                heightClass="h-80"
              />

              {selectedHospital && (
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{selectedHospital.name}</h4>
                      <span className="text-[10px] text-cyan-400 font-mono font-semibold">
                        {selectedHospital.district} District • {selectedHospital.city}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedHospital.latitude.toFixed(4)}°N, {selectedHospital.longitude.toFixed(4)}°E
                    </span>
                  </div>

                  <p className="text-slate-300">{selectedHospital.address}</p>

                  <div className="pt-2 flex items-center space-x-2">
                    <Link
                      to={`/hospitals/${selectedHospital.id}`}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 font-bold text-xs text-center transition-colors"
                    >
                      View Full Hospital Profile
                    </Link>

                    <button
                      onClick={() => handleBookWithDoctor(selectedHospital)}
                      className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs text-center shadow-glow-cyan transition-all"
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hospital Doctors Modal / Drawer */}
      {activeHospitalDoctors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] glass-card rounded-3xl border border-slate-700 p-6 space-y-4 overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-brand-400">
                  Medical Specialists Roster
                </span>
                <h3 className="font-bold text-base text-white mt-0.5">{activeHospitalDoctors.name}</h3>
                <p className="text-xs text-slate-400">
                  {activeHospitalDoctors.address}, {activeHospitalDoctors.city}, {activeHospitalDoctors.district}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveHospitalDoctors(null);
                  setViewingDoctor(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDoctors ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading hospital clinical specialists...
              </div>
            ) : (
              <div className="space-y-3">
                {hospitalDoctorsList.map((doc) => {
                  const doctorUser = doc.user;
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                          <img
                            src={doc.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80'}
                            alt={doctorUser ? `${doctorUser.firstName} ${doctorUser.lastName}` : 'Doctor'}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-sm text-white">
                              Dr. {doctorUser ? `${doctorUser.firstName} ${doctorUser.lastName}` : 'Physician'}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-brand-500/20 text-brand-300 font-mono">
                              {doc.specialization}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {doc.qualification || 'MD, DM'} • {doc.experienceYears || 12}+ Years Experience
                          </p>
                          <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                            Consultation Fee: ₹{doc.consultationFee.toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <button
                          onClick={() => setViewingDoctor(doc)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        >
                          View Profile
                        </button>

                        <button
                          onClick={() => handleBookWithDoctor(activeHospitalDoctors, doc)}
                          className="px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
                        >
                          Book Appointment
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Doctor Profile Modal View */}
            {viewingDoctor && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-brand-500/30 text-xs space-y-2 mt-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-300">
                    Clinical Biography — Dr. {viewingDoctor.user?.firstName} {viewingDoctor.user?.lastName}
                  </span>
                  <button onClick={() => setViewingDoctor(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed">{viewingDoctor.bio || 'Specialist physician.'}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>License: {viewingDoctor.licenseNumber}</span>
                  <span>Rating: ⭐ {viewingDoctor.rating || 4.9} / 5.0</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
