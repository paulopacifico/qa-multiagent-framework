import { Page, Locator } from '@playwright/test';

export class SamplePage {
  private readonly heading: Locator;
  private readonly submitButton: Locator;
  private readonly messageBox: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('h1');
    this.submitButton = page.locator('button[type="submit"]');
    this.messageBox = page.locator('[data-testid="message"]');
  }

  async navigate(url: string): Promise<void> {
    await this.page.goto(url);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async getHeadingText(): Promise<string> {
    return this.heading.innerText();
  }

  async assertMessageVisible(): Promise<void> {
    await this.messageBox.waitFor({ state: 'visible' });
  }
}
