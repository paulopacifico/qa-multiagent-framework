import {
  GateReport,
  Finding,
  Phase,
  GateStatus,
  FindingSeverity,
} from '../../src/types/gate-report';

describe('GateReport type contract', () => {
  it('accepts a valid PASS gate report with no findings', () => {
    const report: GateReport = {
      phase: 'spec',
      agent: 'QA-Spec',
      status: 'PASS',
      findings: [],
      recommendation: 'No issues found. Proceed to plan phase.',
      timestamp: new Date().toISOString(),
    };

    expect(report.status).toBe('PASS');
    expect(report.findings).toHaveLength(0);
  });

  it('accepts a FAIL gate report with at least one FAIL finding', () => {
    const finding: Finding = {
      type: 'AMBIGUOUS_REQUIREMENT',
      severity: 'FAIL',
      location: 'spec.md:42',
      message: 'FR-003 uses "should" instead of "MUST"',
      constitution_ref: 'Principle II: Zero Assumption Policy',
    };

    const report: GateReport = {
      phase: 'code',
      agent: 'QA-Code',
      status: 'FAIL',
      findings: [finding],
      recommendation: 'Rewrite FR-003 using RFC 2119 language.',
      timestamp: new Date().toISOString(),
    };

    expect(report.status).toBe('FAIL');
    expect(report.findings[0].type).toBe('AMBIGUOUS_REQUIREMENT');
    expect(report.findings[0].severity).toBe('FAIL');
  });

  it('accepts a WARN gate report with optional location and constitution_ref', () => {
    const finding: Finding = {
      type: 'MISSING_OUT_OF_SCOPE',
      severity: 'WARN',
      message: 'No out-of-scope section declared in spec.',
    };

    const report: GateReport = {
      phase: 'spec',
      agent: 'QA-Spec',
      status: 'WARN',
      findings: [finding],
      recommendation: 'Add an out-of-scope section before proceeding.',
      timestamp: new Date().toISOString(),
    };

    expect(report.status).toBe('WARN');
    expect(report.findings[0].location).toBeUndefined();
    expect(report.findings[0].constitution_ref).toBeUndefined();
  });

  it('enforces Phase is one of spec | plan | code | ci', () => {
    const validPhases: Phase[] = ['spec', 'plan', 'code', 'ci'];
    validPhases.forEach((phase) => {
      const report: GateReport = {
        phase,
        agent: 'QA-Spec',
        status: 'PASS',
        findings: [],
        recommendation: 'OK',
        timestamp: new Date().toISOString(),
      };
      expect(report.phase).toBe(phase);
    });
  });

  it('enforces GateStatus is one of PASS | WARN | FAIL', () => {
    const validStatuses: GateStatus[] = ['PASS', 'WARN', 'FAIL'];
    validStatuses.forEach((status) => {
      const report: GateReport = {
        phase: 'ci',
        agent: 'QA-CI',
        status,
        findings: [],
        recommendation: 'OK',
        timestamp: new Date().toISOString(),
      };
      expect(report.status).toBe(status);
    });
  });

  it('enforces FindingSeverity is one of FAIL | WARN', () => {
    const validSeverities: FindingSeverity[] = ['FAIL', 'WARN'];
    validSeverities.forEach((severity) => {
      const finding: Finding = {
        type: 'TEST_TYPE',
        severity,
        message: 'test message',
      };
      expect(finding.severity).toBe(severity);
    });
  });
});
