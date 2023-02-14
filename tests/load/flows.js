async function uploadPaper(path, page) {
    page.on("filechooser", (fileChooser) => {
        fileChooser.setFiles([path]);
    });
    await page.click('text=Upload your paper');

    await expect(page.getByTestId('upload-loading')).toBeVisible();
    await expect(page.getByTestId('upload-successful')).toBeVisible();
}
async function giveFeedback(page) {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area')).toBeVisible();

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

    await expect(page.getByTestId('feedback-successful')).toBeVisible();

    verifyIfInDynamo('HippoPrototypeFeedback-sandbox', 'email', TEST_EMAIL, {
        was_answer_accurate: selectedAccuracy,
        sentiment: selectedSentiment,
        next_feature: selectedNextFeature,
        message: writtenMessage,
    });
}

 async function askQuestion(page) {
    await page.getByTestId("ask-textarea").fill("What is the paper about?");
    await page.getByTestId('ask-button').click();

    await expect(page.getByTestId('loading-answer')).toBeVisible();
    await expect(page.getByTestId('answer-area')).toBeVisible();

    await expect(page.getByTestId('answer-area')).toContainText("fracture");
    await expect(page.getByTestId('answer-area')).not.toContainText("Sorry");
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