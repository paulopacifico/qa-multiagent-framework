import { GateReport, GateDecision } from '../types';

export class GateBlockedError extends Error {
  constructor(public readonly report: GateReport) {
    super(`Gate BLOCKED — phase: ${report.phase}, status: ${report.status}`);
    this.name = 'GateBlockedError';
  }
}

export function enforceGate(
  report: GateReport,
  accept_warn = false,
  acceptance_reason?: string
): GateDecision {
  if (report.status === 'FAIL') {
    throw new GateBlockedError(report);
  }

  if (report.status === 'WARN') {
    if (!accept_warn) throw new GateBlockedError(report);
    if (!acceptance_reason) {
      throw new Error('acceptance_reason is required when accepting a WARN gate');
    }
    return { allowed: true, gate_report: report, acceptance_reason };
  }

  return { allowed: true, gate_report: report };
}
