import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { SamplePage } from '../pages/sample.page';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
  <body>
    <h1>QA Framework Demo</h1>
    <form>
      <button type="submit">Submit</button>
    </form>
    <div data-testid="message">Ready</div>
  </body>
</html>
`;

test.describe('Sample Feature — FR-001', () => {
  test('FR-001: page loads and heading is accessible via POM', async ({ page }) => {
    allure.label('FR-001');

    await page.setContent(SAMPLE_HTML);
    const samplePage = new SamplePage(page);

    const heading = await samplePage.getHeadingText();
    expect(heading).toBe('QA Framework Demo');
  });

  test('FR-001: message element is visible via POM', async ({ page }) => {
    allure.label('FR-001');

    await page.setContent(SAMPLE_HTML);
    const samplePage = new SamplePage(page);

    await samplePage.assertMessageVisible();
  });
});
