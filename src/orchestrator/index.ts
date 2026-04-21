import fs from 'fs';
import { Phase, GateDecision } from '../types';
import { resolveAgent } from './router';
import { enforceGate, GateBlockedError } from './gate-enforcer';
import { persistGateReport } from './gate-persister';
import { runQaSpecAgent } from '../agents/qa-spec';

export interface OrchestratorRequest {
  artifact_path: string;
  phase: Phase;
  feature_id: string;
  gates_dir: string;
  accept_warn?: boolean;
  acceptance_reason?: string;
}

export { GateBlockedError };

export async function orchestrate(request: OrchestratorRequest): Promise<GateDecision> {
  const { artifact_path, phase, gates_dir, accept_warn, acceptance_reason } = request;

  resolveAgent(phase);

  const artifactContent = fs.readFileSync(artifact_path, 'utf-8');

  let report;
  if (phase === 'spec') {
    report = await runQaSpecAgent(artifactContent);
  } else {
    throw new Error(`Direct file-based orchestration for phase "${phase}" not yet implemented. Use agent-specific runners.`);
  }

  persistGateReport(report, gates_dir);

  return enforceGate(report, accept_warn, acceptance_reason);
}
