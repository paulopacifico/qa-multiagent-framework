import fs from 'fs';
import path from 'path';
import { runQaCodeAgent, CodeInput } from '../../src/agents/qa-code';

function loadFile(relativePath: string): { path: string; content: string } {
  return {
    path: relativePath,
    content: fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8'),
  };
}

describe('Sample POM compliance', () => {
  it('QA-Code agent returns PASS for the sample POM and spec files', async () => {
    const input: CodeInput = {
      files: [loadFile('tests/pages/sample.page.ts'), loadFile('tests/specs/sample.spec.ts')],
    };
    const report = await runQaCodeAgent(input);
    expect(report.status).toBe('PASS');
    expect(report.findings).toHaveLength(0);
  });

  it('QA-Code agent returns FAIL when a raw selector is placed directly in a spec file', async () => {
    const input: CodeInput = {
      files: [
        {
          path: 'tests/specs/bad.spec.ts',
          content: `
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';
test('FR-001: bad test', async ({ page }) => {
  allure.label('FR-001');
  await page.locator('#submit').click();
});
`,
        },
      ],
    };
    const report = await runQaCodeAgent(input);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'RAW_SELECTOR_IN_TEST')).toBe(true);
  });
});
