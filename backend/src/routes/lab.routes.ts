import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { AgentRuntime } from '../agents/core/AgentRuntime';
import { LabOrder, LabOrderStatus } from '../types/shared';
import { firebaseAdminDb } from '../config/firebase';
import { CLINICAL_DISCLAIMER } from '../agents/core/SafetyGuardrails';

const router = Router();

// GET /api/labs - List lab orders with filters
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, doctorId, status } = req.query;

  const labMap = new Map<string, LabOrder>();

  store.labOrders.forEach((l) => {
    labMap.set(l.id, l);
  });

  try {
    if (firebaseAdminDb) {
      const snap = await firebaseAdminDb.collection('labOrders').get();
      snap.docs.forEach((doc) => {
        const data = doc.data() as LabOrder;
        if (!labMap.has(data.id || doc.id)) {
          labMap.set(data.id || doc.id, { ...data, id: data.id || doc.id });
        }
      });
    }
  } catch (e) {}

  let results = Array.from(labMap.values());

  if (patientId) results = results.filter((l) => l.patientId === patientId);
  if (doctorId) results = results.filter((l) => l.doctorId === doctorId);
  if (status && status !== 'all') results = results.filter((l) => l.status === status);

  const populated = results.map((lab) => {
    let patient = store.patients.find((p) => p.id === lab.patientId || p.userId === lab.patientId);
    if (!patient && lab.appointmentId) {
      const apt = store.appointments.find((a) => a.id === lab.appointmentId);
      if (apt?.patient) patient = apt.patient;
    }
    const doctor = store.doctors.find((d) => d.id === lab.doctorId);
    return {
      ...lab,
      patient,
      doctor,
    };
  });

  res.json(populated);
});

// GET /api/labs/:id - Single lab order
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const lab = store.labOrders.find((l) => l.id === req.params.id);
  if (!lab) {
    return res.status(404).json({ error: 'Lab order not found' });
  }

  const patient = store.patients.find((p) => p.id === lab.patientId);
  const doctor = store.doctors.find((d) => d.id === lab.doctorId);

  res.json({
    ...lab,
    patient,
    doctor,
  });
});

// POST /api/labs - Create new lab order
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, doctorId, appointmentId, tests, clinicalNotes } = req.body;

  if (!patientId || !doctorId || !tests || !tests.length) {
    return res.status(400).json({ error: 'patientId, doctorId, and tests array are required' });
  }

  const newLabOrder: LabOrder = {
    id: uuidv4(),
    patientId,
    doctorId,
    appointmentId,
    status: 'ordered',
    clinicalNotes,
    tests: tests.map((t: any) => ({
      id: uuidv4(),
      testName: t.testName,
      testCategory: t.testCategory || 'General Pathology',
      resultValue: t.resultValue || undefined,
      unit: t.unit || '',
      referenceRange: t.referenceRange || '',
      isAbnormal: Boolean(t.isAbnormal),
      status: 'pending',
    })),
    orderedAt: new Date().toISOString(),
  };

  await firebaseAdminDb.collection('labOrders').doc(newLabOrder.id).set(newLabOrder);
  store.labOrders.unshift(newLabOrder);
  res.status(201).json(newLabOrder);
});

// PUT /api/labs/:id/results - Enter test results and trigger Lab Report Agent
router.put('/:id/results', async (req: AuthenticatedRequest, res: Response) => {
  const lab = store.labOrders.find((l) => l.id === req.params.id);
  if (!lab) {
    return res.status(404).json({ error: 'Lab order not found' });
  }

  const { tests, status = 'completed' } = req.body;
  if (tests && Array.isArray(tests)) {
    lab.tests = tests.map((t: any) => ({
      ...t,
      status: 'completed',
    }));
  }

  lab.status = status as LabOrderStatus;
  lab.completedAt = new Date().toISOString();

  try {
    if (firebaseAdminDb) {
      await firebaseAdminDb.collection('labOrders').doc(lab.id).set(lab);
    }
  } catch (e) {}

  // Trigger autonomous LabReportAgent analysis
  try {
    const task = await AgentRuntime.runTask(
      'LabReportAgent',
      {
        patientId: lab.patientId,
        labOrderId: lab.id,
        tests: lab.tests,
      },
      { userId: req.user?.id }
    );

    lab.aiAnalysis = {
      abnormalFindings: task.outputResult?.abnormalFindings || [],
      plainLanguageSummary: task.outputResult?.plainLanguageSummary || 'Lab results within standard range.',
      suggestedFollowUp: task.outputResult?.suggestedFollowUp || 'Routine follow-up.',
      generatedAt: new Date().toISOString(),
    };

    // If abnormal findings, raise a clinical alert
    if (lab.aiAnalysis.abnormalFindings.length > 0) {
      store.clinicalAlerts.unshift({
        id: uuidv4(),
        patientId: lab.patientId,
        severity: 'high',
        source: 'lab_result',
        title: 'Abnormal Laboratory Result',
        message: `Lab order flagged ${lab.aiAnalysis.abnormalFindings.length} abnormal values: ${lab.aiAnalysis.abnormalFindings.join('; ')}`,
        isAcknowledged: false,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({
      labOrder: lab,
      agentTask: task,
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
    });
  } catch (err: any) {
    res.json({ labOrder: lab, error: err.message });
  }
});

// PUT /api/labs/:id/status - Update lab order status
router.put('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const lab = store.labOrders.find((l) => l.id === req.params.id);
  if (!lab) {
    return res.status(404).json({ error: 'Lab order not found' });
  }

  lab.status = req.body.status as LabOrderStatus;
  res.json(lab);
});

export default router;
