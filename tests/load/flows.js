const crypto = require('crypto');
const TEST_EMAIL = crypto.randomUUID() + '@e2e.test';

async function uploadPaper(path, page) {
    page.on("filechooser", (fileChooser) => {
        fileChooser.setFiles([path]);
    });
    await page.click('text=Upload your paper');

}

async function loginAsGuest() {
    await page.getByTestId('guest-login-input').fill(TEST_EMAIL);
    await page.getByTestId('guest-login-button').click();
  }

  
async function giveFeedback(page) {

    // todo: add login as guest

    await page.click('text=Answer was accurate');
    const selectedAccuracy = true;

    await page.click('text=😍');
    const selectedSentiment = "Very good";
    await page.click('text=🔍 Inline data exploration tool');
    const selectedNextFeature = 'data-exploration';

    const randomuuid = crypto.randomUUID()
    const writtenMessage = `load test ${randomuuid}`;
    await page.getByTestId("message").fill(writtenMessage);

    await page.locator('button[data-testid="feedback-submit"]').scrollIntoViewIfNeeded();
    await page.locator('button[data-testid="feedback-submit"]').click();


    verifyIfInDynamo('HippoPrototypeFeedback-sandbox', 'message', writtenMessage, {
        was_answer_accurate: selectedAccuracy,
        sentiment: selectedSentiment,
        next_feature: selectedNextFeature,
        email: TEST_EMAIL,
    });
}

function verifyIfInDynamo(tableName, indexField, indexValue, extraAttributes) {
    require('child_process').execSync(`aws dynamodb query --table-name ${tableName} --index-name ${indexField}-index --key-condition-expression "${indexField} = :${indexField}" --expression-attribute-values '{":${indexField}":{"S":"${indexValue}"}}' | jq '.Items[] | select(${formatAttributes(extraAttributes)})' | grep '"${indexField}":' || (echo "No item found with requested charactersitics" && exit 1)`);
}

function formatAttributes(obj) {
    return Object.entries(obj).map(([key, value]) => {
        let formattedValue;
        if (typeof value === 'string') {
            formattedValue = `"${value}"`;
            return `.${key}.S == ${formattedValue}`;
        } else if (typeof value === 'boolean') {
            return `.${key}.BOOL == ${value}`;
        }
        throw new Error(`Unsupported type ${typeof value} for value ${value}`);
    }).join(' and ');
}

async function askQuestion(page) {
    await page.getByTestId("ask-textarea").fill(`this is a load test`);
    await page.getByTestId('ask-button').click();
}

async function uploadAskAndGiveFeedbackFlow(page) {
    await page.goto('https://sandbox--hippo-prototype.netlify.app/');
    await loginAsGuest();
    page.setDefaultTimeout(240000)

    await uploadPaper(process.cwd() + '/fixtures/fracnet_paper.pdf', page)
    await askQuestion(page)
    await giveFeedback(page)
}

const defineConfig = {
    use: {
        timeout: 10000
    }
}
module.exports = {
    uploadAskAndGiveFeedbackFlow,
    defineConfig
}