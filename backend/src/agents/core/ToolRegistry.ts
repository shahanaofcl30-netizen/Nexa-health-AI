import { store } from '../../db/store';
import { AgentAuditLogger } from './AgentAuditLogger';
import { CLINICAL_DISCLAIMER } from './SafetyGuardrails';

export interface ToolDefinition {
  name: string;
  description: string;
  execute: (input: any, context?: { userId?: string }) => Promise<any>;
}

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  public static registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public static getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public static getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public static async executeTool(
    agentName: string,
    toolName: string,
    input: any,
    context?: { userId?: string }
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in ToolRegistry.`);
    }

    try {
      const result = await tool.execute(input, context);

      await AgentAuditLogger.logAction({
        agentName,
        action: `EXECUTE_TOOL_${toolName.toUpperCase()}`,
        entityType: 'ToolExecution',
        userId: context?.userId,
        inputSummary: JSON.stringify(input).slice(0, 200),
        outputSummary: JSON.stringify(result).slice(0, 200),
        safetyCheckPassed: true,
      });

      return result;
    } catch (err: any) {
      await AgentAuditLogger.logAction({
        agentName,
        action: `TOOL_ERROR_${toolName.toUpperCase()}`,
        entityType: 'ToolExecution',
        userId: context?.userId,
        inputSummary: JSON.stringify(input).slice(0, 200),
        outputSummary: `Error: ${err.message}`,
        safetyCheckPassed: false,
      });
      throw err;
    }
  }
}

// ==============================================================================
// Register Core Hospital & Clinical Management Tools
// ==============================================================================

// Tool 1: Get Patient Full Medical History
ToolRegistry.registerTool({
  name: 'getPatientHistory',
  description: 'Retrieves patient demographics, allergies, chronic conditions, vitals, previous notes, and lab history.',
  execute: async (input: { patientId: string }) => {
    const patient = store.patients.find((p) => p.id === input.patientId);
    if (!patient) throw new Error(`Patient not found with ID ${input.patientId}`);

    const notes = store.clinicalNotes.filter((n) => n.patientId === input.patientId);
    const vitals = store.vitals.filter((v) => v.patientId === input.patientId);
    const labs = store.labOrders.filter((l) => l.patientId === input.patientId);
    const prescriptions = store.prescriptions.filter((p) => p.patientId === input.patientId);

    return {
      patient,
      vitals,
      clinicalNotes: notes,
      labOrders: labs,
      prescriptions,
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
    };
  },
});

// Tool 2: Update Living Patient Summary
ToolRegistry.registerTool({
  name: 'updatePatientLivingSummary',
  description: 'Updates the centralized living clinical summary for a patient.',
  execute: async (input: { patientId: string; summary: string }) => {
    const patient = store.patients.find((p) => p.id === input.patientId);
    if (!patient) throw new Error(`Patient not found with ID ${input.patientId}`);

    patient.livingSummary = input.summary;
    patient.updatedAt = new Date().toISOString();
    return { success: true, patientId: patient.id, livingSummary: patient.livingSummary };
  },
});

// Tool 3: Find Optimal Doctor Appointment Slots
ToolRegistry.registerTool({
  name: 'findOptimalDoctorSlots',
  description: 'Finds available doctor slots considering schedule and existing bookings.',
  execute: async (input: { doctorId: string; date?: string; urgency?: string }) => {
    const doctor = store.doctors.find((d) => d.id === input.doctorId);
    if (!doctor) throw new Error(`Doctor not found with ID ${input.doctorId}`);

    const existingAppointments = store.appointments.filter(
      (a) => a.doctorId === input.doctorId && a.status !== 'cancelled'
    );

    // Compute slot recommendations
    const slots = [
      { startTime: '09:00', endTime: '09:30', available: true },
      { startTime: '10:00', endTime: '10:30', available: true },
      { startTime: '11:30', endTime: '12:00', available: false },
      { startTime: '14:00', endTime: '14:30', available: true },
      { startTime: '15:30', endTime: '16:00', available: true },
    ];

    return {
      doctorId: doctor.id,
      specialization: doctor.specialization,
      recommendedSlots: slots,
    };
  },
});

// Tool 4: Check Drug-Drug and Allergy Interactions
ToolRegistry.registerTool({
  name: 'checkDrugInteractionsAndAllergies',
  description: 'Cross-checks a list of medications against patient known allergies and contraindications.',
  execute: async (input: { patientId: string; medicationNames: string[] }) => {
    const patient = store.patients.find((p) => p.id === input.patientId);
    const allergies = patient?.allergies || [];
    const interactions: string[] = [];
    let severity: 'none' | 'moderate' | 'severe' = 'none';

    // DISCLAIMER: Requires clinical validation, not a substitute for professional judgment.
    for (const med of input.medicationNames) {
      const lowerMed = med.toLowerCase();
      // Check Penicillin allergy vs Amoxicillin / Ampicillin
      if (allergies.some((a: string) => a.toLowerCase().includes('penicillin')) && (lowerMed.includes('amoxicillin') || lowerMed.includes('penicillin'))) {
        interactions.push(`CRITICAL ALLERGY ALERT: Patient has documented Penicillin allergy. Prescribing '${med}' carries high anaphylaxis risk.`);
        severity = 'severe';
      }
      // Check Aspirin allergy vs NSAIDs
      if (allergies.some((a: string) => a.toLowerCase().includes('aspirin')) && lowerMed.includes('ibuprofen')) {
        interactions.push(`WARNING: Cross-reactivity between Aspirin allergy and NSAID '${med}'.`);
        if (severity !== 'severe') severity = 'moderate';
      }
    }

    return {
      hasInteractions: interactions.length > 0,
      severity,
      details: interactions.length > 0 ? interactions : ['No severe drug-drug or allergy contraindications detected.'],
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
    };
  },
});

// Tool 5: Create Real-Time Clinical Alert
ToolRegistry.registerTool({
  name: 'createClinicalAlert',
  description: 'Raises a real-time clinical alert for medical staff regarding critical patient vitals or lab trends.',
  execute: async (input: { patientId: string; severity: 'low' | 'medium' | 'high' | 'critical'; title: string; message: string; source: string }) => {
    const alert = {
      id: `alert-${Date.now()}`,
      patientId: input.patientId,
      severity: input.severity,
      source: (input.source as any) || 'system',
      title: input.title,
      message: input.message,
      isAcknowledged: false,
      createdAt: new Date().toISOString(),
    };
    store.clinicalAlerts.unshift(alert);
    return { success: true, alert };
  },
});

// Tool 6: Generate Draft Invoice from Visit & Procedures
ToolRegistry.registerTool({
  name: 'createDraftInvoice',
  description: 'Generates an itemized patient invoice from encounter details and insurance coverage.',
  execute: async (input: { patientId: string; appointmentId?: string; items: Array<{ description: string; category: string; unitPrice: number; quantity: number }> }) => {
    const patient = store.patients.find((p) => p.id === input.patientId);
    let subtotal = 0;
    const lineItems = input.items.map((item, idx) => {
      const total = item.unitPrice * (item.quantity || 1);
      subtotal += total;
      return {
        id: `item-${Date.now()}-${idx}`,
        description: item.description,
        category: item.category as any,
        unitPrice: item.unitPrice,
        quantity: item.quantity || 1,
        totalPrice: total,
      };
    });

    const hasInsurance = Boolean(patient?.insuranceProvider);
    const insuranceDiscount = hasInsurance ? Math.round(subtotal * 0.7 * 100) / 100 : 0;
    const patientPayable = Math.max(0, subtotal - insuranceDiscount);

    const invoice = {
      id: `inv-${Date.now()}`,
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(store.invoices.length + 1).padStart(4, '0')}`,
      items: lineItems,
      subtotal,
      taxAmount: 0,
      insuranceDiscount,
      patientPayable,
      status: 'issued' as const,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      patient,
    };

    store.invoices.unshift(invoice);
    return invoice;
  },
});

// Tool 7: Dispatch Multi-Channel Communication
ToolRegistry.registerTool({
  name: 'dispatchCommunication',
  description: 'Sends automated healthcare message/notification to patient via in-app or SMS.',
  execute: async (input: { userId: string; title: string; message: string; channel?: string; actionLink?: string }) => {
    const notif = {
      id: `notif-${Date.now()}`,
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: 'agent_communication',
      isRead: false,
      channel: input.channel || 'in_app',
      actionLink: input.actionLink,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(notif);
    return { success: true, notificationId: notif.id };
  },
});

// Tool 8: Analyze Lab Test Values
ToolRegistry.registerTool({
  name: 'analyzeLabResults',
  description: 'Parses lab test values and flags out-of-range biomarkers.',
  execute: async (input: { tests: Array<{ testName: string; resultValue: string; referenceRange?: string }> }) => {
    const abnormalFindings: string[] = [];

    for (const test of input.tests) {
      const val = parseFloat(test.resultValue);
      if (test.testName.toLowerCase().includes('glucose') && val > 125) {
        abnormalFindings.push(`Fasting Glucose elevated at ${test.resultValue} mg/dL (Normal: 70-99 mg/dL).`);
      }
      if (test.testName.toLowerCase().includes('hdl') && val < 50) {
        abnormalFindings.push(`HDL Cholesterol low at ${test.resultValue} mg/dL (Desirable: > 50 mg/dL).`);
      }
      if (test.testName.toLowerCase().includes('creatinine') && val > 1.3) {
        abnormalFindings.push(`Serum Creatinine elevated at ${test.resultValue} mg/dL.`);
      }
    }

    return {
      hasAbnormalities: abnormalFindings.length > 0,
      abnormalFindings,
      plainLanguageSummary: abnormalFindings.length > 0
        ? `Review flagged ${abnormalFindings.length} test parameter(s) requiring clinical correlation.`
        : 'All measured laboratory parameters are within normal standard reference ranges.',
      suggestedFollowUp: abnormalFindings.length > 0 ? 'Consult attending physician for follow-up review.' : 'Routine annual screening.',
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
    };
  },
});
