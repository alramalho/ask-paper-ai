import { expect, FileChooser, Page, test } from '@playwright/test';
import { TEST_EMAIL } from '../playwright.config';
import { safeDeleteFromDynamo, verifyIfInDynamo } from './utils/aws';
import { SNAKE_CASE_PREFIX } from './utils/constants';
import { loginAsDiscordUser, loginAsGuest } from './utils/session';
var fs = require('fs')


test.describe.configure({ mode: 'serial' });

test.describe.skip('When logged in as Discord User', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {

    /*
    This describe is archived as I spent 1 week trying to properly fake the auth flow
    Best I got was here:
    1. Creating custom session-token cookie with JWT
    2. Using that cookie to login
    More info:
      https://answers.netlify.com/t/netlify-resetting-session-token-cookies-in-next-auth-only-in-netlify-deploy/96522
    */
    page = await loginAsDiscordUser(browser, TEST_EMAIL);

    const fracNetPaperHash = "39eee3d413713f47ed3d25957c7cd32dfbdc437652e9083ea2eea649c6b11897"
    await safeDeleteFromDynamo(`${SNAKE_CASE_PREFIX}_json_papers_${process.env.ENVIRONMENT}`, 'id', fracNetPaperHash)

    page.on("filechooser", (fileChooser: FileChooser) => {
      fileChooser.setFiles([process.cwd() + '/tests/fixtures/fracnet_paper.pdf']);
    });
    await page.getByTestId('file-upload').click();

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();
  })

  test.afterAll(async () => {
    await page.close();
  });

  test('should be able to upload a paper', async () => {
    await expect(page.getByTestId('upload-successful')).toBeVisible();
    await expect(page.getByTestId("pdf")).toContainText("Deep-learning-assisted detection and segmentation of rib fractures from")

    await verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_json_papers_${process.env.ENVIRONMENT}`, 'email', TEST_EMAIL, {
      paper_title: 'Deep-learning-assisted detection and segmentation of rib fractures from CT scans: Development and validation of FracNet',
    })

  })

  test('should be able to ask a follow up question', async () => {
    await expect(page.getByTestId('loading-answer')).not.toBeVisible();
    await page.getByTestId("ask-textarea").fill("can you say that again, but only mention their last names?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("Li");
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Jin");
  });

  test('should be able to create and ask custom prompt', async () => {
    await page.getByTestId('clear-button').click();
    await page.getByTestId("predefined-actions-panel").click();
    await page.getByText("Manage Custom Prompts").click();

    await page.getByTestId("title-input").fill("Wubba Lubba Dub Dub");
    await page.getByTestId("text-input").fill("Rick and Morty");

    await page.getByTestId("create-button").click();
    await page.getByText("Prompt saved!");

    await page.getByText("Wubba Lubba Dub Dub").click();
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toContainText("Rick and Morty");
  })

  test('should be able to delete custom prompt', async () => {
    await page.getByTestId("predefined-actions-panel").click();
    await page.getByText("Manage Custom Prompts").click();

    await page.getByText("Delete").first().click();

    await page.getByTestId("create-button").click();
    await page.getByText("Prompt deleted!");

    await expect(page.getByTestId("predefined-actions-panel")).not.toContainText("Rick and Morty");
  })

  // TODO: this test is flaky and needs to be redone -> maybe move to backend
  // test('should be able ask a question that needs information from a table', async () => {
  //   await page.getByTestId('clear-button').click();
  //   await page.getByTestId("ask-textarea").fill("Give me the Tuning Segmentation IoU present shown in Table 2.");
  //   await page.getByTestId('ask-button').click();

  //   await expect(page.getByTestId('loading-answer')).toBeVisible();
  //   await expect(page.getByTestId('answer-area').last()).toBeVisible();

  //   await expect(page.getByTestId('answer-area').last()).toContainText("58.7%");
  //   await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  // });


  test('should be able to store accurate feedback', async () => {
    await page.click('text=👍');

    await page.getByText('Thank you')

    await verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_feedback_${process.env.ENVIRONMENT}`, 'email', TEST_EMAIL, {
      was_answer_accurate: true,
    });
  })

  test('should be able to store feedback', async () => {

    await page.click('text=Feedback?');
    // todo: add verification that slider is working. I spent too much time trying to do it, skipping for now
    await page.getByTestId('nps-select').getByText('8').click();
    await page.click('text=🔍 Inline data exploration tool');
    const selectedNextFeature = 'data-exploration';

    const writtenMessage = "dummy";
    await page.getByTestId("message").fill(writtenMessage);

    await page.locator('button[data-testid="feedback-submit"]').scrollIntoViewIfNeeded();
    await page.locator('button[data-testid="feedback-submit"]').click();

    await expect(page.getByTestId('feedback-successful')).toBeVisible();

    await verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_feedback_${process.env.ENVIRONMENT}`, 'email', TEST_EMAIL, {
      nps: 8,
      next_feature: selectedNextFeature,
      message: writtenMessage,
    });
  })

});

test.describe('When logged in as guest', () => {

  let page: Page

  test.beforeAll(async ({ browser }) => {

    page = await loginAsGuest(browser, page, TEST_EMAIL);

    const fracNetPaperHash = "39eee3d413713f47ed3d25957c7cd32dfbdc437652e9083ea2eea649c6b11897"
    await safeDeleteFromDynamo(`${SNAKE_CASE_PREFIX}_json_papers_${process.env.ENVIRONMENT}`, 'id', fracNetPaperHash)

    page.on("filechooser", (fileChooser: FileChooser) => {
      fileChooser.setFiles([process.cwd() + '/tests/fixtures/fracnet_paper.pdf']);
    });
    await page.getByTestId('file-upload').click();

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();
  })

  test.afterAll(async () => {
    await page.close();
  });

  test('should be able to upload a paper', async () => {
    await expect(page.getByTestId('upload-successful')).toBeVisible();
    await expect(page.getByTestId("pdf")).toContainText("Deep-learning-assisted detection and segmentation of rib fractures from")

    await verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_json_papers_${process.env.ENVIRONMENT}`, 'email', TEST_EMAIL, {
      paper_title: 'Deep-learning-assisted detection and segmentation of rib fractures from CT scans: Development and validation of FracNet',
    })

  })

  test('should be able to only send one message in a row', async () => {
    await page.getByTestId("ask-textarea").fill("who are the authors?");
    await page.getByTestId('ask-button').click();
    await page.waitForTimeout(1000);
    await page.getByTestId('ask-button').click();

    await expect(page.getByText("Please wait until the current request is finished.")).toBeVisible();
  });

  test('should have all requests left', async () => {
    await expect(page.getByTestId('remaining-requests')).toHaveText("1000");
  })

  test('should be able to ask a question', async () => {
    await page.getByTestId('clear-button').click();
    await page.getByTestId("predefined-actions-panel").click();
    await page.click('text=Extract Datasets');
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("Size",);
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test('should be able to clear the conversation', async () => {
    await page.getByTestId('clear-button').click();
    await expect(page.getByTestId("chat")).not.toContainText("Which sections did you get that from?");
  });

  test('should be able ask a question that needs information from a figure caption', async () => {
    await page.getByTestId('clear-button').click();
    await page.getByTestId("ask-textarea").fill("What is the exact figure 3 caption?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("FROC curves");
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test('should be able to ask a question with partial sections', async () => {
    await page.getByTestId('clear-button').click();
    await page.getByTestId("configuration-panel").click();
    await page.getByText("Acknowledgments").last().click();

    await page.getByTestId("ask-textarea").fill("do they mention Acknowledgments? answer only \"Yes\" or \"No\".");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("No");
  });

  test('should be able to extract datasets', async () => {
    await page.getByTestId('clear-button').click();
    await page.getByTestId("predefined-actions-panel").click();
    await page.click('text=Extract Datasets');
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("Size",);
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test('should be able to generate summary', async () => {
    await page.getByTestId('clear-button').click();
    await page.getByTestId("predefined-actions-panel").click();
    await page.click('text=Generate Summary');
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("FracNet",);
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test("should be able to explain selected text", async () => {
    await page.getByTestId('clear-button').click();
    await page.getByTestId('pdf').scrollIntoViewIfNeeded()
    await page.dblclick('text=Background')
    await page.getByTestId("predefined-actions-panel").click();
    await page.click('text=Explain Selected Text');
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("background", { ignoreCase: true });
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  })

  test('should be able to receive the results email', async () => {
    await page.getByTestId('clear-button').click();
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("fracture");

    await page.click('text=Email me this');
    await expect(page.getByTestId('email-sent')).toBeVisible();
    // await verifyEmailSentInLastXMinutes(1);
  })

  test('should download the datasets CSV file', async () => {
    const downloadPromise = page.waitForEvent('download');

    await page.getByTestId('export-dropdown').click()
    await page.waitForSelector('[data-menu-id$="csv"]');
    await page.click('[data-menu-id$="csv"]')

    // await prepareDownload(page);

    const download = await downloadPromise;

    const filePath = await download.path();

    expect(download.suggestedFilename()).toContain('.csv');
    const fileContents = fs.readFileSync(filePath, 'utf-8'); // Read the file contents
    // Add assertions to test the file contents
    expect(fileContents).toContain('Size');

  });

  test('should download the datasets JSON file', async () => {
    const downloadPromise = page.waitForEvent('download');

    await page.getByTestId('export-dropdown').click()
    await page.waitForSelector('[data-menu-id$="json"]');
    await page.click('[data-menu-id$="json"]')

    // await prepareDownload(page);

    const download = await downloadPromise;

    const filePath = await download.path();

    expect(download.suggestedFilename()).toContain('.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8'); // Read the file contents
    // Add assertions to test the file contents
    expect(fileContents).toContain('Size');

  });

  test('should have less requests remaining', async () => {
    await expect(page.getByTestId('remaining-requests')).not.toHaveText("1000");
  })

  test('should be able to store accurate feedback', async () => {
    await page.click('text=👍');

    await page.getByText('Thank you')

    await verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_feedback_${process.env.ENVIRONMENT}`, 'email', TEST_EMAIL, {
      was_answer_accurate: true,
    });
  })

  test('should be able to store feedback', async () => {

    await page.click('text=Feedback?');
    // todo: add verification that slider is working. I spent too much time trying to do it, skipping for now
    await page.getByTestId('nps-select').getByText('8').click();
    await page.click('text=🔍 Inline data exploration tool');
    const selectedNextFeature = 'data-exploration';

    const writtenMessage = "dummy";
    await page.getByTestId("message").fill(writtenMessage);

    await page.locator('button[data-testid="feedback-submit"]').scrollIntoViewIfNeeded();
    await page.locator('button[data-testid="feedback-submit"]').click();

    await expect(page.getByTestId('feedback-successful')).toBeVisible();

    await verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_feedback_${process.env.ENVIRONMENT}`, 'email', TEST_EMAIL, {
      nps: 8,
      next_feature: selectedNextFeature,
      message: writtenMessage,
    });
  })

});

test.describe('Different upload types & Quality Control', () => {

  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await loginAsGuest(browser, page, TEST_EMAIL);
  })

  test('should be able to upload the paper via URL', async ({ browser }) => {

    await page.getByTestId('upload-url-input').fill('https://arxiv.org/pdf/2302.04761.pdf');
    await page.getByTestId('upload-url-button').click();

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();

    await expect(page.getByTestId("pdf")).toContainText("Toolformer: Language Models Can Teach Themselves to Use")
  })
  
  test('should be able to upload the demo paper', async ({ browser }) => {
    await page.getByTestId('upload-demo-paper').click();

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();

    await expect(page.getByTestId("pdf")).toContainText("CheXpert: A Large Chest Radiograph")
  })

  test('should be able to extract all 5 datasets from chexPert', async ({browser}) => {  
    await page.getByTestId('upload-demo-paper').click();
  
    await page.getByTestId("predefined-actions-panel").click();
    await page.click('text=Extract Datasets');
    await page.getByTestId('ask-button').click();
  
    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();
  
    await expect(page.getByTestId('answer-area').last()).toContainText("CheXpert");
    await expect(page.getByTestId('answer-area').last()).toContainText("OpenI");
    await expect(page.getByTestId('answer-area').last()).toContainText("PLCO Lung");
    await expect(page.getByTestId('answer-area').last()).toContainText("MIMIC-CXR");
    await expect(page.getByTestId('answer-area').last()).toContainText("ChestX-ray14");
  });
});



// todo: missing test cases
// - test secondary upload in mobile
// - test too big of a paper for dynamodb

