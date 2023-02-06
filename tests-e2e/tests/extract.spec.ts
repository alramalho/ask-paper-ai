import { test, expect, Page } from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.click('text=Upload your paper');
  await page.locator('input[name="file-upload"]')
    .setInputFiles('./tests/fixtures/fracnet_paper.pdf');

  await expect(page.getByTestId('upload-loading')).toBeVisible();
  await expect(page.getByTestId('upload-successful')).toBeVisible();
})

test('should be able ask a question', async ({page}) => {
  await page.getByTestId("ask-textarea").fill("What is the paper about?");

  await expect(page.getByTestId('answer-area')).toHaveText("FracNet");
  await expect(page.getByTestId('answer-area')).not.toHaveText("Sorry");
});

test('should be able to extract datasets', async ({page}) => {
  await page.click('text=Extract Datasets');

  await expect(page.getByTestId('answer-area')).toHaveText("FracNet");
  await expect(page.getByTestId('answer-area')).not.toHaveText("Sorry");
});