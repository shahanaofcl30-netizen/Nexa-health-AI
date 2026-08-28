import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { AgentRuntime } from '../agents/core/AgentRuntime';
import { ClinicalNote, ClinicalNoteStatus } from '../types/shared';
import { CLINICAL_DISCLAIMER } from '../agents/core/SafetyGuardrails';

const router = Router();

// GET /api/clinical-notes - List notes filtered by patient or doctor
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { patientId, doctorId } = req.query;

  let results = store.clinicalNotes;
  if (patientId) results = results.filter((n) => n.patientId === patientId);
  if (doctorId) results = results.filter((n) => n.doctorId === doctorId);

  res.json(results);
});

// GET /api/clinical-notes/:id - Single note details
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const note = store.clinicalNotes.find((n) => n.id === req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Clinical note not found' });
  }
  res.json(note);
});

// POST /api/clinical-notes/generate-soap - AI Clinical Notes Assistant
router.post('/generate-soap', async (req: AuthenticatedRequest, res: Response) => {
  const { dictationText, patientId, appointmentId, vitals } = req.body;

  if (!dictationText) {
    return res.status(400).json({ error: 'dictationText is required' });
  }

  try {
    const task = await AgentRuntime.runTask(
      'ClinicalDocumentationAgent',
      {
        patientId,
        appointmentId,
        dictationText,
        vitals,
      },
      { userId: req.user?.id }
    );

    res.json({
      soapNote: task.outputResult,
      task,
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clinical-notes - Create / Save Clinical Note
router.post('/', requireRole('doctor', 'admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const {
    patientId,
    doctorId,
    appointmentId,
    subjective,
    objective,
    assessment,
    plan,
    vitals,
    icd10Codes,
    aiGenerated,
    status = 'draft',
  } = req.body;

  if (!patientId || !doctorId || !subjective || !assessment) {
    return res.status(400).json({ error: 'patientId, doctorId, subjective, and assessment are required' });
  }

  const newNote: ClinicalNote = {
    id: uuidv4(),
    patientId,
    doctorId,
    appointmentId,
    subjective,
    objective: objective || '',
    assessment,
    plan: plan || '',
    vitals,
    icd10Codes: icd10Codes || [],
    aiGenerated: Boolean(aiGenerated),
    status: status as ClinicalNoteStatus,
    signedAt: status === 'signed' ? new Date().toISOString() : undefined,
    signedBy: status === 'signed' ? req.user?.id : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.clinicalNotes.unshift(newNote);

  // If signed, trigger autonomous Living Summary refresh in background
  if (status === 'signed') {
    AgentRuntime.runTask('PatientRecordSummaryAgent', { patientId }, { userId: req.user?.id }).catch(console.error);
  }

  res.status(201).json(newNote);
});

// PUT /api/clinical-notes/:id/sign - Electronically sign clinical note
router.put('/:id/sign', requireRole('doctor', 'admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const note = store.clinicalNotes.find((n) => n.id === req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Clinical note not found' });
  }

  note.status = 'signed';
  note.signedAt = new Date().toISOString();
  note.signedBy = req.user?.id;
  note.updatedAt = new Date().toISOString();

  // Trigger autonomous living summary update
  AgentRuntime.runTask('PatientRecordSummaryAgent', { patientId: note.patientId }, { userId: req.user?.id }).catch(console.error);

  res.json(note);
});

export default router;
