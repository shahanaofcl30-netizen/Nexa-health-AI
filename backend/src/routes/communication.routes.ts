import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { AgentRuntime } from '../agents/core/AgentRuntime';

const router = Router();

// GET /api/communications/notifications - List notifications
router.get('/notifications', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const userNotifs = store.notifications.filter((n: any) => !userId || n.userId === userId || n.userId === 'global');
  res.json(userNotifs);
});

// PUT /api/communications/notifications/:id/read - Mark read
router.put('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  const notif = store.notifications.find((n: any) => n.id === req.params.id);
  if (notif) {
    notif.isRead = true;
  }
  res.json({ success: true });
});

// GET /api/communications/alerts - Real-time Clinical Alerts
router.get('/alerts', (_req: AuthenticatedRequest, res: Response) => {
  const populated = store.clinicalAlerts.map((a) => ({
    ...a,
    patient: store.patients.find((p) => p.id === a.patientId),
  }));
  res.json(populated);
});

// PUT /api/communications/alerts/:id/acknowledge - Clinician acknowledge alert
router.put('/alerts/:id/acknowledge', async (req: AuthenticatedRequest, res: Response) => {
  const alert = store.clinicalAlerts.find((a) => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.isAcknowledged = true;
  alert.acknowledgedBy = req.user?.id;
  alert.acknowledgedAt = new Date().toISOString();
  res.json(alert);
});

// POST /api/communications/agent-followup - Patient Follow-up Agent
router.post('/agent-followup', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, clinicalPlan, encounterDate } = req.body;

  try {
    const task = await AgentRuntime.runTask(
      'PatientFollowUpAgent',
      { patientId, clinicalPlan, encounterDate },
      { userId: req.user?.id }
    );
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/communications/agent-broadcast - Healthcare Communication Agent
router.post('/agent-broadcast', async (req: AuthenticatedRequest, res: Response) => {
  const { recipientType, topic, details, channel } = req.body;

  try {
    const task = await AgentRuntime.runTask(
      'HealthcareCommunicationAgent',
      { recipientType, topic, details, channel },
      { userId: req.user?.id }
    );
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/communications/reminders - Patient medication reminders
router.get('/reminders', (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.query;
  let list = store.medicationReminders;
  if (patientId) list = list.filter((r) => r.patientId === patientId);
  res.json(list);
});

// PUT /api/communications/reminders/:id/status - Update reminder status (e.g. 'taken')
router.put('/reminders/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const reminder = store.medicationReminders.find((r) => r.id === req.params.id);
  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found' });
  }

  reminder.status = req.body.status || 'taken';
  if (reminder.status === 'taken') {
    reminder.takenAt = new Date().toISOString();
  }
  res.json(reminder);
});

export default router;
