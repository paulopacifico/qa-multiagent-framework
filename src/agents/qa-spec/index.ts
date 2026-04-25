import { GateReport, Finding } from '../../types';

export async function runQaSpecAgent(specContent: string): Promise<GateReport> {
  const findings: Finding[] = [];

  if (/\[NEEDS CLARIFICATION/i.test(specContent)) {
    findings.push({
      type: 'INCOMPLETE_ARTIFACT',
      severity: 'FAIL',
      message: 'Spec contains unresolved [NEEDS CLARIFICATION] markers.',
      constitution_ref: 'Principle II: Zero Assumption Policy',
    });
  }

  const frLines = specContent.match(/\*\*FR-\d+\*\*:.*$/gm) ?? [];
  for (const line of frLines) {
    if (/\b(should|may|might|could)\b/i.test(line)) {
      findings.push({
        type: 'AMBIGUOUS_REQUIREMENT',
        severity: 'FAIL',
        message: `FR uses weak language instead of RFC 2119 MUST/MUST NOT: "${line.trim()}"`,
        constitution_ref: 'Principle II: Zero Assumption Policy',
      });
    }
  }

  const frNumbers = (specContent.match(/\*\*FR-(\d+)\*\*/g) ?? []).map((m) =>
    m.replace(/\*\*/g, ''),
  );
  const seen = new Set<string>();
  for (const fr of frNumbers) {
    if (seen.has(fr)) {
      findings.push({
        type: 'DUPLICATE_FR',
        severity: 'FAIL',
        message: `Duplicate requirement number: ${fr}`,
        constitution_ref: 'Principle II: Zero Assumption Policy',
      });
    }
    seen.add(fr);
  }

  if (!/##\s*Out of Scope/i.test(specContent)) {
    findings.push({
      type: 'MISSING_OUT_OF_SCOPE',
      severity: 'WARN',
      message: 'Spec is missing an "Out of Scope" section.',
      constitution_ref: 'Principle II: Zero Assumption Policy',
    });
  }

  const status = deriveStatus(findings);

  return {
    phase: 'spec',
    agent: 'QA-Spec',
    status,
    findings,
    recommendation:
      status === 'PASS'
        ? 'Spec meets all constitution rules. Proceed to plan phase.'
        : 'Resolve all FAIL findings before advancing to plan phase.',
    timestamp: new Date().toISOString(),
  };
}

function deriveStatus(findings: Finding[]): 'PASS' | 'WARN' | 'FAIL' {
  if (findings.some((f) => f.severity === 'FAIL')) return 'FAIL';
  if (findings.some((f) => f.severity === 'WARN')) return 'WARN';
  return 'PASS';
}
