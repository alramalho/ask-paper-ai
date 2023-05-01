import {expect, FileChooser, Page, test} from '@playwright/test';
import { SNAKE_CASE_PREFIX } from './utils/constants';
var crypto = require("crypto");
var id = crypto.randomUUID();
const TEST_EMAIL = ((process.env.ENVIRONMENT ?? 'local') + "-" + id ) + '@e2e.test';


test.describe.configure({mode: 'serial'});

let page: Page

async function loginAsGuest(browser) {
  page = await browser.newPage()

  await page.goto(process.env.APP_URL!)

  await page.getByTestId('guest-login-input').fill(TEST_EMAIL);
  await page.getByTestId('guest-login-button').click();
}

test.describe('Normal upload', () => {
  test.beforeAll(async ({browser}) => {

    await loginAsGuest(browser);

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

    verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_json_papers_${process.env.ENVIRONMENT}`, 'email', TEST_EMAIL, {
      paper_title: 'Deep-learning-assisted detection and segmentation of rib fractures from CT scans: Development and validation of FracNet',
    })
  })

  test('should have all requests left', async () => {
    await expect(page.getByTestId('remaining-requests')).toHaveText("1000");
  })

  test('should be able ask a question with best speed', async () => {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId("configuration-panel").click();
    await page.click('text=Best Speed');
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("fracture");
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test('should be able ask a question with best results', async () => {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId("configuration-panel").click();
    await page.click('text=Best Results');
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("fracture");
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test('should be able ask a question that needs information from a figure caption', async () => {
    await page.getByTestId("ask-textarea").fill("What is the exact figure 3 caption?");
    await page.getByTestId("configuration-panel").click();
    await page.click('text=Best Results');
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("FROC curves");
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test('should be able ask a question that needs information from a table', async () => {
    await page.getByTestId("ask-textarea").fill("Give me the Tuning Segmentation IoU present shown in Table 2. (Hint: is below 60% and above 56%)    ");
    await page.getByTestId("configuration-panel").click();
    await page.click('text=Best Results');
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("58.7%");
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test('should have one less request remaining', async () => {
    await expect(page.getByTestId('remaining-requests')).not.toHaveText("1000");
  })

  test('should be able to extract datasets', async () => {
    await page.getByTestId("predefined-actions-panel").click();
    await page.click('text=Extract Datasets');

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("Size",);
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test('should be able to generate summary', async () => {
    await page.click('text=Generate Summary');

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("FracNet",);
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  });

  test("should be able to explain selected text", async () => {
    await page.getByTestId('pdf').scrollIntoViewIfNeeded()
    await page.dblclick('text=Background')
    await page.click('text=Explain Selected Text');

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("The term \"background\" refers",);
    await expect(page.getByTestId('answer-area').last()).not.toContainText("Sorry");
  })

  test('should be able to receive the results email', async () => {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area').last()).toBeVisible();

    await expect(page.getByTestId('answer-area').last()).toContainText("fracture");

    await page.click('text=Email me this');
    await expect(page.getByTestId('email-sent')).toBeVisible();
    // await verifyEmailSentInLastXMinutes(1);
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

test.describe('Upload with URL', () => {
  test('should be able to upload the paper via URL', async ({browser}) => {
    await loginAsGuest(browser);

    await page.getByTestId('upload-url-input').fill('https://arxiv.org/pdf/2302.04761.pdf');
    await page.getByTestId('upload-url-button').click();

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();

    await expect(page.getByTestId("pdf")).toContainText("Toolformer: Language Models Can Teach Themselves to Use")
  })
});

test.describe('Upload the demo paper', () => {
  test('should be able to upload the paper via URL', async ({browser}) => {
    await loginAsGuest(browser);

    await page.getByTestId('upload-demo-paper').click();

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();

    await expect(page.getByTestId("pdf")).toContainText("CheXpert: A Large Chest Radiograph Dataset with Uncertainty Labels and Expert Comparison")
  })
});

function verifyEmailSentInLastXMinutes(minutes: number) {
  require('child_process').execSync(`timestamp=$(date -v -${minutes}M +"%Y-%m-%dT%H:%M:%S%z"); for entry in $(aws ses get-send-statistics | jq '.SendDataPoints[] .Timestamp' | tr -d '"'); do if [[ $entry > $timestamp ]]; then  echo "Found"; else exit 1; fi; done`);
}


// todo: missing test cases
// - should be able to upload the same paper without doubling storage

function verifyIfInDynamo(tableName: string, indexField: string, indexValue: string, extraAttributes: {[key: string]: string | boolean | number}) {
  const query = `--index-name ${indexField}-index --key-condition-expression "${indexField} = :${indexField}" --expression-attribute-values '{":${indexField}":{"S":"${indexValue}"}}' | jq '.Items[] | select(${formatAttributes(extraAttributes)})' | grep '"${indexField}":' || (echo "No item found with requested charactersitics" && exit 1)`
  if (process.env.ENVIRONMENT === 'dev') {
    const command = `aws --endpoint-url=http://localhost:4566 dynamodb query --table-name ${tableName} ${query}`
    console.log(command);
    require('child_process').execSync(command);
  } else {
    require('child_process').execSync(`aws dynamodb query --table-name ${tableName} ${query}`);
  }
}

function formatAttributes(obj: {[key: string]: string | boolean}): string {
  return Object.entries(obj).map(([key, value]) => {
    let formattedValue: string;
    formattedValue = `"${value}"`;
    if (typeof value === 'string') {
      return `.${key}.S == ${formattedValue}`;
    } else if (typeof value === 'number') {
      return `.${key}.N == ${formattedValue}`;
    } else if (typeof value === 'boolean') {
      return `.${key}.BOOL == ${value}`;
    }
    throw new Error(`Unsupported type ${typeof value} for value ${value}`);
  }).join(' and ');
}