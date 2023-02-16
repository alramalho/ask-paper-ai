async function uploadPaper(path, page) {
    page.on("filechooser", (fileChooser) => {
        fileChooser.setFiles([path]);
    });
    await page.click('text=Upload your paper');

}
async function giveFeedback(page) {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();


    await page.click('text=Answer was accurate');
    const selectedAccuracy = true;

    await page.click('text=😍');
    const selectedSentiment = "Very good";
    await page.click('text=🔍 Inline data exploration tool');
    const selectedNextFeature = 'data-exploration';


    const writtenMessage = "dummy";
    await page.getByTestId("message").fill(writtenMessage);

    await page.locator('button[data-testid="feedback-submit"]').scrollIntoViewIfNeeded();
    await page.locator('button[data-testid="feedback-submit"]').click();


    verifyIfInDynamo('HippoPrototypeFeedback-sandbox', 'email', process.env.TEST_ID + '@e2e-test', {
        was_answer_accurate: selectedAccuracy,
        sentiment: selectedSentiment,
        next_feature: selectedNextFeature,
        message: writtenMessage,
    });
}

function verifyIfInDynamo(tableName, indexField, indexValue, extraAttributes) {
    require('child_process').execSync(`aws dynamodb query --table-name ${tableName} --index-name ${indexField}-index --key-condition-expression "${indexField} = :${indexField}" --expression-attribute-values '{":${indexField}":{"S":"${indexValue}"}}' | jq '.Items[] | select(${formatAttributes(extraAttributes)})' | grep '"${indexField}":' || (echo "No item found with requested charactersitics" && exit 1)`);
}

function formatAttributes(obj)  {
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
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();
}
async function uploadAskAndGiveFeedbackFlow(page) {
    await page.goto('https://sandbox--hippo-prototype.netlify.app/');

    await uploadPaper(process.cwd() + '/fixtures/fracnet_paper.pdf', page)
    await askQuestion(page)
    await giveFeedback(page)
}

module.exports = {
    uploadAskAndGiveFeedbackFlow
}