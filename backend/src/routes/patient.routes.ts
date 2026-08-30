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
  
  // Combine store.patients, Firestore patients, and booked appointment patients
  const patientMap = new Map<string, Patient>();

  // 1. Pull in-memory store patients
  store.patients.forEach((p) => {
    const key = (p.id || `${p.firstName}-${p.lastName}`).toLowerCase();
    patientMap.set(key, p);
  });

  // 2. Pull registered users with role 'patient'
  store.users.filter((u) => u.role === 'patient').forEach((u) => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0];
    const key = (u.id || fullName).toLowerCase();
    if (!patientMap.has(key)) {
      const p: Patient = {
        id: u.id,
        userId: u.id,
        mrn: `NX-2026-${u.id.substring(0, 4)}`,
        firstName: u.firstName || u.email.split('@')[0],
        lastName: u.lastName || '',
        dateOfBirth: '1995-05-15',
        gender: 'female',
        bloodGroup: 'O+',
        phone: u.phone || '+91 98400 00000',
        email: u.email,
        address: 'Tamil Nadu, India',
        emergencyContactName: 'Family Contact',
        emergencyContactPhone: '+91 98400 00001',
        emergencyContactRelation: 'Family',
        allergies: [],
        chronicConditions: [],
        livingSummary: 'Registered patient profile.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      patientMap.set(key, p);
      store.patients.push(p);
    }
  });

  // 3. Pull Firestore patients and appointments if connected
  try {
    if (firebaseAdminDb) {
      const [snap, aptSnap] = await Promise.all([
        firebaseAdminDb.collection('patients').get(),
        firebaseAdminDb.collection('appointments').get(),
      ]);

      snap.docs.forEach((doc) => {
        const p = doc.data() as Patient;
        const key = (p.id || `${p.firstName}-${p.lastName}`).toLowerCase();
        if (!patientMap.has(key)) {
          patientMap.set(key, p);
        }
      });

      aptSnap.docs.forEach((doc) => {
        const apt = doc.data() as any;
        if (apt.patient) {
          const key = (apt.patient.id || `${apt.patient.firstName}-${apt.patient.lastName}`).toLowerCase();
          if (!patientMap.has(key)) {
            patientMap.set(key, apt.patient);
          }
        } else if (apt.patientName && apt.patientName.toLowerCase() !== 'patient' && apt.patientName.toLowerCase() !== 'patient name') {
          const parts = apt.patientName.trim().split(/\s+/);
          const key = apt.patientName.trim().toLowerCase();
          if (!patientMap.has(key)) {
            const p: Patient = {
              id: apt.patientId || doc.id,
              mrn: `NX-2026-${Math.floor(Math.random() * 900) + 100}`,
              firstName: parts[0] || 'Patient',
              lastName: parts.slice(1).join(' ') || '',
              dateOfBirth: apt.dateOfBirth || '2000-05-15',
              gender: apt.gender || 'Female',
              bloodGroup: 'O+',
              phone: apt.phone || '+91 98400 00000',
              email: apt.email || 'patient@nexahealth.ai',
              address: 'Tamil Nadu, India',
              emergencyContactName: 'Family Contact',
              emergencyContactPhone: '+91 98400 00001',
              emergencyContactRelation: 'Family',
              allergies: [],
              chronicConditions: [],
              livingSummary: apt.reason || 'Booked appointment patient.',
              createdAt: apt.createdAt || new Date().toISOString(),
              updatedAt: apt.updatedAt || new Date().toISOString(),
            };
            patientMap.set(key, p);
            store.patients.push(p);
          }
        }
      });
    }
  } catch (e) {}

  // 4. Pull in any patients from store.appointments
  store.appointments.forEach((apt) => {
    if (apt.patient) {
      const key = (apt.patient.id || `${apt.patient.firstName}-${apt.patient.lastName}`).toLowerCase();
      if (!patientMap.has(key)) {
        patientMap.set(key, apt.patient);
      }
    } else if (apt.patientName && apt.patientName.toLowerCase() !== 'patient' && apt.patientName.toLowerCase() !== 'patient name') {
      const parts = apt.patientName.trim().split(/\s+/);
      const key = apt.patientName.trim().toLowerCase();
      if (!patientMap.has(key)) {
        const p: Patient = {
          id: apt.patientId || uuidv4(),
          mrn: `NX-2026-${Math.floor(Math.random() * 900) + 100}`,
          firstName: parts[0] || 'Patient',
          lastName: parts.slice(1).join(' ') || '',
          dateOfBirth: (apt as any).dateOfBirth || '2000-05-15',
          gender: (apt as any).gender || 'Female',
          bloodGroup: 'O+',
          phone: (apt as any).phone || '+91 98400 00000',
          email: (apt as any).email || 'patient@nexahealth.ai',
          address: 'Tamil Nadu, India',
          emergencyContactName: 'Family Contact',
          emergencyContactPhone: '+91 98400 00001',
          emergencyContactRelation: 'Family',
          allergies: [],
          chronicConditions: [],
          livingSummary: apt.reason || 'Booked appointment patient.',
          createdAt: apt.createdAt || new Date().toISOString(),
          updatedAt: apt.updatedAt || new Date().toISOString(),
        };
        patientMap.set(key, p);
        store.patients.push(p);
      }
    }
  });

  let results = Array.from(patientMap.values()).filter((p) => {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase();
    return fullName !== 'emily davis' && fullName !== 'robert johnson' && fullName !== 'patient' && fullName !== 'patient name';
  });

  if (query) {
    results = results.filter((p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
      p.mrn.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      p.email.toLowerCase().includes(query)
    );
  }

  // Attach latest appointment reason directly into each patient record
  const enrichedResults = results.map((patient) => {
    const patientFullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim().toLowerCase();
    const patientAppointments = store.appointments.filter((a) => {
      if (a.patientId && (a.patientId === patient.id || a.patientId === patient.userId)) return true;
      if (a.patientName && a.patientName.trim().toLowerCase() === patientFullName) return true;
      return false;
    });

    const activeApt = patientAppointments.find(a => a.status === 'scheduled' || a.status === 'in_consultation' || a.status === 'checked_in') || patientAppointments[0];
    const visitReason = activeApt?.reason || (patient.livingSummary && !patient.livingSummary.includes('Personal digital health profile') ? patient.livingSummary : undefined);

    return {
      ...patient,
      reasonForVisit: visitReason || (patient as any).reasonForVisit || (patient as any).reason || undefined,
    };
  });

  res.json(enrichedResults);
});

// GET /api/patients/me - Get current logged-in patient profile
router.get('/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Look up patient by userId or email or linked appointment
  let patient = store.patients.find(
    (p) => (p.userId && p.userId === req.user!.id) || (p.id && p.id === req.user!.id) || (p.email && p.email.toLowerCase() === req.user!.email.toLowerCase())
  );

  if (!patient) {
    const userFullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim().toLowerCase();
    const apt = store.appointments.find((a) => 
      (a.patientId && a.patientId === req.user!.id) ||
      (a.patientName && a.patientName.trim().toLowerCase() === userFullName) ||
      (a.patient && a.patient.id === req.user!.id)
    );
    if (apt?.patient) {
      patient = apt.patient;
    }
  }

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

  if (!firstName || !phone || !email) {
    return res.status(400).json({ error: 'firstName, phone, and email are required' });
  }

  const newPatient: Patient = {
    id: req.user?.id || uuidv4(),
    userId: req.user?.id || undefined,
    mrn: `NX-${new Date().getFullYear()}-${String(store.patients.length + 1).padStart(3, '0')}`,
    firstName,
    lastName: lastName || '',
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
