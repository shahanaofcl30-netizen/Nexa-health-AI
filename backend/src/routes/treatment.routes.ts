import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { Treatment, Prescription, PrescriptionItem, MedicationReminder } from '../types/shared';
import { firebaseAdminDb } from '../config/firebase';
import { CLINICAL_DISCLAIMER } from '../agents/core/SafetyGuardrails';

const router = Router();

// GET /api/treatments - List treatments with filtering
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { patientId, doctorId, hospitalId, appointmentId } = req.query;

  let results = [...store.treatments];

  if (patientId) results = results.filter((t) => t.patientId === patientId);
  if (doctorId) results = results.filter((t) => t.doctorId === doctorId);
  if (hospitalId) results = results.filter((t) => t.hospitalId === hospitalId);
  if (appointmentId) results = results.filter((t) => t.appointmentId === appointmentId);

  const populated = results.map((treatment) => {
    const patient = store.patients.find((p) => p.id === treatment.patientId);
    const doctor = store.doctors.find((d) => d.id === treatment.doctorId);
    const doctorUser = doctor ? store.users.find((u) => u.id === doctor.userId) : undefined;
    const hospital = store.hospitals.find((h) => h.id === treatment.hospitalId);
    const prescription = store.prescriptions.find((p) => p.id === treatment.prescriptionId);

    return {
      ...treatment,
      patient,
      doctor: doctor ? { ...doctor, user: doctorUser } : undefined,
      hospital,
      prescription,
    };
  });

  res.json(populated);
});

// GET /api/treatments/:id - Get specific treatment details
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const treatment = store.treatments.find((t) => t.id === req.params.id);
  if (!treatment) {
    return res.status(404).json({ error: 'Treatment record not found' });
  }

  const patient = store.patients.find((p) => p.id === treatment.patientId);
  const doctor = store.doctors.find((d) => d.id === treatment.doctorId);
  const doctorUser = doctor ? store.users.find((u) => u.id === doctor.userId) : undefined;
  const hospital = store.hospitals.find((h) => h.id === treatment.hospitalId);
  const prescription = store.prescriptions.find((p) => p.id === treatment.prescriptionId);

  res.json({
    ...treatment,
    patient,
    doctor: doctor ? { ...doctor, user: doctorUser } : undefined,
    hospital,
    prescription,
  });
});

// POST /api/treatments - Doctor records clinical consultation & treatment
router.post('/', requireRole('doctor', 'admin', 'super_admin'), async (req: AuthenticatedRequest, res: Response) => {
  // REQUIRES CLINICAL VALIDATION — NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL JUDGMENT.
  const {
    patientId,
    doctorId,
    hospitalId,
    appointmentId,
    symptoms,
    diagnosis,
    treatmentDetails,
    clinicalNotes,
    medicines = [],
    followUpDate,
  } = req.body;

  if (!patientId || !doctorId || !hospitalId || !symptoms || !diagnosis) {
    return res.status(400).json({
      error: 'patientId, doctorId, hospitalId, symptoms, and diagnosis are required',
    });
  }

  const treatmentId = uuidv4();
  let createdPrescriptionId: string | undefined = undefined;

  // 1. Generate an official linked electronic prescription for the encounter
  const prescriptionId = uuidv4();
  const effectiveMedicines = (Array.isArray(medicines) && medicines.length > 0)
    ? medicines
    : [{
        medicationName: 'Clinical Counseling / Preventive Care',
        dosage: 'Daily',
        frequency: 'As directed',
        durationDays: 30,
        instructions: treatmentDetails || clinicalNotes || 'Follow prescribed health regimen and hydration.',
      }];

  const prescriptionItems: PrescriptionItem[] = effectiveMedicines.map((m: any) => ({
    id: uuidv4(),
    prescriptionId,
    medicationName: m.medicationName,
    dosage: m.dosage,
    frequency: m.frequency,
    durationDays: m.durationDays || 7,
    instructions: m.instructions || 'Take as directed by physician',
    warnings: m.warnings || [],
  }));

  const newPrescription: Prescription = {
    id: prescriptionId,
    patientId,
    doctorId,
    hospitalId,
    appointmentId,
    treatmentId,
    pharmacyId: store.pharmacies[0]?.id,
    items: prescriptionItems,
    diagnosis,
    notes: clinicalNotes || `Prescribed during encounter at ${hospitalId}`,
    status: 'signed',
    signedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    if (firebaseAdminDb) {
      await firebaseAdminDb.collection('prescriptions').doc(newPrescription.id).set(newPrescription);
    }
  } catch (e) {}

  store.prescriptions.unshift(newPrescription);
  createdPrescriptionId = prescriptionId;

  // Populate patient medication reminders
  prescriptionItems.forEach((item) => {
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

  // 2. Create the Treatment Record
  const newTreatment: Treatment = {
    id: treatmentId,
    patientId,
    doctorId,
    hospitalId,
    appointmentId,
    prescriptionId: createdPrescriptionId,
    symptoms,
    diagnosis,
    treatmentDetails: treatmentDetails || 'Clinical evaluation and treatment plan established.',
    clinicalNotes: clinicalNotes || '',
    medicines: medicines.map((m: any) => ({
      id: m.id || uuidv4(),
      medicationName: m.medicationName,
      dosage: m.dosage,
      frequency: m.frequency,
      durationDays: m.durationDays || 7,
      instructions: m.instructions,
    })),
    followUpDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await firebaseAdminDb.collection('treatments').doc(newTreatment.id).set(newTreatment);
  store.treatments.unshift(newTreatment);

  // 3. Complete the corresponding appointment if appointmentId exists
  if (appointmentId) {
    const apt = store.appointments.find((a) => a.id === appointmentId);
    if (apt) {
      apt.status = 'completed';
      apt.updatedAt = new Date().toISOString();
    }
  }

  // 4. Update Patient Living Summary / EHR history
  const patient = store.patients.find((p) => p.id === patientId);
  const hospital = store.hospitals.find((h) => h.id === hospitalId);
  const doctor = store.doctors.find((d) => d.id === doctorId);

  if (patient) {
    const brief = `Encounter on ${new Date().toLocaleDateString()}: Treated for ${diagnosis}. Follow-up scheduled for ${followUpDate || 'PRN'}.`;
    patient.livingSummary = patient.livingSummary ? `${patient.livingSummary} ${brief}` : brief;
    patient.updatedAt = new Date().toISOString();
  }

  // 5. Generate a Medical Record in the Vault
  const consultationRecord = {
    id: uuidv4(),
    patientId,
    title: `Consultation: ${diagnosis}`,
    category: 'clinical',
    description: `Official Medical Record for consultation regarding ${diagnosis}. Notes: ${clinicalNotes || 'No additional notes'}`,
    fileUrl: '/documents/clinical_consultation_record.pdf',
    version: 1,
    createdAt: new Date().toISOString(),
  };
  store.documents.unshift(consultationRecord);

  res.status(201).json({
    treatment: newTreatment,
    prescriptionId: createdPrescriptionId,
    clinicalDisclaimer: CLINICAL_DISCLAIMER,
    patient,
    doctor,
    hospital,
  });
});

export default router;
