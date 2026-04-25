import { runQaCiAgent, CiRunResult } from '../../src/agents/qa-ci';

const PASSING_RUN: CiRunResult = {
  total: 10,
  passed: 10,
  failed: 0,
  skipped: 0,
  durationMs: 300_000,
  allureArtifactUploaded: true,
  retriedTests: [],
  failedTestIds: [],
};

describe('QA-CI Agent', () => {
  it('returns PASS for a clean CI run under 10 minutes with Allure uploaded', async () => {
    const report = await runQaCiAgent(PASSING_RUN);
    expect(report.agent).toBe('QA-CI');
    expect(report.phase).toBe('ci');
    expect(report.status).toBe('PASS');
    expect(report.findings).toHaveLength(0);
  });

  it('returns FAIL with TEST_FAILURES when any tests failed', async () => {
    const run: CiRunResult = {
      ...PASSING_RUN,
      passed: 8,
      failed: 2,
      failedTestIds: ['login > valid credentials', 'checkout > place order'],
    };
    const report = await runQaCiAgent(run);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'TEST_FAILURES')).toBe(true);
    expect(report.findings.some((f) => f.message.includes('login > valid credentials'))).toBe(true);
  });

  it('returns FAIL with MISSING_ALLURE_ARTIFACT when allure was not uploaded', async () => {
    const run: CiRunResult = { ...PASSING_RUN, allureArtifactUploaded: false };
    const report = await runQaCiAgent(run);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'MISSING_ALLURE_ARTIFACT')).toBe(true);
  });

  it('returns WARN with SUITE_TIMEOUT when suite exceeds 10 minutes', async () => {
    const run: CiRunResult = { ...PASSING_RUN, durationMs: 620_000 };
    const report = await runQaCiAgent(run);
    expect(report.status).toBe('WARN');
    expect(report.findings.some((f) => f.type === 'SUITE_TIMEOUT')).toBe(true);
  });

  it('returns WARN with FLAKY_TEST_DETECTED when any test was retried', async () => {
    const run: CiRunResult = {
      ...PASSING_RUN,
      retriedTests: ['dashboard > loads user data'],
    };
    const report = await runQaCiAgent(run);
    expect(report.status).toBe('WARN');
    expect(report.findings.some((f) => f.type === 'FLAKY_TEST_DETECTED')).toBe(true);
    expect(report.findings.some((f) => f.message.includes('dashboard > loads user data'))).toBe(
      true,
    );
  });

  it('returns FAIL (not WARN) when both TEST_FAILURES and SUITE_TIMEOUT are present', async () => {
    const run: CiRunResult = {
      ...PASSING_RUN,
      failed: 1,
      failedTestIds: ['login > timeout test'],
      durationMs: 700_000,
    };
    const report = await runQaCiAgent(run);
    expect(report.status).toBe('FAIL');
  });

  it('includes a valid ISO 8601 timestamp', async () => {
    const report = await runQaCiAgent(PASSING_RUN);
    expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
  });
});
