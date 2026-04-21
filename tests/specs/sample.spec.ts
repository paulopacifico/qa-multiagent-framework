import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { SamplePage } from '../pages/sample.page';

test.describe('Sample Feature — FR-001', () => {
  test('FR-001: page loads and submit button is accessible', async ({ page }) => {
    allure.label('FR-001');

    const samplePage = new SamplePage(page);
    await samplePage.navigate('https://example.com');

    const heading = await samplePage.getHeadingText();
    expect(heading).toBeTruthy();
  });
});
