import { GateReport, Finding } from '../../types';

export interface CiRunResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  allureArtifactUploaded: boolean;
  failedTestIds: string[];
  retriedTests: string[];
}

const TEN_MINUTES_MS = 600_000;

export async function runQaCiAgent(run: CiRunResult): Promise<GateReport> {
  const findings: Finding[] = [];

  if (run.failed > 0) {
    findings.push({
      type: 'TEST_FAILURES',
      severity: 'FAIL',
      message: `${run.failed} test(s) failed: ${run.failedTestIds.join(', ')}`,
      constitution_ref: 'Principle I: Shift-Left Quality',
    });
  }

  if (!run.allureArtifactUploaded) {
    findings.push({
      type: 'MISSING_ALLURE_ARTIFACT',
      severity: 'FAIL',
      message:
        'Allure report artifact was not uploaded in CI. Check the upload step in qa-gates.yml.',
      constitution_ref: 'Principle I: Shift-Left Quality',
    });
  }

  if (run.durationMs > TEN_MINUTES_MS) {
    const minutes = (run.durationMs / 60_000).toFixed(1);
    findings.push({
      type: 'SUITE_TIMEOUT',
      severity: 'WARN',
      message: `Suite took ${minutes} minutes, exceeding the 10-minute threshold.`,
      constitution_ref: 'Principle I: Shift-Left Quality',
    });
  }

  if (run.retriedTests.length > 0) {
    findings.push({
      type: 'FLAKY_TEST_DETECTED',
      severity: 'WARN',
      message: `Flaky test(s) detected (retried): ${run.retriedTests.join(', ')}`,
      constitution_ref: 'Principle I: Shift-Left Quality',
    });
  }

  const status = deriveStatus(findings);

  return {
    phase: 'ci',
    agent: 'QA-CI',
    status,
    findings,
    recommendation:
      status === 'PASS'
        ? 'CI run passed all quality gates. Safe to merge.'
        : 'Resolve all FAIL findings before merging to main.',
    timestamp: new Date().toISOString(),
  };
}

function deriveStatus(findings: Finding[]): 'PASS' | 'WARN' | 'FAIL' {
  if (findings.some((f) => f.severity === 'FAIL')) return 'FAIL';
  if (findings.some((f) => f.severity === 'WARN')) return 'WARN';
  return 'PASS';
}
