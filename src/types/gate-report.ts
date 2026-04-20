export type Phase = 'spec' | 'plan' | 'code' | 'ci';

export type GateStatus = 'PASS' | 'WARN' | 'FAIL';

export type FindingSeverity = 'FAIL' | 'WARN';

export type AgentName = 'QA-Spec' | 'QA-Plan' | 'QA-Code' | 'QA-CI';

export interface Finding {
  type: string;
  severity: FindingSeverity;
  message: string;
  location?: string;
  constitution_ref?: string;
}

export interface GateReport {
  phase: Phase;
  agent: AgentName;
  status: GateStatus;
  findings: Finding[];
  recommendation: string;
  timestamp: string;
}

export interface OrchestratorRequest {
  artifact_path: string;
  phase: Phase;
  feature_id: string;
  accept_warn?: boolean;
}

export interface GateDecision {
  allowed: boolean;
  gate_report: GateReport;
  acceptance_reason?: string;
}
