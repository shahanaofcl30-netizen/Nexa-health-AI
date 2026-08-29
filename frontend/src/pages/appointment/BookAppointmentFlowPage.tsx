import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Sparkles,
  Stethoscope,
  User,
  Video,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import api from '../../services/api';
import { Hospital, Doctor, Patient, Appointment } from '../../types/shared';
import { useAuthStore } from '../../store/useAuthStore';
import { useCurrentPatient } from '../../hooks/usePatients';

export const BookAppointmentFlowPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { data: currentPatient } = useCurrentPatient();

  const preselectedHospitalId = searchParams.get('hospitalId');
  const preselectedDoctorId = searchParams.get('doctorId');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(preselectedHospitalId || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(preselectedDoctorId || '');
  // Default to '+ Enter New Patient' ('new') so patients enter their own custom booking data directly
  const [selectedPatientId, setSelectedPatientId] = useState<string>('new');
  const [newPatientName, setNewPatientName] = useState<string>('');
  const [newPatientAge, setNewPatientAge] = useState<string>('');
  const [newPatientGender, setNewPatientGender] = useState<string>('other');
  const [newPatientPhone, setNewPatientPhone] = useState<string>('');
  const [newPatientEmail, setNewPatientEmail] = useState<string>('');
  const [newPatientAddress, setNewPatientAddress] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0]
  );
  const [appointmentTime, setAppointmentTime] = useState<string>('10:00');
  const [appointmentType, setAppointmentType] = useState<'in_person' | 'telehealth'>('in_person');
  const [reason, setReason] = useState<string>('');
  const [triageLevel, setTriageLevel] = useState<'routine' | 'urgent'>('routine');

  // Available Slots state
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; available: boolean }>>([]);

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedHospitalId) {
      setAvailableSlots([]);
      return;
    }

    const fetchSlots = async () => {
      const targetHospital = hospitals.find(h => h.id === selectedHospitalId);
      const hospitalSlots = targetHospital?.consultationSlots || [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
      ];

      if (!selectedDoctorId || !appointmentDate) {
        setAvailableSlots(hospitalSlots.map((time: string) => ({ time, available: false })));
        return;
      }
      
      const targetDoctor = doctors.find(d => d.id === selectedDoctorId);
      const appointmentDateObj = new Date(appointmentDate);
      const dayOfWeek = appointmentDateObj.getDay();

      let scheduleForDay: any = null;
      if (targetDoctor?.availabilitySchedule && targetDoctor.availabilitySchedule.length > 0) {
        scheduleForDay = targetDoctor.availabilitySchedule.find(s => s.dayOfWeek === dayOfWeek) || targetDoctor.availabilitySchedule[0];
      }
      if (!scheduleForDay) {
        scheduleForDay = { startTime: '08:00', endTime: '18:00' };
      }

      try {
        const response = await api.get(`/appointments?doctorId=${selectedDoctorId}`);
        const appointments = response.data.value || response.data || [];

        const bookedTimes = appointments
          .filter((apt: any) => apt.dateTime && apt.dateTime.startsWith(appointmentDate) && apt.status !== 'cancelled')
          .map((apt: any) => {
            const timePart = apt.dateTime.split('T')[1];
            return timePart ? timePart.substring(0, 5) : null;
          }).filter(Boolean);

        const updatedSlots = hospitalSlots.map((slotTime: string) => {
          const isBooked = bookedTimes.includes(slotTime);
          return { time: slotTime, available: !isBooked };
        });

        setAvailableSlots(updatedSlots);
      } catch (err) {
        console.error('Failed to fetch slots:', err);
        const fallbackSlots = hospitalSlots.map((slotTime: string) => ({
          time: slotTime,
          available: true,
        }));
        setAvailableSlots(fallbackSlots);
      }
    };

    fetchSlots();
  }, [selectedHospitalId, selectedDoctorId, appointmentDate, hospitals, doctors]);

  // Confirmation state
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hospRes, docRes, patRes] = await Promise.all([
          api.get('/hospitals'),
          api.get('/doctors'),
          api.get('/patients'),
        ]);

        setHospitals(hospRes.data);
        setDoctors(docRes.data);
        setPatients(patRes.data);

        // Auto-select defaults
        if (!selectedHospitalId && hospRes.data.length > 0) {
          setSelectedHospitalId(hospRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load booking prerequisite data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter doctors based on selected hospital
  const filteredDoctors = doctors.filter((doc) => {
    if (!selectedHospitalId) return true;
    return doc.hospitalId === selectedHospitalId || (doc.hospital && doc.hospital.id === selectedHospitalId);
  });

  // Keep selectedPatientId valid (default to 'new' so patients input their own booking data)
  useEffect(() => {
    if (!selectedPatientId) {
      setSelectedPatientId('new');
    }
  }, [currentPatient?.id, patients]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // ---- Basic validation ----
      if (!selectedPatientId) {
        alert('Please select a patient or enter a new patient.');
        setSubmitting(false);
        return;
      }
      if (!selectedHospitalId) {
        alert('Please select a hospital.');
        setSubmitting(false);
        return;
      }
      if (!selectedDoctorId) {
        alert('Please select a doctor.');
        setSubmitting(false);
        return;
      }
      if (!appointmentDate) {
        alert('Please select a consultation date.');
        setSubmitting(false);
        return;
      }
      if (!appointmentTime) {
        alert('Please select a time slot.');
        setSubmitting(false);
        return;
      }
      if (!appointmentType) {
        alert('Please select an encounter type.');
        setSubmitting(false);
        return;
      }
      if (!reason.trim()) {
        alert('Please enter a reason for the visit.');
        setSubmitting(false);
        return;
      }

      // ---- New patient specific validation ----
      if (selectedPatientId === 'new') {
        if (!newPatientName.trim()) {
          alert('Please enter the patient\'s full name.');
          setSubmitting(false);
          return;
        }
        if (!newPatientAge.trim()) {
          alert('Please enter the patient\'s age.');
          setSubmitting(false);
          return;
        }
        if (!newPatientPhone.trim()) {
          alert('Please enter the patient\'s phone number.');
          setSubmitting(false);
          return;
        }
      }

      const combinedDateTime = `${appointmentDate}T${appointmentTime}:00.000Z`;

      // Payload with proper status
      const payload: any = {
        doctorId: selectedDoctorId,
        hospitalId: selectedHospitalId,
        dateTime: combinedDateTime,
        durationMinutes: 30,
        type: appointmentType,
        triageLevel,
        reason,
        status: 'scheduled', // <-- set correct status
      };

      if (selectedPatientId === 'new') {
        payload.isNewPatient = true;
        payload.patientName = newPatientName;
        // optional extra fields (backend will ignore if not needed)
        payload.age = newPatientAge;
        payload.gender = newPatientGender;
        payload.phone = newPatientPhone;
        payload.email = newPatientEmail;
        payload.address = newPatientAddress;
      } else {
        payload.patientId = selectedPatientId;
      }

      const res = await api.post('/appointments', payload);

      setConfirmedAppointment(res.data);
      // Update selectedPatientId if a new patient was created
      if (selectedPatientId === 'new' && res.data.patientId) {
        setSelectedPatientId(res.data.patientId);
      }
      setSubmitting(false);
    } catch (err: any) {
      // Handle double‑booking error from backend (status 409)
      if (err.response && err.response.status === 409) {
        alert(err.response.data.error || 'This time slot is no longer available. Please select another time slot.');
        // Refresh available slots after a conflict
        // Triggers the useEffect that watches selectedDoctorId/appointmentDate
        // by resetting the selected time (forces refetch)
        setAppointmentTime('');
      } else {
        console.error('Failed to book appointment:', err);
        alert('Failed to book appointment. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // If Confirmed, render the Confirmation Screen
  if (confirmedAppointment) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="p-8 rounded-3xl bg-white border border-secondary text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">Appointment Confirmed</h2>
            <p className="text-sm text-slate-600">
              Your consultation has been booked successfully.
            </p>
          </div>

          {/* Details Card */}
          <div className="p-5 rounded-2xl bg-secondary/10 border border-secondary text-left text-sm space-y-3">
            <div className="flex items-center justify-between border-b border-secondary pb-2">
              <span className="text-slate-600">Appointment ID:</span>
              <span className="font-mono font-bold text-primary">{confirmedAppointment.id}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 uppercase">Patient Name</span>
                <p className="font-bold text-slate-900">
                  {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : (newPatientName || 'Patient')}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase">Hospital / Clinic</span>
                <p className="font-bold text-slate-900">
                  {selectedHospital?.name || 'Apollo Hospital & Medical Center'}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase">Attending Doctor</span>
                <p className="font-bold text-slate-900">
                  Dr. {selectedDoctor?.user?.firstName} {selectedDoctor?.user?.lastName} ({selectedDoctor?.specialization})
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase">Date & Time</span>
                <p className="font-bold text-slate-900 font-mono">
                  {new Date(confirmedAppointment.dateTime).toLocaleDateString()} at {appointmentTime}
                </p>
              </div>
            </div>

            <div className="border-t border-secondary pt-2 flex items-center justify-between">
              <span className="text-slate-600">Appointment Status:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold uppercase text-xs">
                {confirmedAppointment.status}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/appointments')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white border border-secondary hover:bg-secondary/20 text-slate-700 font-bold text-sm transition-colors"
            >
              View My Appointments
            </button>

            <button
              onClick={() => {
                setConfirmedAppointment(null);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm transition-all"
            >
              Book Another Appointment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Book Appointment</h1>
        </div>
        <p className="text-sm text-slate-600">
          Select target hospital, choose attending specialist, and pick an appointment time.
        </p>
      </div>

      <form onSubmit={handleConfirmBooking} className="p-6 rounded-3xl bg-white border border-secondary shadow-sm space-y-6">
        {/* Step 1: Hospital Selection */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-sm font-bold text-primary flex items-center">
              <Building2 className="w-4 h-4 mr-1.5" />
              1. Select Hospital
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {hospitals.map((hosp) => {
              const isSelected = selectedHospitalId === hosp.id;
              return (
                <div
                  key={hosp.id}
                  onClick={() => setSelectedHospitalId(hosp.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-slate-900 shadow-sm'
                      : 'bg-white border-secondary text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-sm leading-tight">{hosp.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center">
                    <MapPin className="w-3 h-3 text-primary mr-1 flex-shrink-0" />
                    {hosp.city}, {hosp.district}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Doctor Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-primary flex items-center">
            <Stethoscope className="w-4 h-4 mr-1.5" />
            2. Select Doctor
          </label>

          {filteredDoctors.length === 0 ? (
            <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary text-sm text-slate-600">
              No doctors currently listed for this hospital. Please select another hospital above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDoctors.map((doc) => {
                const isSelected = selectedDoctorId === doc.id;
                const docUser = doc.user;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctorId(doc.id)}
                    className={`p-4 rounded-2xl border cursor-pointer flex items-center space-x-3 transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-slate-900 shadow-sm'
                        : 'bg-white border-secondary text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary border border-secondary flex-shrink-0">
                      <img
                        src={doc.avatarUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80'}
                        alt={docUser ? docUser.firstName : 'Doctor'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">
                        Dr. {docUser ? `${docUser.firstName} ${docUser.lastName}` : 'Physician'}
                      </h4>
                      <p className="text-xs text-slate-600 font-semibold">{doc.specialization}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 font-mono mt-1">
                        <span>{doc.qualification || 'MD'}</span>
                        <span className="text-primary font-bold">${doc.consultationFee.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Date & Time Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-primary mb-1.5 flex items-center">
              <Calendar className="w-4 h-4 mr-1.5" />
              3. Date
            </label>
            <input
              type="date"
              required
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-primary mb-1.5 flex items-center">
              <Clock className="w-4 h-4 mr-1.5" />
              Time Slot
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => setAppointmentTime(slot.time)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    !slot.available
                      ? 'bg-secondary/20 text-slate-400 border border-secondary cursor-not-allowed line-through'
                      : appointmentTime === slot.time
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-secondary hover:border-primary'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Patient & Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Patient Profile</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary mb-2"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.mrn})
                </option>
              ))}
              <option value="new">+ Enter New Patient</option>
            </select>
            {selectedPatientId === 'new' && (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  placeholder="Age"
                  required
                  value={newPatientAge}
                  onChange={(e) => setNewPatientAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary"
                />
                <select
                  value={newPatientGender}
                  onChange={(e) => setNewPatientGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="undisclosed">Undisclosed</option>
                </select>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Address (optional)"
                  value={newPatientAddress}
                  onChange={(e) => setNewPatientAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Encounter Type</label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setAppointmentType('in_person')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  appointmentType === 'in_person'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white border-secondary text-slate-600'
                }`}
              >
                In-Clinic
              </button>
              <button
                type="button"
                onClick={() => setAppointmentType('telehealth')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  appointmentType === 'telehealth'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white border-secondary text-slate-600'
                }`}
              >
                Telehealth
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Reason for Visit</label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-3 rounded-xl border border-secondary bg-white text-slate-900 text-sm focus:outline-none focus:border-primary"
            placeholder="Describe reason for consultation..."
          />
        </div>

        {/* Submit */}
        <div className="pt-3 border-t border-secondary flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/hospitals')}
            className="px-4 py-2.5 rounded-xl bg-white border border-secondary hover:bg-secondary/20 text-slate-700 font-bold text-sm flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-sm flex items-center space-x-1.5 disabled:opacity-50 transition-all hover:scale-[1.02]"
          >
            <span>Confirm Appointment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
