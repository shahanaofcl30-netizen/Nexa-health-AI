import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  MapPin,
  Navigation,
  Phone,
  Pill,
  ShieldCheck,
  Star,
  Stethoscope,
  User,
  Users,
  Bed,
  CheckCircle2,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import api from '../../services/api';
import { Hospital, Doctor } from '../../types/shared';
import { InteractiveMap } from '../../components/map/InteractiveMap';

export const HospitalDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const fetchHospitalData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [hospRes, docRes] = await Promise.all([
          api.get(`/hospitals/${id}`),
          api.get(`/hospitals/${id}/doctors`),
        ]);

        setHospital(hospRes.data);
        setDoctors(docRes.data);
      } catch (err) {
        console.error('Failed to load hospital details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitalData();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
        Loading hospital profile and clinical departments...
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 glass-card rounded-3xl border border-slate-800 space-y-3">
        <p>Hospital not found.</p>
        <button
          onClick={() => navigate('/hospitals')}
          className="px-4 py-2 rounded-xl bg-brand-500 text-slate-950 font-bold text-xs"
        >
          Back to Hospitals Directory
        </button>
      </div>
    );
  }

  const getDirectionsUrl = () => {
    return `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back Button & Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/hospitals')}
          className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tamil Nadu Hospital Directory</span>
        </button>

        <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-cyan-400">
          {hospital.district || 'Tamil Nadu'} District
        </span>
      </div>

      {/* Hospital Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-card border border-slate-800 shadow-2xl">
        <div className="h-64 sm:h-72 w-full relative">
          <img
            src={hospital.imageUrl || 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80'}
            alt={hospital.name}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B101E] via-[#0B101E]/60 to-transparent" />

          {/* Floating Badges on Hero */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-brand-500/90 text-slate-950 text-xs font-bold shadow-lg">
              {hospital.hospitalType || 'Multi-Speciality Hospital'}
            </span>
            {hospital.emergencyAvailable && (
              <span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-lg flex items-center space-x-1">
                <HeartPulse className="w-3.5 h-3.5 animate-pulse" />
                <span>24/7 Emergency & Trauma</span>
              </span>
            )}
          </div>

          {/* Hero Content Bottom */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {hospital.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center">
                <MapPin className="w-4 h-4 text-brand-400 mr-1.5 flex-shrink-0" />
                {hospital.address}, {hospital.city}, {hospital.district} District, {hospital.state || 'Tamil Nadu'} {hospital.zipCode}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-amber-400 font-bold bg-amber-500/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{hospital.rating || 4.9} / 5.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Command Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <span className="flex items-center font-mono">
            <Phone className="w-4 h-4 text-slate-400 mr-1.5" />
            {hospital.phone}
          </span>
          {hospital.emergencyPhone && (
            <span className="flex items-center font-mono text-rose-400 font-bold">
              Emergency: {hospital.emergencyPhone}
            </span>
          )}
          <span className="flex items-center">
            <Clock className="w-4 h-4 text-slate-400 mr-1.5" />
            {hospital.openingHours}
          </span>
          {hospital.totalBeds && (
            <span className="flex items-center font-mono text-cyan-400">
              <Bed className="w-4 h-4 mr-1.5" />
              {hospital.totalBeds} Inpatient Beds
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={getDirectionsUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Get Directions</span>
          </a>

          <button
            onClick={() =>
              navigate(
                `/pharmacies?hospitalId=${hospital.id}&lat=${hospital.latitude}&lng=${hospital.longitude}`
              )
            }
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md flex items-center space-x-1.5 transition-all"
          >
            <Pill className="w-4 h-4" />
            <span>Nearby Pharmacies</span>
          </button>

          <button
            onClick={() => navigate(`/book-appointment?hospitalId=${hospital.id}`)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-teal-500 hover:from-brand-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-glow-cyan flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Grid: Details (Left: Facilities & Doctors, Right: Map & Emergency Contacts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Clinical Facilities & Doctors Roster (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Clinical Departments & Specializations */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Stethoscope className="w-4 h-4 text-brand-400" />
              <span>Clinical Departments & Specializations</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">
                  Departments
                </span>
                <div className="flex flex-wrap gap-2">
                  {hospital.departments.map((dept, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 font-semibold"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">
                  Centers of Excellence
                </span>
                <div className="flex flex-wrap gap-2">
                  {hospital.specializations.map((spec, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl bg-brand-500/10 text-brand-300 border border-brand-500/20 font-mono text-[11px]"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Facilities List */}
          {hospital.facilities && hospital.facilities.length > 0 && (
            <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Hospital Infrastructure & Facilities</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {hospital.facilities.map((facility, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-2 text-slate-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="font-medium text-[11px]">{facility}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Specialists Roster */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center space-x-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Attending Doctors & Specialists</span>
                </h3>
                <p className="text-xs text-slate-400">Practicing physicians on duty at this hospital</p>
              </div>

              <span className="text-xs font-mono text-cyan-400 font-bold px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800">
                {doctors.length} Doctors
              </span>
            </div>

            {doctors.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 rounded-2xl bg-slate-900 border border-slate-800">
                No doctors currently listed for this hospital.
              </div>
            ) : (
              <div className="space-y-3">
                {doctors.map((doc) => {
                  const doctorUser = doc.user;
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
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
                          <h4 className="font-bold text-sm text-white">
                            Dr. {doctorUser ? `${doctorUser.firstName} ${doctorUser.lastName}` : 'Specialist'}
                          </h4>
                          <p className="text-xs text-brand-300 font-semibold">{doc.specialization}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {doc.qualification} • {doc.experienceYears}+ Years Experience
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <span className="text-xs font-mono font-bold text-emerald-400 mr-1">
                          ₹{doc.consultationFee.toFixed(0)}
                        </span>

                        <button
                          onClick={() =>
                            navigate(`/book-appointment?hospitalId=${hospital.id}&doctorId=${doc.id}`)
                          }
                          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all"
                        >
                          Book Slot
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Location Map & Coordinates (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4 sticky top-20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-brand-400 uppercase tracking-wider">
                Geographic Map Location
              </span>
              <span className="text-[10px] text-slate-500 font-mono">OpenStreetMap Layer</span>
            </div>

            <InteractiveMap hospital={hospital} heightClass="h-80" />

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">GPS Coordinates:</span>
                <span className="font-mono text-white font-bold">
                  {hospital.latitude.toFixed(4)}° N, {hospital.longitude.toFixed(4)}° E
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">District:</span>
                <span className="text-cyan-300 font-semibold">{hospital.district}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">City / Town:</span>
                <span className="text-white font-semibold">{hospital.city}</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center space-x-2">
                <a
                  href={getDirectionsUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center flex items-center justify-center space-x-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Navigate with Maps</span>
                </a>

                <button
                  onClick={() =>
                    navigate(
                      `/pharmacies?hospitalId=${hospital.id}&lat=${hospital.latitude}&lng=${hospital.longitude}`
                    )
                  }
                  className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 text-xs font-bold text-center shadow-glow-cyan transition-all"
                >
                  Pharmacies (1-5km)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
