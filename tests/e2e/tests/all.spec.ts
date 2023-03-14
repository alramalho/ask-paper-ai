import {expect, FileChooser, Page, test} from '@playwright/test';
import { SNAKE_CASE_PREFIX } from './utils/constants';

const TEST_EMAIL = (process.env.TEST_ID ?? 'local') + '@e2e.test';
test.describe.configure({mode: 'serial'});

let page: Page


test.describe('Normal upload', () => {
  test.beforeAll(async ({browser}) => {
    page = await browser.newPage()

    await page.goto(process.env.APP_URL)

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
    await expect(page.getByTestId("upload-undertext")).toHaveText("Selected \"Deep-learning-assisted detection and segmentation of rib fractures from CT scans: Development and validation of FracNet\"")

    verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_json_papers_sandbox`, 'email', TEST_EMAIL, {
      paper_title: 'Deep-learning-assisted detection and segmentation of rib fractures from CT scans: Development and validation of FracNet',
    })
  })


  test('should be able ask a question', async () => {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area')).toBeVisible();

    await expect(page.getByTestId('answer-area')).toContainText("fracture");
    await expect(page.getByTestId('answer-area')).not.toContainText("Sorry");
  });

  test('should be able to extract datasets', async () => {
    await page.click('text=Extract Datasets');

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area')).toBeVisible();

    await expect(page.getByTestId('answer-area')).toContainText("Size",);
    await expect(page.getByTestId('answer-area')).not.toContainText("Sorry");
  });

  test('should be able to receive the results email', async () => {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area')).toBeVisible();

    await expect(page.getByTestId('answer-area')).toContainText("fracture");

    await page.click('text=Email me this');
    await expect(page.getByTestId('email-sent')).toBeVisible();
    // await verifyEmailSentInLastXMinutes(1);
  })

  test('should be able to store feedback', async () => {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area')).toBeVisible();

    await page.click('text=Answer was accurate');
    await page.click('text=Feedback?');
    await page.click('text=😍');
    const selectedSentiment = "Very good";
    await page.click('text=🔍 Inline data exploration tool');
    const selectedNextFeature = 'data-exploration';


    const writtenMessage = "dummy";
    await page.getByTestId("message").fill(writtenMessage);

    await page.locator('button[data-testid="feedback-submit"]').scrollIntoViewIfNeeded();
    await page.locator('button[data-testid="feedback-submit"]').click();

    await expect(page.getByTestId('feedback-successful')).toBeVisible();

    await verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_feedback_sandbox`, 'email', TEST_EMAIL, {
      was_answer_accurate: true,
    });
    await verifyIfInDynamo(`${SNAKE_CASE_PREFIX}_feedback_sandbox`, 'email', TEST_EMAIL, {
      sentiment: selectedSentiment,
      next_feature: selectedNextFeature,
      message: writtenMessage,
    });
  })

});

test.describe('Upload with URL', () => {
  test('should be able to upload the paper via URL', async ({browser}) => {
    page = await browser.newPage()
    await page.goto(process.env.APP_URL)

    await page.getByTestId('upload-url-input').fill('https://arxiv.org/pdf/2302.04761.pdf');
    await page.getByTestId('upload-url-button').click();

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();

    await expect(page.getByTestId("upload-undertext")).toHaveText("Selected \"Toolformer: Language Models Can Teach Themselves to Use Tools\"")
  })
});


function verifyEmailSentInLastXMinutes(minutes: number) {
  require('child_process').execSync(`timestamp=$(date -v -${minutes}M +"%Y-%m-%dT%H:%M:%S%z"); for entry in $(aws ses get-send-statistics | jq '.SendDataPoints[] .Timestamp' | tr -d '"'); do if [[ $entry > $timestamp ]]; then  echo "Found"; else exit 1; fi; done`);
}


// todo: missing test cases
// - should be able to upload the same paper without doubling storage

function verifyIfInDynamo(tableName: string, indexField: string, indexValue: string, extraAttributes: {[key: string]: string | boolean}) {
  require('child_process').execSync(`aws dynamodb query --table-name ${tableName} --index-name ${indexField}-index --key-condition-expression "${indexField} = :${indexField}" --expression-attribute-values '{":${indexField}":{"S":"${indexValue}"}}' | jq '.Items[] | select(${formatAttributes(extraAttributes)})' | grep '"${indexField}":' || (echo "No item found with requested charactersitics" && exit 1)`);
}

function formatAttributes(obj: {[key: string]: string | boolean}): string {
  return Object.entries(obj).map(([key, value]) => {
    let formattedValue: string;
    if (typeof value === 'string') {
      formattedValue = `"${value}"`;
      return `.${key}.S == ${formattedValue}`;
    } else if (typeof value === 'boolean') {
      return `.${key}.BOOL == ${value}`;
    }
    throw new Error(`Unsupported type ${typeof value} for value ${value}`);
  }).join(' and ');
}