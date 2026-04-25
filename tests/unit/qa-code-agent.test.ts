import { runQaCodeAgent, CodeInput } from '../../src/agents/qa-code';

const CLEAN_FILES: CodeInput = {
  files: [
    {
      path: 'tests/specs/login.spec.ts',
      content: `
import { test } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { allure } from 'allure-playwright';

test.describe('Login', () => {
  test('FR-001: valid user logs in', async ({ page }) => {
    allure.label('FR-001');
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login('user@test.com', 'password');
    await loginPage.assertDashboardVisible();
  });
});
`,
    },
    {
      path: 'tests/pages/login.page.ts',
      content: `
import { Page } from '@playwright/test';

export class LoginPage {
  private emailInput = this.page.locator('#email');
  private passwordInput = this.page.locator('#password');
  private submitButton = this.page.locator('button[type=submit]');

  constructor(private page: Page) {}

  async navigate() { await this.page.goto('/login'); }
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
  async assertDashboardVisible() {
    await this.page.locator('#dashboard').waitFor();
  }
}
`,
    },
  ],
};

describe('QA-Code Agent', () => {
  it('returns PASS for clean POM-compliant test files', async () => {
    const report = await runQaCodeAgent(CLEAN_FILES);
    expect(report.agent).toBe('QA-Code');
    expect(report.phase).toBe('code');
    expect(report.status).toBe('PASS');
    expect(report.findings).toHaveLength(0);
  });

  it('returns FAIL with RAW_SELECTOR_IN_TEST when a spec file calls page.locator directly', async () => {
    const input: CodeInput = {
      files: [
        {
          path: 'tests/specs/checkout.spec.ts',
          content: `
import { test, expect } from '@playwright/test';
test('checkout', async ({ page }) => {
  await page.locator('button.submit').click();
});
`,
        },
      ],
    };
    const report = await runQaCodeAgent(input);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'RAW_SELECTOR_IN_TEST')).toBe(true);
    expect(report.findings.some((f) => f.location?.includes('checkout.spec.ts'))).toBe(true);
  });

  it('returns FAIL with ANY_TYPE_VIOLATION when a file uses the any type', async () => {
    const input: CodeInput = {
      files: [
        {
          path: 'tests/pages/cart.page.ts',
          content: `
export class CartPage {
  async getItems(): Promise<any[]> { return []; }
}
`,
        },
      ],
    };
    const report = await runQaCodeAgent(input);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'ANY_TYPE_VIOLATION')).toBe(true);
  });

  it('returns FAIL with POM_WRONG_LOCATION when a page class is outside tests/pages/', async () => {
    const input: CodeInput = {
      files: [
        {
          path: 'tests/specs/helpers/cart.page.ts',
          content: `export class CartPage {}`,
        },
      ],
    };
    const report = await runQaCodeAgent(input);
    expect(report.status).toBe('FAIL');
    expect(report.findings.some((f) => f.type === 'POM_WRONG_LOCATION')).toBe(true);
  });

  it('returns WARN with UNMAPPED_TEST when a spec test has no allure label or FR reference', async () => {
    const input: CodeInput = {
      files: [
        {
          path: 'tests/specs/misc.spec.ts',
          content: `
import { test } from '@playwright/test';
test('something happens', async ({ page }) => {
  // no allure label, no FR reference
});
`,
        },
      ],
    };
    const report = await runQaCodeAgent(input);
    expect(report.status).toBe('WARN');
    expect(report.findings.some((f) => f.type === 'UNMAPPED_TEST')).toBe(true);
  });

  it('returns WARN with MISSING_ALLURE_ANNOTATION when a mapped test has no Allure annotation', async () => {
    const input: CodeInput = {
      files: [
        {
          path: 'tests/specs/mapped.spec.ts',
          content: `
import { test } from '@playwright/test';
test('FR-001: mapped without allure', async () => {
  // test body
});
`,
        },
      ],
    };
    const report = await runQaCodeAgent(input);
    expect(report.status).toBe('WARN');
    expect(report.findings.some((f) => f.type === 'MISSING_ALLURE_ANNOTATION')).toBe(true);
    expect(report.findings.some((f) => f.type === 'UNMAPPED_TEST')).toBe(false);
  });

  it('validates mapping and Allure annotation per individual test block', async () => {
    const input: CodeInput = {
      files: [
        {
          path: 'tests/specs/mixed.spec.ts',
          content: `
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';
test('FR-001: mapped test', async () => {
  allure.label('FR-001');
});
test('unmapped test', async () => {
  // missing mapping and allure annotation
});
`,
        },
      ],
    };
    const report = await runQaCodeAgent(input);
    expect(report.status).toBe('WARN');
    expect(report.findings.filter((f) => f.type === 'UNMAPPED_TEST')).toHaveLength(1);
    expect(report.findings.filter((f) => f.type === 'MISSING_ALLURE_ANNOTATION')).toHaveLength(1);
  });

  it('includes a valid ISO 8601 timestamp', async () => {
    const report = await runQaCodeAgent(CLEAN_FILES);
    expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
  });
});
