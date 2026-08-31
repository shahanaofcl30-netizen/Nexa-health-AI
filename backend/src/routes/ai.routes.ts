import { Router, Response } from 'express';
import { store } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { AgentRuntime } from '../agents/core/AgentRuntime';
import { LLMProvider } from '../agents/core/LLMProvider';
import { AgentAuditLogger } from '../agents/core/AgentAuditLogger';
import { CLINICAL_DISCLAIMER } from '../agents/core/SafetyGuardrails';

const router = Router();

// GET /api/ai/agents - List all registered agents in the shared framework
router.get('/agents', (_req: AuthenticatedRequest, res: Response) => {
  res.json(AgentRuntime.getAllAgents());
});

// GET /api/ai/tasks - List agent task executions
router.get('/tasks', (_req: AuthenticatedRequest, res: Response) => {
  res.json(store.agentTasks);
});

// POST /api/ai/tasks/:id/approve - Clinician approval for human-in-the-loop agent workflows
router.post('/tasks/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = AgentRuntime.approveTask(req.params.id as string, req.user?.id || 'attending-clinician');
    res.json(task);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/ai/audit-logs - Query tamper-evident agent audit trail
router.get('/audit-logs', (_req: AuthenticatedRequest, res: Response) => {
  res.json(AgentAuditLogger.getLogs(100));
});

// POST /api/ai/medai-chat - MedAI Healthcare Conversational Assistant (Q&A with patient record context)
router.post('/medai-chat', async (req: AuthenticatedRequest, res: Response) => {
  const { query, patientId, conversationHistory = [] } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Query message is required' });
  }

  let patientContext = '';
  if (patientId) {
    const patient = store.patients.find((p) => p.id === patientId || p.userId === patientId);
    if (patient) {
      const vitals = store.vitals.filter((v) => v.patientId === patient.id).slice(0, 3);
      const notes = store.clinicalNotes.filter((n) => n.patientId === patient.id).slice(0, 2);
      const prescriptions = store.prescriptions.filter((p) => p.patientId === patient.id).slice(0, 3);

      patientContext = `Patient Name: ${patient.firstName} ${patient.lastName}, MRN: ${patient.mrn}, Age: ${patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'N/A'}, Allergies: [${patient.allergies?.join(', ') || 'None'}], Chronic Conditions: [${patient.chronicConditions?.join(', ') || 'None'}]. Recent Vitals: ${JSON.stringify(vitals)}. Active Prescriptions: ${JSON.stringify(prescriptions)}. Clinical Notes: ${notes.map((n) => n.assessment).join('; ')}`;
    }
  }

  const userRole = req.user?.role || 'clinician';
  const userName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : req.user?.email ? req.user.email.split('@')[0] : 'Healthcare User';

  const systemPrompt = `You are MedAI, an advanced medical AI assistant for Nexa Health AI.
Current User Context: ${userName} (Role: ${userRole}).
You provide evidence-based clinical explanations, pharmacotherapy guidance, laboratory interpretation, and synthesized patient record insights.
Maintain a compassionate, precise, professional, and clear tone. Format key findings with bullet points where appropriate.
CRITICAL SAFETY RULE: You are an assistive intelligence tool. Always remind the user that AI guidance does not replace direct clinical evaluation or emergency services.
${patientContext ? `\nCurrent Active Patient EHR Record:\n${patientContext}` : ''}`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-8).map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    })),
    { role: 'user', content: query.trim() },
  ];

  try {
    const completion = await LLMProvider.complete({
      messages,
      temperature: 0.3,
    });

    const responseText = completion.content?.trim() || 'I processed your query, but could not generate a response. Please rephrase or specify a clinical focus area.';

    await AgentAuditLogger.logAction({
      agentName: 'MedAI_Assistant',
      action: 'MEDAI_CONVERSATION_QUERY',
      entityType: 'PatientChat',
      entityId: patientId,
      userId: req.user?.id,
      inputSummary: query.slice(0, 150),
      outputSummary: responseText.slice(0, 150),
      safetyCheckPassed: true,
    });

    res.json({
      response: responseText,
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
    });
  } catch (err: any) {
    console.error('[MedAI Chat Route Error]:', err);
    res.status(500).json({ error: err.message || 'An error occurred while generating MedAI response.' });
  }
});

// POST /api/ai/patient-summary - AI Medical Record Summary on-demand
router.post('/patient-summary', async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  try {
    const task = await AgentRuntime.runTask(
      'PatientRecordSummaryAgent',
      { patientId },
      { userId: req.user?.id }
    );
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
