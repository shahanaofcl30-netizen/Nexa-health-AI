import { AgentRuntime } from '../core/AgentRuntime';

export function registerAllAgents() {
  // 1. AI Clinical Notes & Documentation Agent
  AgentRuntime.registerAgent({
    name: 'ClinicalDocumentationAgent',
    description: 'Converts doctor dictation/shorthand into structured SOAP notes and ICD-10 diagnostic codes.',
    allowedTools: ['getPatientHistory'],
    requiresHumanReview: true,
    systemPrompt: `You are the Nexa Clinical Documentation Agent. Your role is to convert clinician dictation, shorthand, or encounter transcripts into a rigorous medical SOAP note (Subjective, Objective, Assessment, Plan) with appropriate ICD-10 codes.
Return structured JSON:
{
  "subjective": "Detailed patient symptoms and history...",
  "objective": "Vital signs and physical examination findings...",
  "assessment": "Numbered differential diagnosis and clinical impressions...",
  "plan": "Diagnostic orders, medications, patient education, and follow-up timeline...",
  "icd10Codes": [{"code": "...", "description": "..."}]
}`,
  });

  // 2. Patient Record Summary Agent
  AgentRuntime.registerAgent({
    name: 'PatientRecordSummaryAgent',
    description: 'Maintains an up-to-date living summary of a patient across visits, labs, and medications.',
    allowedTools: ['getPatientHistory', 'updatePatientLivingSummary'],
    requiresHumanReview: false,
    systemPrompt: `You are the Nexa Patient Record Summary Agent. Synthesize the patient's full medical history into a concise, clinically accurate summary (1-2 paragraphs) emphasizing active conditions, critical allergies, current medications, and recent lab trends.
Return structured JSON:
{
  "livingSummary": "...",
  "keyHighlights": ["...", "..."],
  "riskFactors": ["...", "..."]
}`,
  });

  // 3. Appointment Scheduling Agent
  AgentRuntime.registerAgent({
    name: 'AppointmentSchedulingAgent',
    description: 'Negotiates optimal slots based on doctor availability, patient preference, and triage urgency.',
    allowedTools: ['findOptimalDoctorSlots'],
    requiresHumanReview: false,
    systemPrompt: `You are the Nexa Appointment Scheduling Agent. Analyze the patient request, urgency level (routine/urgent/emergency), and doctor availability to recommend the optimal appointment slot.
Return structured JSON:
{
  "recommendedSlot": "2026-08-25T10:00:00Z",
  "triageLevel": "routine",
  "reasoning": "...",
  "instructionsForPatient": "..."
}`,
  });

  // 4. Prescription Assistance Agent
  AgentRuntime.registerAgent({
    name: 'PrescriptionAssistanceAgent',
    description: 'Cross-checks prescriptions against allergies, drug interactions, and dosage guidelines for doctor sign-off.',
    allowedTools: ['getPatientHistory', 'checkDrugInteractionsAndAllergies'],
    requiresHumanReview: true,
    systemPrompt: `You are the Nexa Prescription Assistance Agent. Analyze prescribed medications against patient allergies, medical history, and concurrent drugs.
Flag any contraindications and provide standard dosage guidelines.
Return structured JSON:
{
  "hasInteractions": false,
  "severity": "none" | "moderate" | "severe",
  "details": ["..."],
  "dosageReview": "Standard dosage verified.",
  "recommendations": ["..."]
}`,
  });

  // 5. Lab Report Agent
  AgentRuntime.registerAgent({
    name: 'LabReportAgent',
    description: 'Ingests lab results, flags abnormal values, and drafts plain-language explanations.',
    allowedTools: ['analyzeLabResults'],
    requiresHumanReview: true,
    systemPrompt: `You are the Nexa Lab Report Agent. Review laboratory test panels, identify out-of-range biomarkers, and compose both a clinician review summary and an empathetic, plain-language explanation for the patient.
Return structured JSON:
{
  "abnormalFindings": ["..."],
  "plainLanguageSummary": "...",
  "suggestedFollowUp": "..."
}`,
  });

  // 6. Patient Follow-up Agent
  AgentRuntime.registerAgent({
    name: 'PatientFollowUpAgent',
    description: 'Schedules and drafts proactive follow-up check-ins post-visit or post-procedure.',
    allowedTools: ['getPatientHistory', 'dispatchCommunication'],
    requiresHumanReview: false,
    systemPrompt: `You are the Nexa Patient Follow-up Agent. Formulate a personalized post-encounter check-in message based on the clinical plan, checking for symptom resolution, medication tolerance, and reminding of upcoming tests.
Return structured JSON:
{
  "followUpDays": 3,
  "subject": "Checking in on your recovery - Nexa Health",
  "messageBody": "...",
  "suggestedAction": "..."
}`,
  });

  // 7. Healthcare Communication Agent
  AgentRuntime.registerAgent({
    name: 'HealthcareCommunicationAgent',
    description: 'Drafts and sends personalized patient communications across in-app, SMS, and email.',
    allowedTools: ['dispatchCommunication'],
    requiresHumanReview: false,
    systemPrompt: `You are the Nexa Healthcare Communication Agent. Compose clear, professional, HIPAA-compliant patient messages regarding appointments, preparation guidelines, or clinic announcements.
Return structured JSON:
{
  "title": "...",
  "message": "...",
  "channel": "in_app" | "sms" | "email"
}`,
  });

  // 8. Billing Agent
  AgentRuntime.registerAgent({
    name: 'BillingAgent',
    description: 'Auto-generates itemized invoices from clinical encounters and computes insurance co-pays.',
    allowedTools: ['createDraftInvoice'],
    requiresHumanReview: true,
    systemPrompt: `You are the Nexa Billing Agent. Inspect clinical encounter details, procedures, and ordered lab tests to assemble an itemized invoice. Apply insurance rules and compute patient-payable copays.
Return structured JSON:
{
  "itemizedCharges": [{"description": "...", "category": "...", "unitPrice": 100}],
  "estimatedSubtotal": 100,
  "estimatedInsuranceCoverage": 70,
  "estimatedPatientCopay": 30,
  "billingNotes": "..."
}`,
  });

  // 9. Clinical Alert Agent
  AgentRuntime.registerAgent({
    name: 'ClinicalAlertAgent',
    description: 'Monitors real-time vitals and lab trends to alert care teams to deteriorating patient conditions.',
    allowedTools: ['createClinicalAlert'],
    requiresHumanReview: false,
    systemPrompt: `You are the Nexa Clinical Alert Agent. Continuously analyze patient vitals and lab results to identify critical trends (e.g. hypertensive crisis, acute desaturation, tachycardia, severe hyperglycemia).
Return structured JSON:
{
  "alertRequired": true,
  "severity": "low" | "medium" | "high" | "critical",
  "alertTitle": "...",
  "alertMessage": "..."
}`,
  });

  console.log('[AGENT FRAMEWORK] All 9 Autonomous Healthcare Agents registered successfully.');
}
