import { enforceGate, GateBlockedError } from '../../src/orchestrator/gate-enforcer';
import { GateReport } from '../../src/types';

function makeReport(status: 'PASS' | 'WARN' | 'FAIL'): GateReport {
  return {
    phase: 'spec',
    agent: 'QA-Spec',
    status,
    findings:
      status !== 'PASS' ? [{ type: 'TEST_TYPE', severity: status, message: 'test finding' }] : [],
    recommendation: 'test recommendation',
    timestamp: new Date().toISOString(),
  };
}

describe('Gate Enforcer', () => {
  it('returns allowed:true for a PASS gate report', () => {
    const decision = enforceGate(makeReport('PASS'));
    expect(decision.allowed).toBe(true);
    expect(decision.gate_report.status).toBe('PASS');
  });

  it('throws GateBlockedError for a FAIL gate report', () => {
    expect(() => enforceGate(makeReport('FAIL'))).toThrow(GateBlockedError);
  });

  it('GateBlockedError carries the full gate report', () => {
    const report = makeReport('FAIL');
    try {
      enforceGate(report);
    } catch (err) {
      expect(err).toBeInstanceOf(GateBlockedError);
      expect((err as GateBlockedError).report).toEqual(report);
    }
  });

  it('throws GateBlockedError for a WARN gate when accept_warn is false', () => {
    expect(() => enforceGate(makeReport('WARN'), false)).toThrow(GateBlockedError);
  });

  it('returns allowed:true for a WARN gate when accept_warn is true', () => {
    const decision = enforceGate(makeReport('WARN'), true, 'Accepted by tech lead on 2026-04-20');
    expect(decision.allowed).toBe(true);
    expect(decision.acceptance_reason).toBe('Accepted by tech lead on 2026-04-20');
  });

  it('throws when accept_warn is true but no acceptance_reason is provided', () => {
    expect(() => enforceGate(makeReport('WARN'), true)).toThrow(
      'acceptance_reason is required when accepting a WARN gate',
    );
  });
});
