import { runQaPlanAgent, PlanInput } from '../../src/agents/qa-plan';

const VALID_PLAN: PlanInput = {
  planContent: `
# Implementation Plan

## Architecture

### E2E Layer
Page Object Model pattern is used. All selectors live in POM classes.

### TypeScript
TypeScript strict mode is enabled.

## Components

### AuthController
Covers FR-001, FR-002.

### UserRepository
Covers FR-003.
`,
  dataModelContent: `
# Data Model

## Key Entities

- **User**: represents an authenticated user.
- **Session**: represents an active login session.
`,
  specRequirements: ['FR-001', 'FR-002', 'FR-003'],
  specEntities: ['User', 'Session'],
};

describe('QA-Plan Agent', () => {
  it('returns PASS when plan covers all FRs, declares POM and TypeScript strict', async () => {
    const { runQaPlanAgent } = await import('../../src/agents/qa-plan');
    const report = await runQaPlanAgent(VALID_PLAN);
    expect(report.agent).toBe('QA-Plan');
    expect(report.phase).toBe('plan');
    expect(report.status).toBe('PASS');
    expect(report.findings).toHaveLength(0);
  });

  it('returns FAIL with UNCOVERED_REQUIREMENT when a FR has no plan component', async () => {
    const input: PlanInput = {
      ...VALID_PLAN,
      specRequirements: ['FR-001', 'FR-002', 'FR-003', 'FR-004'],
    };
    const report = await runQaPlanAgent(input);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'UNCOVERED_REQUIREMENT')).toBe(true);
    expect(report.findings.some((f) => f.message.includes('FR-004'))).toBe(true);
  });

  it('returns FAIL with POM_NOT_DECLARED when POM is not mentioned in plan', async () => {
    const input: PlanInput = {
      ...VALID_PLAN,
      planContent: VALID_PLAN.planContent.replace(/Page Object Model[\s\S]*?classes\./m, ''),
    };
    const report = await runQaPlanAgent(input);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'POM_NOT_DECLARED')).toBe(true);
  });

  it('returns FAIL with TYPESCRIPT_STRICT_MISSING when strict mode is not declared', async () => {
    const input: PlanInput = {
      ...VALID_PLAN,
      planContent: VALID_PLAN.planContent.replace(/TypeScript strict mode is enabled\./m, ''),
    };
    const report = await runQaPlanAgent(input);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'TYPESCRIPT_STRICT_MISSING')).toBe(true);
  });

  it('returns FAIL with ENTITY_MISMATCH when data model is missing a spec entity', async () => {
    const input: PlanInput = {
      ...VALID_PLAN,
      specEntities: ['User', 'Session', 'Token'],
    };
    const report = await runQaPlanAgent(input);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'ENTITY_MISMATCH')).toBe(true);
    expect(report.findings.some((f) => f.message.includes('Token'))).toBe(true);
  });

  it('includes a valid ISO 8601 timestamp', async () => {
    const report = await runQaPlanAgent(VALID_PLAN);
    expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
  });
});
