import { runQaSpecAgent } from '../../src/agents/qa-spec';

const VALID_SPEC = `
# Feature Specification: Login

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to authenticate with email and password.
- **FR-002**: System MUST reject login attempts with invalid credentials.

## User Scenarios & Testing

### User Story 1 - Login (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a valid user, **When** they submit credentials, **Then** they are redirected to dashboard.

## Out of Scope

- OAuth login is out of scope for v1.
`;

describe('QA-Spec Agent', () => {
  it('returns PASS for a valid spec with no issues', async () => {
    const report = await runQaSpecAgent(VALID_SPEC);
    expect(report.agent).toBe('QA-Spec');
    expect(report.phase).toBe('spec');
    expect(report.status).toBe('PASS');
    expect(report.findings).toHaveLength(0);
  });

  it('returns FAIL with AMBIGUOUS_REQUIREMENT when a FR uses "should"', async () => {
    const spec = VALID_SPEC.replace(
      'System MUST allow users to authenticate',
      'System should allow users to authenticate'
    );
    const report = await runQaSpecAgent(spec);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'AMBIGUOUS_REQUIREMENT')).toBe(true);
    expect(report.findings.some((f) => f.severity === 'FAIL')).toBe(true);
  });

  it('returns FAIL with INCOMPLETE_ARTIFACT when [NEEDS CLARIFICATION] marker is present', async () => {
    const spec = VALID_SPEC.replace('FR-001**: System MUST', 'FR-001**: System MUST [NEEDS CLARIFICATION: which auth method?]');
    const report = await runQaSpecAgent(spec);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'INCOMPLETE_ARTIFACT')).toBe(true);
  });

  it('returns WARN with MISSING_OUT_OF_SCOPE when out-of-scope section is absent', async () => {
    const spec = VALID_SPEC.replace(/## Out of Scope[\s\S]*/, '');
    const report = await runQaSpecAgent(spec);
    expect(report.status).toBe('WARN');
    expect(report.findings.some((f) => f.type === 'MISSING_OUT_OF_SCOPE')).toBe(true);
  });

  it('returns FAIL with DUPLICATE_FR when two FRs share the same number', async () => {
    const spec = VALID_SPEC + '\n- **FR-001**: System MUST also do something else.\n';
    const report = await runQaSpecAgent(spec);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'DUPLICATE_FR')).toBe(true);
  });

  it('includes a non-empty recommendation in every report', async () => {
    const report = await runQaSpecAgent(VALID_SPEC);
    expect(report.recommendation.length).toBeGreaterThan(0);
  });

  it('includes a valid ISO 8601 timestamp', async () => {
    const report = await runQaSpecAgent(VALID_SPEC);
    expect(() => new Date(report.timestamp)).not.toThrow();
    expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
  });
});
