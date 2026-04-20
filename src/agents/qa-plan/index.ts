import { GateReport, Finding } from '../../types';

export interface PlanInput {
  planContent: string;
  dataModelContent: string;
  specRequirements: string[];
  specEntities: string[];
}

export async function runQaPlanAgent(input: PlanInput): Promise<GateReport> {
  const { planContent, dataModelContent, specRequirements, specEntities } = input;
  const findings: Finding[] = [];

  for (const fr of specRequirements) {
    if (!planContent.includes(fr)) {
      findings.push({
        type: 'UNCOVERED_REQUIREMENT',
        severity: 'FAIL',
        message: `${fr} has no corresponding plan component.`,
        constitution_ref: 'Principle I: Shift-Left Quality',
      });
    }
  }

  if (!/page object model/i.test(planContent)) {
    findings.push({
      type: 'POM_NOT_DECLARED',
      severity: 'FAIL',
      message: 'Plan does not declare Page Object Model pattern for the E2E layer.',
      constitution_ref: 'Principle IV: Page Object Model',
    });
  }

  if (!/typescript strict mode/i.test(planContent)) {
    findings.push({
      type: 'TYPESCRIPT_STRICT_MISSING',
      severity: 'FAIL',
      message: 'Plan does not declare TypeScript strict mode.',
      constitution_ref: 'Principle I: Shift-Left Quality',
    });
  }

  for (const entity of specEntities) {
    if (!dataModelContent.includes(entity)) {
      findings.push({
        type: 'ENTITY_MISMATCH',
        severity: 'FAIL',
        message: `Spec entity "${entity}" is not present in the data model.`,
        constitution_ref: 'Principle I: Shift-Left Quality',
      });
    }
  }

  const status = deriveStatus(findings);

  return {
    phase: 'plan',
    agent: 'QA-Plan',
    status,
    findings,
    recommendation:
      status === 'PASS'
        ? 'Plan meets all constitution rules. Proceed to task breakdown.'
        : 'Resolve all FAIL findings before generating tasks.',
    timestamp: new Date().toISOString(),
  };
}

function deriveStatus(findings: Finding[]): 'PASS' | 'WARN' | 'FAIL' {
  if (findings.some((f) => f.severity === 'FAIL')) return 'FAIL';
  if (findings.some((f) => f.severity === 'WARN')) return 'WARN';
  return 'PASS';
}
