import { v4 as uuidv4 } from 'uuid';
import { store } from '../../db/store';
import { AgentAuditLog } from '../../types/shared';
import { CLINICAL_DISCLAIMER } from './SafetyGuardrails';

export class AgentAuditLogger {
  public static async logAction(entry: {
    agentName: string;
    action: string;
    entityType: string;
    entityId?: string;
    userId?: string;
    inputSummary: string;
    outputSummary: string;
    safetyCheckPassed?: boolean;
  }): Promise<AgentAuditLog> {
    const log: AgentAuditLog = {
      id: uuidv4(),
      agentName: entry.agentName,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      userId: entry.userId,
      inputSummary: entry.inputSummary,
      outputSummary: entry.outputSummary,
      safetyCheckPassed: entry.safetyCheckPassed ?? true,
      clinicalDisclaimer: CLINICAL_DISCLAIMER,
      timestamp: new Date().toISOString(),
    };

    store.agentAuditLogs.unshift(log);
    console.log(`[AGENT AUDIT] [${log.timestamp}] [${log.agentName}] -> ${log.action} on ${log.entityType}:${log.entityId || 'N/A'}`);
    return log;
  }

  public static getLogs(limit = 50): AgentAuditLog[] {
    return store.agentAuditLogs.slice(0, limit);
  }
}
