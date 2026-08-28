import { v4 as uuidv4 } from 'uuid';
import { store } from '../../db/store';
import { AgentTask, AgentTaskStatus } from '../../types/shared';
import { LLMProvider } from './LLMProvider';
import { ToolRegistry } from './ToolRegistry';
import { SafetyGuardrails, CLINICAL_DISCLAIMER } from './SafetyGuardrails';
import { AgentAuditLogger } from './AgentAuditLogger';

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
  requiresHumanReview?: boolean;
}

export class AgentRuntime {
  private static agentRegistry: Map<string, AgentConfig> = new Map();

  public static registerAgent(config: AgentConfig) {
    this.agentRegistry.set(config.name, config);
    console.log(`[AGENT FRAMEWORK] Registered Agent: ${config.name}`);
  }

  public static getAgentConfig(name: string): AgentConfig | undefined {
    return this.agentRegistry.get(name);
  }

  public static getAllAgents(): AgentConfig[] {
    return Array.from(this.agentRegistry.values());
  }

  /**
   * Executes a registered autonomous or assistive agent workflow.
   */
  public static async runTask(
    agentName: string,
    inputPayload: Record<string, any>,
    context?: { userId?: string }
  ): Promise<AgentTask> {
    const config = this.agentRegistry.get(agentName);
    if (!config) {
      throw new Error(`Agent '${agentName}' is not registered in AgentRuntime.`);
    }

    const taskId = uuidv4();
    const task: AgentTask = {
      id: taskId,
      agentName,
      status: 'running',
      inputPayload: SafetyGuardrails.sanitizePHI(inputPayload),
      reasoningSteps: [`Initializing agent '${agentName}' with input context...`],
      toolCalls: [],
      requiresApproval: Boolean(config.requiresHumanReview),
      createdAt: new Date().toISOString(),
    };

    store.agentTasks.unshift(task);

    try {
      // 1. Evaluate Safety Guardrails
      const safetyCheck = SafetyGuardrails.evaluateClinicalAction(agentName, 'execute_agent_workflow', inputPayload);
      if (safetyCheck.requiresDoctorSignOff) {
        task.requiresApproval = true;
      }

      // 2. Prepare Context & Prompt
      task.reasoningSteps.push(`Evaluating allowed tools: [${config.allowedTools.join(', ')}]`);

      // 3. Optional Tool Execution based on input payload
      const executedToolResults: Record<string, any> = {};
      for (const toolName of config.allowedTools) {
        if (inputPayload.autoExecuteTools !== false) {
          // If the payload specifies a patientId, execute relevant data gathering tools
          if (toolName === 'getPatientHistory' && inputPayload.patientId) {
            task.reasoningSteps.push(`Executing tool '${toolName}' for patient ${inputPayload.patientId}...`);
            const toolOut = await ToolRegistry.executeTool(agentName, toolName, { patientId: inputPayload.patientId }, context);
            task.toolCalls.push({ tool: toolName, input: { patientId: inputPayload.patientId }, output: toolOut, timestamp: new Date().toISOString() });
            executedToolResults[toolName] = toolOut;
          }

          if (toolName === 'checkDrugInteractionsAndAllergies' && inputPayload.patientId && inputPayload.medicationNames) {
            task.reasoningSteps.push(`Executing allergy & drug safety check via '${toolName}'...`);
            const toolOut = await ToolRegistry.executeTool(agentName, toolName, { patientId: inputPayload.patientId, medicationNames: inputPayload.medicationNames }, context);
            task.toolCalls.push({ tool: toolName, input: inputPayload, output: toolOut, timestamp: new Date().toISOString() });
            executedToolResults[toolName] = toolOut;
          }

          if (toolName === 'analyzeLabResults' && inputPayload.tests) {
            task.reasoningSteps.push(`Analyzing lab panel values via '${toolName}'...`);
            const toolOut = await ToolRegistry.executeTool(agentName, toolName, { tests: inputPayload.tests }, context);
            task.toolCalls.push({ tool: toolName, input: inputPayload.tests, output: toolOut, timestamp: new Date().toISOString() });
            executedToolResults[toolName] = toolOut;
          }
        }
      }

      // 4. LLM Synthesis
      task.reasoningSteps.push(`Invoking clinical LLM for synthesis and structured drafting...`);
      const llmResponse = await LLMProvider.complete({
        messages: [
          { role: 'system', content: config.systemPrompt },
          {
            role: 'user',
            content: `Input Context:\n${JSON.stringify(inputPayload, null, 2)}\n\nTool Results:\n${JSON.stringify(executedToolResults, null, 2)}`,
          },
        ],
        jsonMode: true,
      });

      let parsedOutput: any;
      try {
        parsedOutput = JSON.parse(llmResponse.content);
      } catch {
        parsedOutput = { responseText: llmResponse.content };
      }

      // 5. Attach disclaimer
      parsedOutput.clinicalDisclaimer = CLINICAL_DISCLAIMER;
      task.outputResult = parsedOutput;
      task.status = task.requiresApproval ? 'requires_human_review' : 'completed';
      task.completedAt = new Date().toISOString();
      task.reasoningSteps.push(
        task.requiresApproval
          ? `Workflow drafted successfully. Status: REQUIRES_HUMAN_REVIEW.`
          : `Workflow completed successfully.`
      );

      await AgentAuditLogger.logAction({
        agentName,
        action: 'AGENT_TASK_COMPLETED',
        entityType: 'AgentTask',
        entityId: task.id,
        userId: context?.userId,
        inputSummary: JSON.stringify(inputPayload).slice(0, 200),
        outputSummary: JSON.stringify(parsedOutput).slice(0, 200),
        safetyCheckPassed: true,
      });

      return task;
    } catch (err: any) {
      task.status = 'failed';
      task.error = err.message;
      task.completedAt = new Date().toISOString();
      task.reasoningSteps.push(`Error executing agent: ${err.message}`);

      await AgentAuditLogger.logAction({
        agentName,
        action: 'AGENT_TASK_FAILED',
        entityType: 'AgentTask',
        entityId: task.id,
        userId: context?.userId,
        inputSummary: JSON.stringify(inputPayload).slice(0, 200),
        outputSummary: `Failed: ${err.message}`,
        safetyCheckPassed: false,
      });

      return task;
    }
  }

  /**
   * Clinician sign-off endpoint for human-in-the-loop agent workflows.
   */
  public static approveTask(taskId: string, approvedByUserId: string): AgentTask {
    const task = store.agentTasks.find((t) => t.id === taskId);
    if (!task) throw new Error(`Agent task ${taskId} not found.`);

    task.isApproved = true;
    task.approvedBy = approvedByUserId;
    task.status = 'completed';
    task.reasoningSteps.push(`Approved and signed off by Clinician/Staff (ID: ${approvedByUserId}) at ${new Date().toISOString()}`);

    return task;
  }
}
