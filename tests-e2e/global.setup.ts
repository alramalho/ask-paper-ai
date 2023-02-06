import { chromium, FullConfig, expect } from '@playwright/test';
async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(process.env.APP_URL);

  await page.click('text=Sign in with Discord');
  await page.waitForURL(/.*discord.com\/login.*/);
  await page.fill('input[name="email"]', process.env.TEST_DISCORD_EMAIL);
  await page.fill('input[name="password"]', process.env.TEST_DISCORD_PASSWORD);

  await page.click('button[type="submit"]');
  await page.click('text=Authorize');

  await expect(page.getByTestId("discord-username")).toHaveText(process.env.TEST_DISCORD_USERNAME)
  await page.context().storageState({ path: 'storageState.json' });
  await browser.close();
}

export default globalSetup;