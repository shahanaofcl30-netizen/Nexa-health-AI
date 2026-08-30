import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { AgentRuntime } from '../agents/core/AgentRuntime';
import { Prescription, PrescriptionStatus, PrescriptionItem } from '../types/shared';
import { firebaseAdminDb } from '../config/firebase';
import { CLINICAL_DISCLAIMER } from '../agents/core/SafetyGuardrails';

const router = Router();

// GET /api/prescriptions - List prescriptions with filters
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { patientId, doctorId, hospitalId } = req.query;

  let results = store.prescriptions.filter((p) => {
    // Filter out dummy/placeholder prescriptions
    const isPlaceholderMedicine = p.items?.some(item => {
      const name = (item.medicationName || '').toLowerCase();
      return name.includes('no medication') || name.includes('no medicine') || name.includes('(n/a)') || name === 'n/a';
    });
    if (isPlaceholderMedicine) return false;
    return true;
  });

  if (patientId) results = results.filter((p) => p.patientId === patientId);
  if (doctorId) results = results.filter((p) => p.doctorId === doctorId);
  if (hospitalId) results = results.filter((p) => p.hospitalId === hospitalId);

  const populated = results.map((rx) => {
    let patient = store.patients.find((p) => p.id === rx.patientId || p.userId === rx.patientId);
    if (!patient && rx.appointmentId) {
      const linkedApt = store.appointments.find((a) => a.id === rx.appointmentId);
      if (linkedApt) {
        if (linkedApt.patient) {
          patient = linkedApt.patient;
        } else if (linkedApt.patientName) {
          const parts = linkedApt.patientName.trim().split(/\s+/);
          patient = {
            id: linkedApt.patientId || rx.patientId,
            mrn: `NX-2026-${Math.abs(linkedApt.id.charCodeAt(0) * 10 + 52)}`,
            firstName: parts[0] || 'Patient',
            lastName: parts.slice(1).join(' ') || '',
            dateOfBirth: (linkedApt as any).dateOfBirth || '2000-05-15',
            gender: (linkedApt as any).gender || 'Female',
            phone: (linkedApt as any).phone || '+91 98400 00000',
            email: (linkedApt as any).email || 'patient@nexahealth.ai',
            address: '',
            emergencyContactName: '',
            emergencyContactPhone: '',
            emergencyContactRelation: '',
            allergies: [],
            chronicConditions: [],
            createdAt: linkedApt.createdAt || new Date().toISOString(),
            updatedAt: linkedApt.updatedAt || new Date().toISOString(),
          } as any;
        }
      }
    }
    const doctor = store.doctors.find((d) => d.id === rx.doctorId);
    const pharmacy = store.pharmacies.find((ph) => ph.id === rx.pharmacyId);
    const hospital = store.hospitals.find((h) => h.id === rx.hospitalId) || (doctor ? store.hospitals.find((h) => h.id === doctor.hospitalId) : undefined);
    return {
      ...rx,
      patient,
      doctor,
      pharmacy,
      hospital,
    };
  });

  res.json(populated);
});

// GET /api/prescriptions/medications - Drug reference catalog
router.get('/medications', (_req: AuthenticatedRequest, res: Response) => {
  res.json(store.medications);
});

// POST /api/prescriptions/check-interactions - Prescription Assistance Agent
router.post('/check-interactions', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, medicationNames } = req.body;

  if (!patientId || !medicationNames || !Array.isArray(medicationNames)) {
    return res.status(400).json({ error: 'patientId and medicationNames array are required' });
  }

  try {
    const task = await AgentRuntime.runTask(
      'PrescriptionAssistanceAgent',
      {
        patientId,
        medicationNames,
      },
      { userId: req.user?.id }
    );

    res.json({
      checkResult: task.outputResult,
      task,
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prescriptions - Create e-Prescription
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const {
    patientId,
    doctorId,
    hospitalId,
    appointmentId,
    treatmentId,
    pharmacyId,
    items,
    diagnosis,
    notes,
    status = 'signed',
  } = req.body;

  if (!patientId || !doctorId || !items || !items.length || !diagnosis) {
    return res.status(400).json({ error: 'patientId, doctorId, items, and diagnosis are required' });
  }

  // Derive hospitalId from doctor if missing
  let effectiveHospitalId = hospitalId;
  if (!effectiveHospitalId) {
    const doc = store.doctors.find((d) => d.id === doctorId);
    effectiveHospitalId = doc?.hospitalId || store.hospitals[0]?.id;
  }

  // Autonomous allergy check before saving
  const medNames = items.map((i: any) => i.medicationName);
  const checkTask = await AgentRuntime.runTask(
    'PrescriptionAssistanceAgent',
    { patientId, medicationNames: medNames },
    { userId: req.user?.id }
  );

  const newPrescription: Prescription = {
    id: uuidv4(),
    patientId,
    doctorId,
    hospitalId: effectiveHospitalId,
    appointmentId,
    treatmentId,
    pharmacyId: pharmacyId || store.pharmacies[0]?.id,
    items: items.map((item: any) => ({
      id: uuidv4(),
      medicationId: item.medicationId,
      medicationName: item.medicationName,
      dosage: item.dosage,
      frequency: item.frequency,
      durationDays: item.durationDays || 7,
      instructions: item.instructions || 'Take as directed',
      warnings: item.warnings || [],
    })),
    diagnosis,
    notes,
    status: status as PrescriptionStatus,
    interactionCheckResult: checkTask.outputResult as any,
    signedAt: status === 'signed' ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await firebaseAdminDb.collection('prescriptions').doc(newPrescription.id).set(newPrescription);
  store.prescriptions.unshift(newPrescription);

  // If signed, automatically populate medication reminders for the patient
  if (status === 'signed') {
    newPrescription.items.forEach((item: PrescriptionItem) => {
      store.medicationReminders.push({
        id: uuidv4(),
        patientId,
        prescriptionItemId: item.id,
        medicationName: item.medicationName,
        dosage: item.dosage,
        scheduledTime: '08:00',
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: item.instructions,
      });
    });
  }

  const patient = store.patients.find((p) => p.id === patientId);
  const doctor = store.doctors.find((d) => d.id === doctorId);
  const hospital = store.hospitals.find((h) => h.id === effectiveHospitalId);

  res.status(201).json({
    ...newPrescription,
    patient,
    doctor,
    hospital,
  });
});

// PUT /api/prescriptions/:id/sign - Doctor Sign e-Prescription
router.put('/:id/sign', requireRole('doctor', 'admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const rx = store.prescriptions.find((p) => p.id === req.params.id);
  if (!rx) {
    return res.status(404).json({ error: 'Prescription not found' });
  }

  rx.status = 'signed';
  rx.signedAt = new Date().toISOString();
  rx.updatedAt = new Date().toISOString();

  // Create reminders
  rx.items.forEach((item) => {
    store.medicationReminders.push({
      id: uuidv4(),
      patientId: rx.patientId,
      prescriptionItemId: item.id,
      medicationName: item.medicationName,
      dosage: item.dosage,
      scheduledTime: '08:00',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: item.instructions,
    });
  });

  res.json(rx);
});

// PUT /api/prescriptions/:id/dispense - Pharmacy mark dispensed
router.put('/:id/dispense', async (req: AuthenticatedRequest, res: Response) => {
  const rx = store.prescriptions.find((p) => p.id === req.params.id);
  if (!rx) {
    return res.status(404).json({ error: 'Prescription not found' });
  }

  rx.status = 'dispensed';
  rx.dispensedAt = new Date().toISOString();
  rx.updatedAt = new Date().toISOString();
  res.json(rx);
});

export default router;
