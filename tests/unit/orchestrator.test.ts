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

  it('runs the plan phase using plan, spec, and data-model files from the feature directory', async () => {
    const featureDir = path.join(tmpDir, 'feature');
    fs.mkdirSync(featureDir);
    fs.writeFileSync(path.join(featureDir, 'spec.md'), VALID_SPEC);
    fs.writeFileSync(
      path.join(featureDir, 'plan.md'),
      `
# Implementation Plan

## Technology Stack

Page Object Model pattern is used.
TypeScript strict mode is enabled.

## Components

### AuthComponent
Covers FR-001.

## Requirements Coverage

| Requirement | Covered By |
|-------------|------------|
| FR-001 | AuthComponent |
`,
    );
    fs.writeFileSync(
      path.join(featureDir, 'data-model.md'),
      `
# Data Model

- **Gate Report**: Report.
- **Orchestrator**: Coordinator.
- **QA Sub-Agent**: Agent.
- **Phase**: Gate phase.
`,
    );

    const decision = await orchestrate({
      artifact_path: path.join(featureDir, 'plan.md'),
      phase: 'plan',
      feature_id: 'test-001',
      gates_dir: tmpDir,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.gate_report.phase).toBe('plan');
    expect(fs.existsSync(path.join(tmpDir, 'plan-gate.json'))).toBe(true);
  });

  it('runs the code phase from a CodeInput JSON artifact', async () => {
    const codeInputPath = path.join(tmpDir, 'code-input.json');
    fs.writeFileSync(
      codeInputPath,
      JSON.stringify({
        files: [
          {
            path: 'tests/specs/sample.spec.ts',
            content: `
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';
test('FR-001: sample', async () => {
  allure.label('FR-001');
});
`,
          },
        ],
      }),
    );

    const decision = await orchestrate({
      artifact_path: codeInputPath,
      phase: 'code',
      feature_id: 'test-001',
      gates_dir: tmpDir,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.gate_report.phase).toBe('code');
    expect(fs.existsSync(path.join(tmpDir, 'code-gate.json'))).toBe(true);
  });

  it('runs the ci phase from a CI result JSON artifact', async () => {
    const ciInputPath = path.join(tmpDir, 'ci-input.json');
    fs.writeFileSync(
      ciInputPath,
      JSON.stringify({
        total: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        durationMs: 1000,
        allureArtifactUploaded: true,
        failedTestIds: [],
        retriedTests: [],
      }),
    );

    const decision = await orchestrate({
      artifact_path: ciInputPath,
      phase: 'ci',
      feature_id: 'test-001',
      gates_dir: tmpDir,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.gate_report.phase).toBe('ci');
    expect(fs.existsSync(path.join(tmpDir, 'ci-gate.json'))).toBe(true);
  });

  it('throws GateBlockedError and persists FAIL report for an invalid spec', async () => {
    const badSpec = VALID_SPEC.replace(
      'System MUST allow',
      'System should allow [NEEDS CLARIFICATION: which method?]',
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
