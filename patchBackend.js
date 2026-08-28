const fs = require('fs');

const file = 'backend/src/routes/appointment.routes.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add double booking check in POST /api/appointments
const postPattern = /router\.post\('\/', async \(req: AuthenticatedRequest, res: Response\) => \{\n  const \{\n    patientId,\n    doctorId,\n    hospitalId,\n    dateTime,\n    durationMinutes = 30,\n    type = 'in_person',\n    triageLevel = 'routine',\n    reason,\n    notes,\n    status = 'confirmed',\n  \} = req\.body;/g;

content = content.replace(postPattern, `router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const {
    patientId: existingPatientId,
    isNewPatient,
    patientName,
    doctorId,
    hospitalId,
    dateTime,
    durationMinutes = 30,
    type = 'in_person',
    triageLevel = 'routine',
    reason,
    notes,
    status = 'confirmed',
  } = req.body;
`);

const validationPattern = /if \(!patientId \|\| !doctorId \|\| !dateTime \|\| !reason\) \{\n    return res\.status\(400\)\.json\(\{ error: 'patientId, doctorId, dateTime, and reason are required' \}\);\n  \}/g;

content = content.replace(validationPattern, `if ((!existingPatientId && !isNewPatient) || !doctorId || !dateTime || !reason) {
    return res.status(400).json({ error: 'patientId (or isNewPatient), doctorId, dateTime, and reason are required' });
  }

  // 1. Double Booking Check (Firestore + Store)
  const doubleBookedQuery = await firebaseAdminDb.collection('appointments')
    .where('doctorId', '==', doctorId)
    .where('dateTime', '==', dateTime)
    .get();

  const isDoubleBooked = doubleBookedQuery.docs.some(doc => doc.data().status !== 'cancelled') || 
                         store.appointments.some(a => a.doctorId === doctorId && a.dateTime === dateTime && a.status !== 'cancelled');
  
  if (isDoubleBooked) {
    return res.status(409).json({ error: 'This time slot is no longer available. Please select another time.' });
  }

  // 2. Handle New Patient Creation
  let patientId = existingPatientId;
  let patient;

  if (isNewPatient && patientName) {
    const parts = patientName.split(' ');
    const newPatient = {
      id: uuidv4(),
      mrn: \`MRN-\${Math.floor(Math.random() * 90000) + 10000}\`,
      firstName: parts[0],
      lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
      dateOfBirth: '1990-01-01', // Default required field
      gender: 'other',
      contactNumber: '',
      email: '',
      address: '',
      bloodGroup: 'O+',
      emergencyContactName: '',
      emergencyContactNumber: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await firebaseAdminDb.collection('patients').doc(newPatient.id).set(newPatient);
    store.patients.unshift(newPatient);
    patientId = newPatient.id;
    patient = newPatient;
  }
`);

// Add patientName to the newAppointment creation
content = content.replace(
  "patientId,",
  "patientId,\n    patientName: patient ? `${patient.firstName} ${patient.lastName}` : (store.patients.find(p => p.id === patientId)?.firstName + ' ' + store.patients.find(p => p.id === patientId)?.lastName),"
);


// Replace patient fetch to not overwrite the created patient if it was just created
content = content.replace(
  "const patient = store.patients.find((p) => p.id === patientId);",
  "if (!patient) patient = store.patients.find((p) => p.id === patientId);"
);

fs.writeFileSync(file, content);
console.log('Backend appointment routes successfully modified');
