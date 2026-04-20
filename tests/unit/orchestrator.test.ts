import path from 'path';
import fs from 'fs';
import os from 'os';
import { orchestrate, OrchestratorRequest } from '../../src/orchestrator';
import { GateBlockedError } from '../../src/orchestrator/gate-enforcer';

const VALID_SPEC = `
# Feature Specification

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to authenticate.

## Out of Scope

- OAuth is out of scope.
`;

describe('Orchestrator', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-orch-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns a PASS decision and persists gate report for a valid spec', async () => {
    const specPath = path.join(tmpDir, 'spec.md');
    fs.writeFileSync(specPath, VALID_SPEC);

    const request: OrchestratorRequest = {
      artifact_path: specPath,
      phase: 'spec',
      feature_id: 'test-001',
      gates_dir: tmpDir,
    };

    const decision = await orchestrate(request);

    expect(decision.allowed).toBe(true);
    expect(decision.gate_report.status).toBe('PASS');
    expect(decision.gate_report.agent).toBe('QA-Spec');

    const gateFile = path.join(tmpDir, 'spec-gate.json');
    expect(fs.existsSync(gateFile)).toBe(true);
    const persisted = JSON.parse(fs.readFileSync(gateFile, 'utf-8'));
    expect(persisted.status).toBe('PASS');
  });

  it('throws GateBlockedError and persists FAIL report for an invalid spec', async () => {
    const badSpec = VALID_SPEC.replace(
      'System MUST allow',
      'System should allow [NEEDS CLARIFICATION: which method?]'
    );
    const specPath = path.join(tmpDir, 'spec.md');
    fs.writeFileSync(specPath, badSpec);

    const request: OrchestratorRequest = {
      artifact_path: specPath,
      phase: 'spec',
      feature_id: 'test-001',
      gates_dir: tmpDir,
    };

    await expect(orchestrate(request)).rejects.toThrow(GateBlockedError);

    const gateFile = path.join(tmpDir, 'spec-gate.json');
    expect(fs.existsSync(gateFile)).toBe(true);
    const persisted = JSON.parse(fs.readFileSync(gateFile, 'utf-8'));
    expect(persisted.status).toBe('FAIL');
  });

  it('throws for an unknown phase', async () => {
    const request = {
      artifact_path: '/any/path',
      phase: 'deploy' as never,
      feature_id: 'test-001',
      gates_dir: tmpDir,
    };
    await expect(orchestrate(request)).rejects.toThrow('Unknown phase: deploy');
  });
});
