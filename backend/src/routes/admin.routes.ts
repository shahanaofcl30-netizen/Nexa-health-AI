import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { firebaseAdminDb } from '../config/firebase';

const router = Router();

// GET /api/admin/metrics - Comprehensive KPI analytics
router.get('/metrics', (_req: AuthenticatedRequest, res: Response) => {
  const totalPatients = store.patients.length;
  const totalAppointments = store.appointments.length;
  const activeAlerts = store.clinicalAlerts.filter((a) => !a.isAcknowledged).length;
  const totalDoctors = store.doctors.length;
  const totalInvoices = store.invoices.length;

  const totalRevenue = store.invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.patientPayable + i.insuranceDiscount, 0);

  const pendingRevenue = store.invoices
    .filter((i) => i.status !== 'paid')
    .reduce((sum, i) => sum + i.patientPayable, 0);

  const agentTasksRun = store.agentTasks.length;
  const agentTasksPendingReview = store.agentTasks.filter((t) => t.status === 'requires_human_review').length;

  res.json({
    totalPatients,
    totalAppointments,
    totalDoctors,
    activeAlerts,
    totalInvoices,
    totalRevenue,
    pendingRevenue,
    agentTasksRun,
    agentTasksPendingReview,
  });
});

// GET /api/admin/revenue-chart - Time-series revenue data for Recharts
router.get('/revenue-chart', (_req: AuthenticatedRequest, res: Response) => {
  const data = [
    { month: 'Jan', revenue: 42000, consultations: 310, labTests: 180 },
    { month: 'Feb', revenue: 48500, consultations: 350, labTests: 220 },
    { month: 'Mar', revenue: 53200, consultations: 410, labTests: 290 },
    { month: 'Apr', revenue: 51800, consultations: 390, labTests: 260 },
    { month: 'May', revenue: 59400, consultations: 460, labTests: 340 },
    { month: 'Jun', revenue: 64200, consultations: 520, labTests: 390 },
    { month: 'Jul', revenue: 68900, consultations: 560, labTests: 430 },
    { month: 'Aug', revenue: 72400, consultations: 590, labTests: 470 },
  ];
  res.json(data);
});

// GET /api/admin/department-volume - Distribution by department
router.get('/department-volume', (_req: AuthenticatedRequest, res: Response) => {
  const data = [
    { name: 'Cardiology', value: 35, color: '#3B82F6' },
    { name: 'Internal Medicine', value: 28, color: '#10B981' },
    { name: 'Neurology', value: 16, color: '#8B5CF6' },
    { name: 'Pediatrics', value: 12, color: '#F59E0B' },
    { name: 'Orthopedics', value: 9, color: '#EC4899' },
  ];
  res.json(data);
});

// GET /api/admin/documents - Digital Medical Records Vault
router.get('/documents', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.query;
  let docs = [...store.documents];

  try {
    const treatmentsSnapshot = await firebaseAdminDb.collection('treatments').get();
    treatmentsSnapshot.forEach((doc: any) => {
      const t = doc.data();
      const docId = `doc-${t.id}`;
      if (!docs.find((d: any) => d.id === docId)) {
        docs.push({
          id: docId,
          patientId: t.patientId,
          title: `Consultation: ${t.diagnosis}`,
          category: 'clinical',
          description: `Official Medical Record for consultation regarding ${t.diagnosis}. Notes: ${t.clinicalNotes || 'No additional notes'}`,
          fileUrl: '/documents/clinical_consultation_record.pdf',
          version: 1,
          createdAt: t.createdAt,
        });
      }
    });
  } catch (err) {
    console.error('Failed to fetch treatments for documents:', err);
  }

  if (patientId) docs = docs.filter((d: any) => d.patientId === patientId);

  const populated = docs.map((d: any) => ({
    ...d,
    patient: store.patients.find((p) => p.id === d.patientId),
  })).filter((d: any) => d.patient?.firstName !== 'Emily' && d.patient?.lastName !== 'Davis' && d.patientId !== '50000000-0000-0000-0000-000000000001');

  res.json(populated);
});

// POST /api/admin/documents - Save document into vault
router.post('/documents', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, title, category, description, fileUrl } = req.body;

  if (!patientId || !title || !category) {
    return res.status(400).json({ error: 'patientId, title, and category are required' });
  }

  const newDoc = {
    id: uuidv4(),
    patientId,
    title,
    category,
    description: description || '',
    fileUrl: fileUrl || '/documents/sample_record.pdf',
    version: 1,
    createdAt: new Date().toISOString(),
  };

  store.documents.unshift(newDoc);
  res.status(201).json(newDoc);
});

export default router;
