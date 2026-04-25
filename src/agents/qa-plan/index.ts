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
  const coverage = extractRequirementCoverage(planContent);
  const plannedComponents = extractPlannedComponents(planContent);

  for (const fr of specRequirements) {
    const mappedComponent = coverage.get(fr);
    const hasPlannedComponent =
      mappedComponent !== undefined &&
      plannedComponents.some((component) => componentMatches(component, mappedComponent));

    if (!mappedComponent || !hasPlannedComponent) {
      findings.push({
        type: 'UNCOVERED_REQUIREMENT',
        severity: 'FAIL',
        message: `${fr} has no corresponding planned component with implementation detail.`,
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

  for (const component of plannedComponents) {
    const isMapped = [...coverage.values()].some((mappedComponent) =>
      componentMatches(component, mappedComponent),
    );

    if (!isMapped) {
      findings.push({
        type: 'ORPHANED_COMPONENT',
        severity: 'WARN',
        message: `Plan component "${component}" is not mapped to a spec requirement.`,
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

function extractRequirementCoverage(planContent: string): Map<string, string> {
  const coverage = new Map<string, string>();
  const coverageRows = planContent.matchAll(/^\|\s*(FR-\d+)\s*\|\s*([^|]+?)\s*\|/gm);

  for (const row of coverageRows) {
    const component = normalizeCoverageComponent(row[2]);
    if (component) coverage.set(row[1], component);
  }

  let currentComponent: string | undefined;
  for (const line of extractComponentSection(planContent).split('\n')) {
    const heading = line.match(/^###\s+(?:\d+\.\s+)?(.+?)(?:\s+\(|$)/);
    if (heading) {
      currentComponent = heading[1].trim();
      continue;
    }

    if (!currentComponent) continue;

    if (!/\bcovers?\b/i.test(line)) continue;

    const requirements = line.match(/FR-\d+/g) ?? [];
    for (const requirement of requirements) {
      coverage.set(requirement, currentComponent);
    }
  }

  return coverage;
}

function extractPlannedComponents(planContent: string): string[] {
  const section = extractComponentSection(planContent);
  const components = [...section.matchAll(/^###\s+(?:\d+\.\s+)?(.+?)(?:\s+\(|$)/gm)].map((match) =>
    match[1].trim(),
  );

  return [...new Set(components)];
}

function extractComponentSection(planContent: string): string {
  return (
    planContent.match(/##\s+(?:Component Design|Components)\s*\n([\s\S]*?)(?=\n##\s|$)/i)?.[1] ?? ''
  );
}

function normalizeCoverageComponent(value: string): string | undefined {
  const component = value
    .split(/\s+\u2014\s+|\s+-\s+/)[0]
    .replace(/`/g, '')
    .trim();
  if (!component || /^(tbd|todo|n\/a|none)$/i.test(component)) return undefined;
  return component;
}

function componentMatches(component: string, mappedComponent: string): boolean {
  const normalizedComponent = normalizeName(component);
  const normalizedMappedComponent = normalizeName(mappedComponent);

  return (
    normalizedComponent === normalizedMappedComponent ||
    normalizedMappedComponent.includes(normalizedComponent) ||
    normalizedComponent.includes(normalizedMappedComponent)
  );
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
