/**
 * Nexa Health AI - Safety Guardrails & Clinical Verification Module
 * Enforces HIPAA/GDPR data protection, PHI sanitization, and regulatory disclaimer policies.
 */

export const CLINICAL_DISCLAIMER = 'REQUIRES CLINICAL VALIDATION — NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL JUDGMENT.';

export interface SafetyCheckResult {
  passed: boolean;
  warnings: string[];
  sanitizedInput?: any;
  requiresDoctorSignOff: boolean;
}

export class SafetyGuardrails {
  /**
   * Sanitizes input payload to prevent accidental logging of raw sensitive credentials
   */
  public static sanitizePHI(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;

    const cloned = JSON.parse(JSON.stringify(payload));
    const sensitiveKeys = ['ssn', 'creditCard', 'password', 'token', 'secret'];

    const redact = (obj: any) => {
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
          obj[key] = '[REDACTED_PHI]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          redact(obj[key]);
        }
      }
    };

    redact(cloned);
    return cloned;
  }

  /**
   * Evaluates if an agent's proposed action involves direct clinical treatment changes,
   * drug prescriptions, or diagnoses which strictly mandate human physician sign-off.
   */
  public static evaluateClinicalAction(agentName: string, actionType: string, payload: any): SafetyCheckResult {
    const warnings: string[] = [];
    let requiresDoctorSignOff = false;

    if (['PrescriptionAgent', 'ClinicalNotesAgent', 'BillingAgent'].includes(agentName)) {
      requiresDoctorSignOff = true;
    }

    if (actionType.includes('prescribe') || actionType.includes('sign_prescription')) {
      requiresDoctorSignOff = true;
      warnings.push('Autonomous prescription generation requires explicit Doctor verification and electronic signature.');
    }

    if (actionType.includes('diagnose') || actionType.includes('generate_soap')) {
      requiresDoctorSignOff = true;
      warnings.push('AI generated SOAP notes and ICD-10 diagnostic codes must be signed by the attending clinician.');
    }

    return {
      passed: true,
      warnings,
      requiresDoctorSignOff,
    };
  }

  /**
   * Ensures output objects or text always carry the regulatory disclaimer.
   */
  public static appendDisclaimer<T extends Record<string, any>>(data: T): T & { clinicalDisclaimer: string } {
    return {
      ...data,
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
    };
  }
}
