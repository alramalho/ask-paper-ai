const { uploadPaper, askQuestion, giveFeedback } = require("../e2e/tests/all.spec")

async function uploadAskAndGiveFeedbackFlow() {
    await uploadPaper()
    await askQuestion()
    await giveFeedback()
}

module.exports = {
    uploadAskAndGiveFeedbackFlow
}