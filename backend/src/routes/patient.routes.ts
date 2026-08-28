import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { AgentRuntime } from '../agents/core/AgentRuntime';
import { Patient, Vitals } from '../types/shared';
import { firebaseAdminDb } from '../config/firebase';

const router = Router();

// GET /api/patients - List patients (supports search by name, MRN, phone)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  let results = [...store.patients];
  try {
    const fbPatients = await firebaseAdminDb.collection('patients').get();
    fbPatients.forEach((doc: any) => {
      if (!results.find(p => p.id === doc.id)) {
        results.push(doc.data() as Patient);
      }
    });
  } catch(e) {}

  results = results.filter((p) => {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
    return fullName !== 'emily davis' && fullName !== 'robert johnson' && p.email !== 'emily.davis@patient.nexa.ai' && p.email !== 'robert.j@patient.nexa.ai';
  });

  if (query) {
    results = results.filter(
      (p) =>
        p.firstName.toLowerCase().includes(query) ||
        p.lastName.toLowerCase().includes(query) ||
        p.mrn.toLowerCase().includes(query) ||
        p.phone.includes(query)
    );
  }

  res.json(results);
});

// GET /api/patients/me - Get current logged-in patient profile
router.get('/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Look up patient by userId or email
  let patient = store.patients.find(
    (p) => (p.userId && p.userId === req.user!.id) || (p.email && p.email.toLowerCase() === req.user!.email.toLowerCase())
  );

  if (!patient && req.user.role === 'patient') {
    // Dynamically initialize patient profile for this authenticated user
    patient = {
      id: req.user.id || uuidv4(),
      userId: req.user.id,
      mrn: `NX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: req.user.firstName || req.user.email.split('@')[0],
      lastName: req.user.lastName || '',
      dateOfBirth: '1995-01-01',
      gender: 'undisclosed',
      bloodGroup: 'O+',
      phone: req.user.phone || '+91 98400 00000',
      email: req.user.email,
      address: 'Tamil Nadu, India',
      emergencyContactName: 'Family Contact',
      emergencyContactPhone: '+91 98400 00001',
      emergencyContactRelation: 'Family',
      allergies: [],
      chronicConditions: [],
      livingSummary: `Personal digital health profile for ${req.user.firstName || req.user.email}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.patients.push(patient);
  }

  if (!patient) {
    return res.status(404).json({ error: 'Profile not found. Please complete your profile.' });
  }

  const patientVitals = store.vitals.filter((v) => v.patientId === patient!.id);
  const patientNotes = store.clinicalNotes.filter((n) => n.patientId === patient!.id);
  const patientPrescriptions = store.prescriptions.filter((p) => p.patientId === patient!.id);
  const patientLabs = store.labOrders.filter((l) => l.patientId === patient!.id);
  const patientInvoices = store.invoices.filter((i) => i.patientId === patient!.id);
  const patientAlerts = store.clinicalAlerts.filter((a) => a.patientId === patient!.id);
  const patientReminders = store.medicationReminders.filter((r) => r.patientId === patient!.id);

  res.json({
    ...patient,
    vitals: patientVitals,
    clinicalNotes: patientNotes,
    prescriptions: patientPrescriptions,
    labOrders: patientLabs,
    invoices: patientInvoices,
    alerts: patientAlerts,
    reminders: patientReminders,
  });
});

// GET /api/patients/:id - Complete patient details with vitals, notes, prescriptions, and labs
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const patientId = String(req.params.id);
  let patient = store.patients.find((p) => p.id === patientId);
  
  if (!patient) {
    try {
      const doc = await firebaseAdminDb.collection('patients').doc(patientId).get();
      if (doc.exists) {
        patient = doc.data() as Patient;
        // Optionally cache it in store
        store.patients.push(patient);
      }
    } catch (e) {
      console.error('Error fetching patient from Firebase:', e);
    }
  }

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const patientVitals = store.vitals.filter((v) => v.patientId === patient.id);
  const patientNotes = store.clinicalNotes.filter((n) => n.patientId === patient.id);
  const patientPrescriptions = store.prescriptions.filter((p) => p.patientId === patient.id);
  const patientLabs = store.labOrders.filter((l) => l.patientId === patient.id);
  const patientInvoices = store.invoices.filter((i) => i.patientId === patient.id);
  const patientAlerts = store.clinicalAlerts.filter((a) => a.patientId === patient.id);
  const patientReminders = store.medicationReminders.filter((r) => r.patientId === patient.id);

  res.json({
    ...patient,
    vitals: patientVitals,
    clinicalNotes: patientNotes,
    prescriptions: patientPrescriptions,
    labOrders: patientLabs,
    invoices: patientInvoices,
    alerts: patientAlerts,
    reminders: patientReminders,
  });
});

// POST /api/patients - Register new patient (allowing 'patient' so they can complete their profile)
router.post('/', requireRole('patient', 'front_desk', 'nurse', 'doctor', 'admin', 'super_admin'), async (req: AuthenticatedRequest, res: Response) => {
  const {
    firstName,
    lastName,
    dateOfBirth,
    gender,
    phone,
    email,
    address,
    bloodGroup,
    allergies,
    chronicConditions,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
    insuranceProvider,
    insurancePolicyNumber,
    insuranceGroupNumber,
  } = req.body;

  if (!firstName || !lastName || !phone || !email) {
    return res.status(400).json({ error: 'firstName, lastName, phone, and email are required' });
  }

  const newPatient: Patient = {
    id: uuidv4(),
    mrn: `NX-${new Date().getFullYear()}-${String(store.patients.length + 1).padStart(3, '0')}`,
    firstName,
    lastName,
    dateOfBirth: dateOfBirth || '1990-01-01',
    gender: gender || 'undisclosed',
    bloodGroup: bloodGroup || undefined,
    phone,
    email,
    address: address || '',
    emergencyContactName: emergencyContactName || '',
    emergencyContactPhone: emergencyContactPhone || '',
    emergencyContactRelation: emergencyContactRelation || '',
    allergies: allergies || [],
    chronicConditions: chronicConditions || [],
    insuranceProvider: insuranceProvider || '',
    insurancePolicyNumber: insurancePolicyNumber || '',
    insuranceGroupNumber: insuranceGroupNumber || '',
    livingSummary: 'Baseline health profile established. Awaiting initial clinician encounter.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await firebaseAdminDb.collection('patients').doc(newPatient.id).set(newPatient);
  store.patients.unshift(newPatient);
  res.status(201).json(newPatient);
});

// DELETE /api/patients/:id - Delete a patient record
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const patientId = String(req.params.id);
  
  // Remove from memory
  const index = store.patients.findIndex(p => p.id === patientId);
  if (index !== -1) {
    store.patients.splice(index, 1);
  }
  
  // Remove from Firestore
  try {
    await firebaseAdminDb.collection('patients').doc(patientId).delete();
  } catch (err) {
    console.error('Failed to delete from Firestore:', err);
  }
  
  res.json({ success: true, message: 'Patient deleted successfully' });
});

// PUT /api/patients/:id - Update patient profile
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const patient = store.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  Object.assign(patient, req.body, { updatedAt: new Date().toISOString() });
  await firebaseAdminDb.collection('patients').doc(patient.id).set(patient);
  res.json(patient);
});

// POST /api/patients/:id/vitals - Record new patient vitals and run ClinicalAlert check
router.post('/:id/vitals', async (req: AuthenticatedRequest, res: Response) => {
  const patient = store.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const {
    heartRateBpm,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    respiratoryRate,
    temperatureCelsius,
    oxygenSaturationPercent,
    weightKg,
    heightCm,
    appointmentId,
  } = req.body;

  let bmi: number | undefined;
  if (weightKg && heightCm) {
    const heightM = heightCm / 100;
    bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }

  const vitalsRecord: Vitals & { id: string; patientId: string; appointmentId?: string } = {
    id: uuidv4(),
    patientId: patient.id,
    appointmentId,
    heartRateBpm,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    respiratoryRate,
    temperatureCelsius,
    oxygenSaturationPercent,
    weightKg,
    heightCm,
    bmi,
    recordedAt: new Date().toISOString(),
  };

  await firebaseAdminDb.collection('vitals').doc(vitalsRecord.id).set(vitalsRecord);
  store.vitals.unshift(vitalsRecord);

  // Autonomous trigger: Check for abnormal vitals (ClinicalAlertAgent)
  if (bloodPressureSystolic && bloodPressureSystolic >= 160) {
    const newAlert = {
      id: uuidv4(),
      patientId: patient.id,
      severity: 'critical' as any,
      source: 'vitals' as any,
      title: 'Severe Hypertensive Reading',
      message: `Systolic BP logged at ${bloodPressureSystolic} mmHg (Threshold: 140 mmHg). Immediate evaluation advised.`,
      isAcknowledged: false,
      createdAt: new Date().toISOString(),
    };
    await firebaseAdminDb.collection('clinicalAlerts').doc(newAlert.id).set(newAlert);
    store.clinicalAlerts.unshift(newAlert);
  }

  res.status(201).json(vitalsRecord);
});

// POST /api/patients/:id/summarize - Trigger living summary generation via PatientRecordSummaryAgent
router.post('/:id/summarize', async (req: AuthenticatedRequest, res: Response) => {
  const patient = store.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  try {
    const task = await AgentRuntime.runTask(
      'PatientRecordSummaryAgent',
      { patientId: patient.id },
      { userId: req.user?.id }
    );

    if (task.outputResult?.livingSummary) {
      patient.livingSummary = task.outputResult.livingSummary;
    }

    res.json({
      livingSummary: patient.livingSummary,
      task,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
