import path from 'path';
import fs from 'fs';
import os from 'os';
import { buildFeatureGatesDir, persistGateReport } from '../../src/orchestrator/gate-persister';
import { GateReport } from '../../src/types';

function makeReport(phase: GateReport['phase'], status: GateReport['status']): GateReport {
  return {
    phase,
    agent: 'QA-Spec',
    status,
    findings: [],
    recommendation: 'OK',
    timestamp: new Date().toISOString(),
  };
}

describe('Gate Persister', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-persister-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes the gate report as JSON to <gates_dir>/<phase>-gate.json', () => {
    const report = makeReport('spec', 'PASS');
    persistGateReport(report, tmpDir);

    const filePath = path.join(tmpDir, 'spec-gate.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(content.phase).toBe('spec');
    expect(content.status).toBe('PASS');
  });

  it('creates the gates_dir if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'qa-gates', 'nested');
    const report = makeReport('plan', 'FAIL');
    persistGateReport(report, nestedDir);

    expect(fs.existsSync(path.join(nestedDir, 'plan-gate.json'))).toBe(true);
  });

  it('writes valid JSON with all required GateReport fields', () => {
    const report = makeReport('code', 'WARN');
    report.findings = [{ type: 'UNMAPPED_TEST', severity: 'WARN', message: 'No FR reference.' }];
    persistGateReport(report, tmpDir);

    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'code-gate.json'), 'utf-8'));
    expect(content).toMatchObject({
      phase: 'code',
      agent: 'QA-Spec',
      status: 'WARN',
      findings: expect.arrayContaining([expect.objectContaining({ type: 'UNMAPPED_TEST' })]),
      recommendation: 'OK',
      timestamp: expect.any(String),
    });
  });

  it('overwrites an existing gate file for the same phase', () => {
    const first = makeReport('ci', 'FAIL');
    persistGateReport(first, tmpDir);

    const second = makeReport('ci', 'PASS');
    persistGateReport(second, tmpDir);

    const content = JSON.parse(fs.readFileSync(path.join(tmpDir, 'ci-gate.json'), 'utf-8'));
    expect(content.status).toBe('PASS');
  });

  it('returns the absolute path of the written file', () => {
    const report = makeReport('spec', 'PASS');
    const writtenPath = persistGateReport(report, tmpDir);

    expect(writtenPath).toBe(path.join(tmpDir, 'spec-gate.json'));
  });

  it('builds a feature-scoped QA gates directory', () => {
    expect(buildFeatureGatesDir('001-login', tmpDir)).toBe(
      path.join(tmpDir, 'specs', '001-login', 'qa-gates'),
    );
  });

  it('rejects malformed gate reports before writing', () => {
    const malformedReport = {
      ...makeReport('spec', 'PASS'),
      status: 'DONE',
    } as unknown as GateReport;

    expect(() => persistGateReport(malformedReport, tmpDir)).toThrow(
      'Invalid GateReport: cannot persist malformed gate report',
    );
    expect(fs.existsSync(path.join(tmpDir, 'spec-gate.json'))).toBe(false);
  });
});
