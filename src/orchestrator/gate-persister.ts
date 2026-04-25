import fs from 'fs';
import path from 'path';
import { GateReport } from '../types';

const PHASES: readonly GateReport['phase'][] = ['spec', 'plan', 'code', 'ci'];
const AGENTS: readonly GateReport['agent'][] = ['QA-Spec', 'QA-Plan', 'QA-Code', 'QA-CI'];
const STATUSES: readonly GateReport['status'][] = ['PASS', 'WARN', 'FAIL'];
const SEVERITIES: readonly GateReport['findings'][number]['severity'][] = ['FAIL', 'WARN'];

export function buildFeatureGatesDir(featureId: string, projectRoot = process.cwd()): string {
  if (!featureId.trim()) {
    throw new Error('feature_id is required to build the QA gates directory');
  }

  return path.join(projectRoot, 'specs', featureId, 'qa-gates');
}

export function persistGateReport(report: GateReport, gatesDir: string): string {
  if (!isGateReport(report)) {
    throw new Error('Invalid GateReport: cannot persist malformed gate report');
  }

  fs.mkdirSync(gatesDir, { recursive: true });
  const filePath = path.join(gatesDir, `${report.phase}-gate.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  return filePath;
}

function isGateReport(value: unknown): value is GateReport {
  if (!isRecord(value)) return false;

  return (
    includes(PHASES, value.phase) &&
    includes(AGENTS, value.agent) &&
    includes(STATUSES, value.status) &&
    Array.isArray(value.findings) &&
    value.findings.every(isFinding) &&
    typeof value.recommendation === 'string' &&
    typeof value.timestamp === 'string'
  );
}

function isFinding(value: unknown): value is GateReport['findings'][number] {
  if (!isRecord(value)) return false;

  return (
    typeof value.type === 'string' &&
    includes(SEVERITIES, value.severity) &&
    typeof value.message === 'string' &&
    optionalString(value.location) &&
    optionalString(value.constitution_ref)
  );
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}
