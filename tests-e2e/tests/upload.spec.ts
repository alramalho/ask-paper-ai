import { test, expect, Page } from '@playwright/test';

test('should be able to upload a <6MB paper', async ({page}) => {
  await page.click('text=Upload your paper');
  await page.locator('input[name="file-upload"]')
    .setInputFiles('./tests/fixtures/fracnet_paper.pdf');

  await expect(page.getByTestId('upload-loading')).toBeVisible();
  await expect(page.getByTestId('upload-successful')).toBeVisible();

  await expect(page.getByTestId("upload-undertext")).toHaveText("Deep-learning-assisted detection and segmentation of rib fractures from CT scans: Development and validation of FracNet")
});

test('should NOT be able to upload a >6MB paper', async ({page}) => {
  await page.click('text=Upload your paper');
  await page.locator('input[name="file-upload"]')
    .setInputFiles('./tests/fixtures/mscoco_paper.pdf');

  await expect(page.getByTestId('upload-loading')).toBeVisible();
  await expect(page.getByTestId('upload-failed')).toBeVisible();

  await expect(page.getByTestId("upload-undertext")).toHaveText("currently we only support file up to 6MB")
})