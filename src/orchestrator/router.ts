import { Phase } from '../types';
import { runQaSpecAgent } from '../agents/qa-spec';
import { runQaPlanAgent } from '../agents/qa-plan';
import { runQaCodeAgent } from '../agents/qa-code';
import { runQaCiAgent } from '../agents/qa-ci';

type AgentFn = typeof runQaSpecAgent | typeof runQaPlanAgent | typeof runQaCodeAgent | typeof runQaCiAgent;

const AGENT_MAP: Record<Phase, AgentFn> = {
  spec: runQaSpecAgent,
  plan: runQaPlanAgent,
  code: runQaCodeAgent,
  ci: runQaCiAgent,
};

export function resolveAgent(phase: Phase): AgentFn {
  const agent = AGENT_MAP[phase];
  if (!agent) throw new Error(`Unknown phase: ${phase}`);
  return agent;
}
