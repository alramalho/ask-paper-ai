import { FileChooser, Page, expect, test } from '@playwright/test';
import { TEST_EMAIL } from '../playwright.config';
import { loginAsDiscordUser } from './utils/session';

test.describe.configure({ mode: 'serial' });

let page: Page

async function extractDatasets(page) {

    page.on("filechooser", (fileChooser: FileChooser) => {
      fileChooser.setFiles([process.cwd() + '/tests/fixtures/fracnet_paper.pdf']);
    });
    await page.getByTestId('file-upload').click();

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();
    
    await page.getByTestId('clear-button').click();
    await page.getByTestId("predefined-actions-panel").click();
    await page.click('text=Extract Datasets');
    await page.getByTestId('ask-button').click();
  
    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();
  
    await expect(page.getByTestId('answer-area').last()).toContainText("Size",);
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
}

test.describe('when testing profile page', () => {
    test.beforeAll(async ({ browser }) => {
        page = await loginAsDiscordUser(browser, TEST_EMAIL);
    })

    test('should show the extracted datasets', async ({ browser }) => {
        await extractDatasets(page);

        await expect(page.getByTestId("answer-area")).toContainText("RibFrac Dataset");
        await page.click('text=Save to My Datasets');

        await page.getByText("Dashboard succesfully updated with the new datasets");
    })

    test('should be able to delete a dataset', async ({ browser }) => {
        await page.click('text=My Dashboard');

        await page.getByText("My Extracted Datasets")
        
        await page.getByText("Delete").nth(1).click();

        await page.getByText("Save Changes").nth(1).click();

        await expect(page.getByTestId('profile-dataset-area')).not.toContainText("RibFrac Dataset");
    })
})

