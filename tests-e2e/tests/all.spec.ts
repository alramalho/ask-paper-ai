import {test, expect, FileChooser, Page} from '@playwright/test';
import {uuid} from 'uuidv4';

test.describe.configure({mode: 'serial'});

let page: Page

test.beforeAll(async ({browser}) => {


  page = await browser.newPage()

  await page.goto(process.env.APP_URL)

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
  await expect(page.getByTestId('answer-area')).toBeVisible();

  await expect(page.getByTestId('answer-area')).toContainText("FracNet");
  await expect(page.getByTestId('answer-area')).not.toContainText("Sorry");
});

test('should be able to extract datasets', async () => {
  await page.click('text=Extract Datasets');

  await expect(page.getByTestId('loading-answer')).toBeVisible();
  await expect(page.getByTestId('answer-area')).toBeVisible();

  await expect(page.getByTestId('answer-area')).toContainText("Size", {timeout: 30000});
  await expect(page.getByTestId('answer-area')).toContainText("FracNet");
  await expect(page.getByTestId('answer-area')).not.toContainText("Sorry");
});

test('should be able to store feedback', async () => {
  await page.getByTestId("ask-textarea").fill("What is the paper about?");
  await page.getByTestId('ask-button').click();

  await expect(page.getByTestId('loading-answer')).toBeVisible();
  await expect(page.getByTestId('answer-area')).toBeVisible();

  await page.click('text=Answer was accurate');
  const selectedAccuracy= true

  await page.click('text=😍');
  const selectedSentiment = "Very good"
  await page.click('text=🔍 Inline data exploration tool');
  const selectedNextFeature = 'data-exploration'

  const randomString = uuid();

  await page.getByTestId("message").fill(randomString);

  await page.locator('button[data-testid="feedback-submit"]').scrollIntoViewIfNeeded()
  await page.locator('button[data-testid="feedback-submit"]').click()

  await expect(page.getByTestId('feedback-successful')).toBeVisible();

  verifyIfInDynamo('HippoPrototypeFeedback-sandbox', 'message', randomString, {
    was_answer_accurate: selectedAccuracy,
    sentiment: selectedSentiment,
    next_feature: selectedNextFeature,
    email: 'e2e-test'
  })
})


// todo: missing test cases
// - should be able to upload the same paper without doubling storage

function verifyIfInDynamo(tableName: string, indexField: string, indexValue: string, extraAttributes: {[key: string]: string | boolean}) {
  require('child_process').execSync(`aws dynamodb query --table-name ${tableName} --index-name ${indexField}-index --key-condition-expression "${indexField} = :${indexField}" --expression-attribute-values '{":${indexField}":{"S":"${indexValue}"}}' | jq '.Items[] | select(${formatAttributes(extraAttributes)})' | grep ${indexField} || (echo "No item found with requested charactersitics" && exit 1)`);
}

function formatAttributes(obj: {[key: string]: string | boolean}): string {
  return Object.entries(obj).map(([key, value]) => {
    let formattedValue: string;
    if (typeof value === 'string') {
      formattedValue = `"${value}"`;
      return `.${key}.S == ${formattedValue}`;
    } else if (typeof value === 'boolean') {
      formattedValue = value ? '"true"' : '"false"';
      return `.${key}.BOOL == ${formattedValue}`;
    }
    throw new Error(`Unsupported type ${typeof value} for value ${value}`);
  }).join(' and ');
}