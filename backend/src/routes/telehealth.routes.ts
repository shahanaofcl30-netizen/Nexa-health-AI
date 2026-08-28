import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { TelehealthSession } from '../types/shared';

const router = Router();

// POST /api/telehealth/session - Initialize or get room for appointment
router.post('/session', async (req: AuthenticatedRequest, res: Response) => {
  const { appointmentId } = req.body;

  if (!appointmentId) {
    return res.status(400).json({ error: 'appointmentId is required' });
  }

  const apt = store.appointments.find((a) => a.id === appointmentId);
  if (!apt) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  let session = store.telehealthSessions.find((s) => s.appointmentId === appointmentId);

  if (!session) {
    session = {
      id: uuidv4(),
      appointmentId,
      roomId: apt.telehealthRoomId || `room-${uuidv4().slice(0, 8)}`,
      doctorId: apt.doctorId,
      patientId: apt.patientId,
      status: 'waiting',
      recordingConsentGranted: false,
      chatMessages: [],
    };
    store.telehealthSessions.push(session);
  }

  const doctor = store.doctors.find((d) => d.id === session!.doctorId);
  const patient = store.patients.find((p) => p.id === session!.patientId);

  res.json({
    session,
    doctor,
    patient,
    appointment: apt,
  });
});

// GET /api/telehealth/session/:roomId - Get session status
router.get('/session/:roomId', (req: AuthenticatedRequest, res: Response) => {
  const session = store.telehealthSessions.find((s) => s.roomId === req.params.roomId);
  if (!session) {
    return res.status(404).json({ error: 'Telehealth room not found' });
  }

  const doctor = store.doctors.find((d) => d.id === session.doctorId);
  const patient = store.patients.find((p) => p.id === session.patientId);
  const appointment = store.appointments.find((a) => a.id === session.appointmentId);

  res.json({
    session,
    doctor,
    patient,
    appointment,
  });
});

// POST /api/telehealth/session/:roomId/consent - Update recording consent
router.post('/session/:roomId/consent', async (req: AuthenticatedRequest, res: Response) => {
  const session = store.telehealthSessions.find((s) => s.roomId === req.params.roomId);
  if (!session) {
    return res.status(404).json({ error: 'Telehealth room not found' });
  }

  session.recordingConsentGranted = Boolean(req.body.consent);
  res.json({ success: true, recordingConsentGranted: session.recordingConsentGranted });
});

// POST /api/telehealth/session/:roomId/chat - Send in-call chat
router.post('/session/:roomId/chat', async (req: AuthenticatedRequest, res: Response) => {
  const session = store.telehealthSessions.find((s) => s.roomId === req.params.roomId);
  if (!session) {
    return res.status(404).json({ error: 'Telehealth room not found' });
  }

  const { sender, text } = req.body;
  const message = {
    sender: sender || req.user?.firstName || 'User',
    text,
    timestamp: new Date().toISOString(),
  };

  session.chatMessages = session.chatMessages || [];
  session.chatMessages.push(message);

  res.status(201).json(message);
});

export default router;
