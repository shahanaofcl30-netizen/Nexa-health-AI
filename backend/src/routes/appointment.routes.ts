import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { AgentRuntime } from '../agents/core/AgentRuntime';
import { firebaseAdminDb } from '../config/firebase';
import { Appointment, AppointmentStatus, AppointmentType, TriageLevel } from '../types/shared';

const router = Router();

// GET /api/appointments - List appointments with filters
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { doctorId, patientId, hospitalId, status, date } = req.query;

  let results = store.appointments;

  // Enforce patient-level isolation: if caller is a patient, resolve their patient profile
  if (req.user && req.user.role === 'patient') {
    const callerPatient = store.patients.find(
      (p) => (p.userId && p.userId === req.user!.id) || (p.email && p.email.toLowerCase() === req.user!.email.toLowerCase()) || p.id === req.user!.id
    );
    const effectivePatientId = callerPatient ? callerPatient.id : req.user.id;
    results = results.filter((a) => a.patientId === effectivePatientId || (callerPatient && a.patientId === callerPatient.id));
  } else if (patientId) {
    results = results.filter((a) => a.patientId === patientId);
  }

  if (doctorId) {
    results = results.filter((a) => a.doctorId === doctorId);
  }
  if (hospitalId) {
    results = results.filter((a) => a.hospitalId === hospitalId);
  }
  if (status) {
    results = results.filter((a) => a.status === status);
  }
  if (date) {
    results = results.filter((a) => a.dateTime.startsWith(date as string));
  }

  // Populate patient, doctor, and hospital information
  const populated = results.map((apt) => {
    const patient = store.patients.find((p) => p.id === apt.patientId);
    const doctor = store.doctors.find((d) => d.id === apt.doctorId);
    const doctorUser = doctor ? store.users.find((u) => u.id === doctor.userId) : undefined;
    const hospital = store.hospitals.find((h) => h.id === apt.hospitalId) || (doctor ? store.hospitals.find((h) => h.id === doctor.hospitalId) : undefined);

    return {
      ...apt,
      patient,
      doctor: doctor ? { ...doctor, user: doctorUser } : undefined,
      hospital,
    };
  });

  res.json(populated);
});

// GET /api/appointments/:id - Single appointment details
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const apt = store.appointments.find((a) => a.id === req.params.id);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const patient = store.patients.find((p) => p.id === apt.patientId);
  const doctor = store.doctors.find((d) => d.id === apt.doctorId);
  const doctorUser = doctor ? store.users.find((u) => u.id === doctor.userId) : undefined;
  const hospital = store.hospitals.find((h) => h.id === apt.hospitalId) || (doctor ? store.hospitals.find((h) => h.id === doctor.hospitalId) : undefined);
  const clinicalNotes = store.clinicalNotes.filter((n) => n.appointmentId === apt.id);
  const vitals = store.vitals.filter((v) => v.appointmentId === apt.id);
  const prescriptions = store.prescriptions.filter((p) => p.appointmentId === apt.id);
  const treatments = store.treatments.filter((t) => t.appointmentId === apt.id);

  res.json({
    ...apt,
    patient,
    doctor: doctor ? { ...doctor, user: doctorUser } : undefined,
    hospital,
    clinicalNotes,
    vitals,
    prescriptions,
    treatments,
  });
});

// POST /api/appointments - Book new appointment (Hospital -> Doctor -> Patient Flow)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
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


  if ((!existingPatientId && !isNewPatient) || !doctorId || !hospitalId || !dateTime || !reason) {
    return res.status(400).json({ error: 'patientId, hospitalId, doctorId, dateTime, and reason are required' });
  }

  // 1. Validate Hospital <-> Doctor Relationship
  const targetHospital = store.hospitals.find(h => h.id === hospitalId);
  const targetDoctor = store.doctors.find(d => d.id === doctorId);
  
  if (!targetHospital || !targetDoctor) {
    return res.status(400).json({ error: 'Invalid hospital or doctor selected.' });
  }

  const isValidAssociation = targetDoctor.hospitalId === hospitalId || (targetHospital.availableDoctorIds && targetHospital.availableDoctorIds.includes(doctorId));
  if (!isValidAssociation) {
    return res.status(400).json({ error: 'The selected doctor is not associated with this hospital.' });
  }

  // 2. Validate Hospital Working Hours & Doctor Availability
  const requestedTime = dateTime.split('T')[1]?.substring(0, 5);
  const appointmentDateObj = new Date(dateTime);
  const dayOfWeek = appointmentDateObj.getDay();

  if (requestedTime) {
    if (targetHospital.consultationSlots && targetHospital.consultationSlots.length > 0) {
      if (!targetHospital.consultationSlots.includes(requestedTime)) {
        return res.status(400).json({ error: 'The requested time is outside the hospital working hours.' });
      }
    }

    if (targetDoctor.availabilitySchedule && targetDoctor.availabilitySchedule.length > 0) {
      const scheduleForDay = targetDoctor.availabilitySchedule.find((s: any) => s.dayOfWeek === dayOfWeek);
      if (!scheduleForDay) {
        return res.status(400).json({ error: 'The selected doctor is not available on this day.' });
      }
      if (requestedTime < scheduleForDay.startTime || requestedTime >= scheduleForDay.endTime) {
        return res.status(400).json({ error: 'The requested time is outside the doctor availability hours.' });
      }
    }
  }

  // 3. Double Booking Check (Firestore + Store)
  let isDoubleBooked = store.appointments.some(a => a.doctorId === doctorId && a.dateTime === dateTime && a.status !== 'cancelled');
  try {
    if (firebaseAdminDb) {
      const doubleBookedQuery = await firebaseAdminDb.collection('appointments')
        .where('doctorId', '==', doctorId)
        .where('dateTime', '==', dateTime)
        .get();
      if (doubleBookedQuery.docs.some(doc => doc.data().status !== 'cancelled')) {
        isDoubleBooked = true;
      }
    }
  } catch (e) {
    // Fall back to in-memory store
  }
  
  if (isDoubleBooked) {
    return res.status(409).json({ error: 'This time slot is no longer available. Please select another time.' });
  }

  // 2. Handle New Patient Creation
  let patientId = existingPatientId;
  if (!patientId && req.user && req.user.role === 'patient') {
    const callerPatient = store.patients.find(
      (p) => (p.userId && p.userId === req.user!.id) || (p.email && p.email.toLowerCase() === req.user!.email.toLowerCase()) || p.id === req.user!.id
    );
    patientId = callerPatient ? callerPatient.id : req.user.id;
  }
  let patient;

  if (isNewPatient && patientName) {
    const parts = patientName.split(' ');
    const newPatient = {
      id: uuidv4(),
      mrn: `MRN-${Math.floor(Math.random() * 90000) + 10000}`,
      firstName: parts[0],
      lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
      dateOfBirth: '1990-01-01', // Default required field
      gender: 'other',
      phone: '',
      email: '',
      address: '',
      bloodGroup: 'O+',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      allergies: [],
      chronicConditions: [],
      livingSummary: reason || 'Scheduled Consultation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;
    
    try {
      if (firebaseAdminDb) {
        await firebaseAdminDb.collection('patients').doc(newPatient.id).set(newPatient);
      }
    } catch (e) {
      // Offline fallback
    }
    store.patients.unshift(newPatient);
    patientId = newPatient.id;
    patient = newPatient;
  }


  // Determine effective hospitalId
  let effectiveHospitalId = hospitalId;

  const newAppointment: Appointment = {
    id: uuidv4(),
    patientId,
    patientName,
    doctorId,
    hospitalId: effectiveHospitalId,
    dateTime,
    durationMinutes,
    type: type as AppointmentType,
    status: status as AppointmentStatus,
    triageLevel: triageLevel as TriageLevel,
    reason,
    notes,
    telehealthRoomId: type === 'telehealth' ? `telehealth-room-${uuidv4().slice(0, 8)}` : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const firestoreData = Object.fromEntries(
    Object.entries(newAppointment).filter(([_, v]) => v !== undefined)
  );
  await firebaseAdminDb.collection('appointments').doc(newAppointment.id).set(firestoreData);
  store.appointments.unshift(newAppointment);

  // Populate response
  if (!patient) patient = store.patients.find((p) => p.id === patientId);
  const doctor = store.doctors.find((d) => d.id === doctorId);
  const doctorUser = doctor ? store.users.find((u) => u.id === doctor.userId) : undefined;
  const hospital = store.hospitals.find((h) => h.id === effectiveHospitalId);

  // Autonomous notification to patient
  if (patient?.userId) {
    store.notifications.unshift({
      id: uuidv4(),
      userId: patient.userId,
      title: 'Appointment Confirmed',
      message: `Your appointment at ${hospital?.name || 'the clinic'} is confirmed for ${new Date(dateTime).toLocaleString()}`,
      type: 'appointment',
      isRead: false,
      createdAt: new Date().toISOString(),
      actionLink: `/appointments`,
    });
  }

  res.status(201).json({
    ...newAppointment,
    patient,
    doctor: doctor ? { ...doctor, user: doctorUser } : undefined,
    hospital,
  });
});

// PUT /api/appointments/:id/status - Update appointment status / reschedule
router.put('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const apt = store.appointments.find((a) => a.id === req.params.id);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  const { status, dateTime } = req.body;
  if (!status && !dateTime) {
    return res.status(400).json({ error: 'status or dateTime is required' });
  }

  if (status) {
    apt.status = status as AppointmentStatus;
  }

  if (dateTime) {
    apt.dateTime = dateTime;
    apt.status = 'rescheduled';
  }

  apt.updatedAt = new Date().toISOString();
  await firebaseAdminDb.collection('appointments').doc(apt.id).update({ status: apt.status, dateTime: apt.dateTime, updatedAt: apt.updatedAt });

  // If completed, autonomous trigger: BillingAgent creates draft invoice if none exists
  if (status === 'completed') {
    const existingInvoice = store.invoices.find((i) => i.appointmentId === apt.id);
    if (!existingInvoice) {
      const doctor = store.doctors.find((d) => d.id === apt.doctorId);
      const fee = doctor?.consultationFee || 100;
      const patient = store.patients.find((p) => p.id === apt.patientId);
      const discount = patient?.insuranceProvider ? fee * 0.7 : 0;

      const newInv = {

        id: uuidv4(),
        patientId: apt.patientId,
        hospitalId: apt.hospitalId,
        appointmentId: apt.id,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(store.invoices.length + 1).padStart(4, '0')}`,
        items: [
          {
            id: uuidv4(),
            description: `Clinical Consultation (${doctor?.specialization || 'General'})`,
            category: 'consultation' as any,
            unitPrice: fee,
            quantity: 1,
            totalPrice: fee,
          },
        ],
        subtotal: fee,
        taxAmount: 0,
        insuranceDiscount: discount,
        patientPayable: fee - discount,
        status: 'issued' as any,
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        patient,
      };
      await firebaseAdminDb.collection('invoices').doc(newInv.id).set(newInv);
      store.invoices.unshift(newInv);
    }
  }

  const patient = store.patients.find((p) => p.id === apt.patientId);
  const doctor = store.doctors.find((d) => d.id === apt.doctorId);
  const hospital = store.hospitals.find((h) => h.id === apt.hospitalId);

  res.json({
    ...apt,
    patient,
    doctor,
    hospital,
  });
});

// POST /api/appointments/agent-schedule - Autonomous Scheduling Agent
router.post('/agent-schedule', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, doctorId, hospitalId, symptoms, preferredDay, urgency } = req.body;

  try {
    const task = await AgentRuntime.runTask(
      'AppointmentSchedulingAgent',
      {
        patientId,
        doctorId,
        hospitalId,
        symptoms,
        preferredDay,
        urgency: urgency || 'routine',
      },
      { userId: req.user?.id }
    );

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
