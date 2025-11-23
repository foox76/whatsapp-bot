require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel(modelName) {
    console.log(`\nTesting ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Say hello");
        console.log(`SUCCESS: ${modelName} responded:`, result.response.text());
    } catch (error) {
        console.error(`FAILED: ${modelName} error:`, error.message);
        if (error.response) {
            console.error("Response details:", JSON.stringify(error.response, null, 2));
        }
    }
}

async function run() {
    await testModel("gemini-1.5-flash");
    await testModel("gemini-1.5-pro");
    await testModel("gemini-1.0-pro");
    await testModel("gemini-pro");
}

run();
