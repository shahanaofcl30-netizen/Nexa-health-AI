const fs = require('fs');

const file = 'frontend/src/pages/appointment/BookAppointmentFlowPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the malicious useEffect that forces selectedPatientId
const useEffectPattern = /\/\/ Keep selectedPatientId valid with logged in patient[\s\S]*?\}, \[currentPatient, patients, selectedPatientId\]\);/g;
content = content.replace(useEffectPattern, '');

// 2. Add state for patient search and errors
content = content.replace(
  "const [selectedPatientId, setSelectedPatientId] = useState<string>('');",
  `const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [bookingError, setBookingError] = useState('');`
);

// 3. Update handleConfirmBooking
const confirmBookingStart = /const handleConfirmBooking = async \(e: React\.FormEvent\) => \{/g;
content = content.replace(confirmBookingStart, `const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    if (!selectedPatientId && !isNewPatient) {
      setBookingError('Please select or enter a patient.');
      return;
    }
    if (!selectedHospitalId || !selectedDoctorId || !appointmentDate || !appointmentTime || !reason) {
      setBookingError('Please fill all required fields.');
      return;
    }
`);

const apiPostPattern = /const res = await api\.post\('\/appointments', \{([\s\S]*?)\}\);/g;
content = content.replace(apiPostPattern, `const res = await api.post('/appointments', {
        patientId: isNewPatient ? undefined : selectedPatientId,
        isNewPatient,
        patientName: isNewPatient ? patientSearchQuery : undefined,$1});`);

// 4. Update the catch block to show the error message
content = content.replace(
  /\} catch \(err\) \{\n\s*console\.error\('Failed to book appointment:', err\);\n\s*\}/g,
  `} catch (err: any) {
      console.error('Failed to book appointment:', err);
      setBookingError(err.response?.data?.error || 'Unable to confirm appointment. Please try again.');
    }`
);

// 5. Replace the Patient Select UI
const patientSelectStart = /<div>\s*<label className="block text-xs font-bold text-slate-400 mb-1">Patient Profile<\/label>[\s\S]*?<\/select>\s*<\/div>/g;

const newPatientUI = `
<div className="relative">
  <label className="block text-xs font-bold text-slate-400 mb-1">Patient Profile</label>
  <div className="relative">
    <input
      type="text"
      placeholder="Search or enter patient name..."
      value={patientSearchQuery}
      onChange={(e) => {
        setPatientSearchQuery(e.target.value);
        setIsNewPatient(false);
        setSelectedPatientId('');
      }}
      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white bg-slate-900 text-xs focus:outline-none"
    />
    
    {patientSearchQuery && !isNewPatient && !selectedPatientId && (
      <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
        {patients
          .filter((p) => \`\${p.firstName} \${p.lastName}\`.toLowerCase().includes(patientSearchQuery.toLowerCase()))
          .map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setSelectedPatientId(p.id);
                setPatientSearchQuery(\`\${p.firstName} \${p.lastName}\`);
                setIsNewPatient(false);
              }}
              className="px-3.5 py-2 text-xs text-white hover:bg-brand-500/20 cursor-pointer border-b border-slate-700/50 last:border-0"
            >
              {p.firstName} {p.lastName} <span className="text-slate-400 text-[10px] ml-1">({p.mrn})</span>
            </div>
          ))}
          <div
            onClick={() => {
              setIsNewPatient(true);
              setSelectedPatientId('');
            }}
            className="px-3.5 py-2 text-xs text-brand-400 hover:bg-brand-500/20 cursor-pointer font-bold"
          >
            + Add New Patient: "{patientSearchQuery}"
          </div>
      </div>
    )}
  </div>
  {isNewPatient && (
    <p className="text-[10px] text-emerald-400 mt-1 font-bold">New/Manual Patient will be created</p>
  )}
  {selectedPatientId && (
    <p className="text-[10px] text-brand-400 mt-1 font-bold">Existing Patient Selected</p>
  )}
</div>
`;
content = content.replace(patientSelectStart, newPatientUI);

// 6. Inject the error message above the submit button
content = content.replace(
  /\{!\* Submit \*\}/g,
  `{bookingError && (
          <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
            {bookingError}
          </div>
        )}
        {/* Submit */}`
);

// 7. Update Confirmation UI to exactly match user prompt format
const confirmStart = /<div className="space-y-1">[\s\S]*?<h2 className="text-2xl font-extrabold text-white">Appointment Confirmed<\/h2>[\s\S]*?<\/div>/g;
content = content.replace(confirmStart, `<div className="space-y-1">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Booking Successful
            </span>
            <h2 className="text-2xl font-extrabold text-white">Appointment Confirmed Successfully!</h2>
          </div>`);

// Change the details card labels
content = content.replace(/Patient Name/g, "Patient");
content = content.replace(/Hospital \/ Clinic/g, "Hospital");
content = content.replace(/Attending Doctor/g, "Doctor");
content = content.replace(/Date & Time/g, "Date");

// We need to inject "Time", "Visit Type", and "Reason" as well.
// Let's just rewrite the entire details card block
const detailsStart = /{!\* Details Card \*\}[\s\S]*?{!\* Actions \*\}/g;
const newDetails = `{/* Details Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left text-xs space-y-3">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Patient</span>
                <p className="font-bold text-white">
                  {confirmedAppointment.patientName || (selectedPatient ? \`\${selectedPatient.firstName} \${selectedPatient.lastName}\` : patientSearchQuery)}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase">Hospital</span>
                <p className="font-bold text-brand-400">
                  {selectedHospital?.name}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase">Doctor</span>
                <p className="font-bold text-white">
                  Dr. {selectedDoctor?.user?.firstName} {selectedDoctor?.user?.lastName}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase">Date</span>
                <p className="font-bold text-white font-mono">
                  {new Date(confirmedAppointment.dateTime).toLocaleDateString('en-GB').replace(/\\//g, '-')}
                </p>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Time</span>
                <p className="font-bold text-white font-mono">
                  {new Date(confirmedAppointment.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Visit Type</span>
                <p className="font-bold text-white">
                  {confirmedAppointment.type === 'telehealth' ? 'Telehealth Video' : 'In-Hospital Visit'}
                </p>
              </div>
              
              <div className="col-span-1 sm:col-span-2">
                <span className="text-[10px] text-slate-500 uppercase">Reason</span>
                <p className="font-bold text-white">
                  {confirmedAppointment.reason}
                </p>
              </div>
            </div>

            <div className="pt-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Appointment ID:</span>
                <span className="font-mono font-bold text-brand-300">{confirmedAppointment.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold uppercase text-[10px]">
                  Confirmed
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}`;

content = content.replace(detailsStart, newDetails);

// Add "Confirming Appointment..." to button
const buttonPattern = /<span>Confirm Appointment<\/span>/g;
content = content.replace(buttonPattern, "<span>{submitting ? 'Confirming Appointment...' : 'Confirm Appointment'}</span>");

fs.writeFileSync(file, content);

console.log('Frontend booked successfully modified');
