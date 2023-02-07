import {test, expect, FileChooser, Page} from '@playwright/test';
import { solveCaptcha } from 'playwright-hcaptcha-solver';

test.describe.configure({mode: 'serial'});

let page: Page

test.beforeAll(async ({browser}) => {
  page = await browser.newPage()

  await page.goto(process.env.APP_URL)

  await page.click('text=Sign in with Discord');
  await page.waitForURL(/.*discord.com\/login.*/);
  await page.fill('input[name="email"]', process.env.TEST_DISCORD_EMAIL);
  await page.fill('input[name="password"]', process.env.TEST_DISCORD_PASSWORD);

  await page.click('button[type="submit"]');

  const isInCaptcha = await page.isVisible('text=Welcome back');

  if (isInCaptcha) {
    await solveCaptcha(page);
  }

  await page.waitForURL(/.*discord.com.*\/authorize.*/);
  await page.locator('css=button:last-child').click();

  await page.waitForURL(/.*localhost.*/);
  await page.waitForSelector('text=Ask Paper');
  await expect(page.getByTestId("discord-username")).toHaveText(process.env.TEST_DISCORD_USERNAME)

  page.on("filechooser", (fileChooser: FileChooser) => {
    fileChooser.setFiles([process.cwd() + '/tests/fixtures/fracnet_paper.pdf']);
  })
  await page.click('text=Upload your paper');

  await expect(page.getByTestId('upload-loading')).toBeVisible();
  await expect(page.getByTestId('upload-successful')).toBeVisible({timeout: 30000});
})

test.afterAll(async () => {
  await page.close();
});

test('should be able to see the selected dialog after uploading a paper', async () => {
  await expect(page.getByTestId("upload-undertext")).toHaveText("Selected \"Deep-learning-assisted detection and segmentation of rib fractures from CT scans: Development and validation of FracNet\"")
})

test('should be able ask a question', async () => {
  await page.getByTestId("ask-textarea").fill("What is the paper about?");
  await page.getByTestId('ask-button').click();

  await expect(page.getByTestId('loading-answer')).toBeVisible();
  await expect(page.getByTestId('answer-area')).toBeVisible({timeout: 30000});

  await expect(page.getByTestId('answer-area')).toContainText("FracNet");
  await expect(page.getByTestId('answer-area')).not.toContainText("Sorry");
});

test('should be able to extract datasets', async () => {
  await page.click('text=Extract Datasets');

  await expect(page.getByTestId('loading-answer')).toBeVisible();
  await expect(page.getByTestId('answer-area')).toBeVisible({timeout: 30000});

  await expect(page.getByTestId('answer-area')).toContainText("FracNet");
  await expect(page.getByTestId('answer-area')).not.toContainText("Sorry");
});

