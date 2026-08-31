import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { TelehealthSession } from '../types/shared';

const router = Router();

// POST /api/telehealth/session - Initialize or get room for appointment
router.post('/session', async (req: AuthenticatedRequest, res: Response) => {
  const { appointmentId, roomId: customRoomId } = req.body;

  let apt: any = null;

  if (appointmentId) {
    apt = store.appointments.find((a) => a.id === appointmentId);
  }

  // If no appointmentId provided, look up patient's or doctor's current active appointment
  if (!apt && req.user) {
    if (req.user.role === 'patient') {
      const userFullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim().toLowerCase();
      apt = store.appointments.find((a) => 
        (a.patientId === req.user!.id || (a.patientName && a.patientName.trim().toLowerCase() === userFullName)) &&
        (a.status === 'scheduled' || a.status === 'in_consultation' || a.status === 'checked_in')
      );
    } else if (req.user.role === 'doctor') {
      const doctorProfile = store.doctors.find((d) => d.userId === req.user!.id || d.id === req.user!.id);
      apt = store.appointments.find((a) => 
        (a.doctorId === req.user!.id || (doctorProfile && a.doctorId === doctorProfile.id)) &&
        (a.status === 'scheduled' || a.status === 'in_consultation' || a.status === 'checked_in')
      );
    }
  }

  if (!apt && customRoomId) {
    // Check if session already exists for this room
    const existingSession = store.telehealthSessions.find((s) => s.roomId === customRoomId);
    if (existingSession) {
      apt = store.appointments.find((a) => a.id === existingSession.appointmentId);
    }
  }

  const effectiveAppointmentId = apt?.id || appointmentId || 'apt-default-room';
  const assignedRoomId = apt?.telehealthRoomId || customRoomId || `consultation-${effectiveAppointmentId}`;

  let session = store.telehealthSessions.find((s) => s.appointmentId === effectiveAppointmentId || s.roomId === assignedRoomId);

  if (!session) {
    session = {
      id: uuidv4(),
      appointmentId: effectiveAppointmentId,
      roomId: assignedRoomId,
      doctorId: apt?.doctorId || '30000000-0000-0000-0000-000000000003',
      patientId: apt?.patientId || req.user?.id || '50000000-0000-0000-0000-000000000002',
      status: 'waiting',
      recordingConsentGranted: true,
      chatMessages: [],
    };
    store.telehealthSessions.push(session);
  }

  // If appointment exists, sync telehealthRoomId
  if (apt && !apt.telehealthRoomId) {
    apt.telehealthRoomId = assignedRoomId;
  }

  // If doctor joins, update session status to 'in_progress'
  if (req.user && req.user.role === 'doctor') {
    session.status = 'in_progress';
    if (apt) {
      apt.status = 'in_consultation';
    }
  }

  const doctor = store.doctors.find((d) => d.id === session!.doctorId || d.userId === session!.doctorId);
  const doctorUser = doctor ? store.users.find((u) => u.id === doctor.userId) : undefined;
  
  let patient = store.patients.find((p) => p.id === session!.patientId || p.userId === session!.patientId);
  if (!patient && apt?.patient) {
    patient = apt.patient;
  }

  res.json({
    session,
    doctor: doctor ? { ...doctor, user: doctorUser } : undefined,
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

  const doctor = store.doctors.find((d) => d.id === session.doctorId || d.userId === session.doctorId);
  const doctorUser = doctor ? store.users.find((u) => u.id === doctor.userId) : undefined;
  
  let patient = store.patients.find((p) => p.id === session.patientId || p.userId === session.patientId);
  const appointment = store.appointments.find((a) => a.id === session.appointmentId);
  if (!patient && appointment?.patient) {
    patient = appointment.patient;
  }

  res.json({
    session,
    doctor: doctor ? { ...doctor, user: doctorUser } : undefined,
    patient,
    appointment,
  });
});

// PUT /api/telehealth/session/:roomId/status - Update session status (e.g. start/end consultation)
router.put('/session/:roomId/status', async (req: AuthenticatedRequest, res: Response) => {
  const session = store.telehealthSessions.find((s) => s.roomId === req.params.roomId);
  if (!session) {
    return res.status(404).json({ error: 'Telehealth room not found' });
  }

  const { status } = req.body;
  if (status) {
    session.status = status === 'in_consultation' || status === 'in_progress' ? 'in_progress' : status === 'completed' || status === 'ended' ? 'ended' : 'waiting';
  }

  const appointment = store.appointments.find((a) => a.id === session.appointmentId);
  if (appointment && status) {
    appointment.status = status === 'completed' || status === 'ended' ? 'completed' : status === 'in_consultation' || status === 'in_progress' ? 'in_consultation' : appointment.status;
  }

  res.json({ session, appointment });
});

export default router;
