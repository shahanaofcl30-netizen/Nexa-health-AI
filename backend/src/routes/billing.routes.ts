import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { AgentRuntime } from '../agents/core/AgentRuntime';
import { Invoice, InvoiceStatus, InsuranceClaim, ClaimStatus } from '../types/shared';

const router = Router();

// GET /api/billing/invoices - List invoices
router.get('/invoices', (req: AuthenticatedRequest, res: Response) => {
  const { patientId, status } = req.query;

  let results = store.invoices;
  if (patientId) results = results.filter((i) => i.patientId === patientId);
  if (status) results = results.filter((i) => i.status === status);

  const populated = results.map((inv) => ({
    ...inv,
    patient: store.patients.find((p) => p.id === inv.patientId),
  }));

  res.json(populated);
});

// GET /api/billing/invoices/:id - Single invoice
router.get('/invoices/:id', (req: AuthenticatedRequest, res: Response) => {
  const inv = store.invoices.find((i) => i.id === req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json({
    ...inv,
    patient: store.patients.find((p) => p.id === inv.patientId),
    claim: store.claims.find((c: any) => c.invoiceId === inv.id),
  });
});

// POST /api/billing/invoices/generate-from-encounter - Billing Agent auto-generation
router.post('/invoices/generate-from-encounter', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId, appointmentId, encounterDetails } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  try {
    const task = await AgentRuntime.runTask(
      'BillingAgent',
      {
        patientId,
        appointmentId,
        encounterDetails,
      },
      { userId: req.user?.id }
    );

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/invoices - Create invoice manually
router.post('/invoices', requireRole('billing', 'admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const { patientId, appointmentId, items, subtotal, taxAmount = 0, insuranceDiscount = 0, dueDate } = req.body;

  if (!patientId || !items || !items.length) {
    return res.status(400).json({ error: 'patientId and items are required' });
  }

  const computedSubtotal = subtotal || items.reduce((acc: number, cur: any) => acc + (cur.unitPrice * (cur.quantity || 1)), 0);
  const patientPayable = Math.max(0, computedSubtotal + taxAmount - insuranceDiscount);

  const newInvoice: Invoice = {
    id: uuidv4(),
    patientId,
    appointmentId,
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(store.invoices.length + 1).padStart(4, '0')}`,
    items: items.map((item: any, idx: number) => ({
      id: uuidv4(),
      description: item.description,
      category: item.category || 'consultation',
      unitPrice: item.unitPrice,
      quantity: item.quantity || 1,
      totalPrice: item.unitPrice * (item.quantity || 1),
    })),
    subtotal: computedSubtotal,
    taxAmount,
    insuranceDiscount,
    patientPayable,
    status: 'issued',
    dueDate: dueDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  store.invoices.unshift(newInvoice);
  res.status(201).json(newInvoice);
});

// POST /api/billing/invoices/:id/pay - Record payment
router.post('/invoices/:id/pay', async (req: AuthenticatedRequest, res: Response) => {
  const inv = store.invoices.find((i) => i.id === req.params.id);
  if (!inv) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const { paymentMethod = 'credit_card', transactionReference } = req.body;

  inv.status = 'paid';
  inv.paidAt = new Date().toISOString();
  inv.paymentMethod = paymentMethod;
  inv.transactionReference = transactionReference || `TX-${uuidv4().slice(0, 8).toUpperCase()}`;

  res.json(inv);
});

// GET /api/billing/claims - List insurance claims
router.get('/claims', (_req: AuthenticatedRequest, res: Response) => {
  const populated = store.claims.map((c: any) => ({
    ...c,
    patient: store.patients.find((p) => p.id === c.patientId),
    invoice: store.invoices.find((i) => i.id === c.invoiceId),
  }));
  res.json(populated);
});

// POST /api/billing/claims - Submit claim
router.post('/claims', async (req: AuthenticatedRequest, res: Response) => {
  const { invoiceId, patientId, insuranceProvider, policyNumber, claimedAmount } = req.body;

  const newClaim: InsuranceClaim = {
    id: uuidv4(),
    invoiceId,
    patientId,
    insuranceProvider,
    policyNumber,
    claimedAmount,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
  };

  store.claims.unshift(newClaim);
  res.status(201).json(newClaim);
});

// PUT /api/billing/claims/:id - Update claim status
router.put('/claims/:id', requireRole('billing', 'admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const claim = store.claims.find((c: any) => c.id === req.params.id);
  if (!claim) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  const { status, approvedAmount, rejectionReason } = req.body;
  claim.status = status as ClaimStatus;
  claim.approvedAmount = approvedAmount;
  claim.rejectionReason = rejectionReason;
  if (status === 'settled' || status === 'approved') {
    claim.settledAt = new Date().toISOString();
  }

  res.json(claim);
});

export default router;
