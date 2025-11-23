require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // For the new SDK, we might not have a direct listModels on genAI, 
        // but usually it's on the client or we just try a generation.
        // Actually, the SDK doesn't always expose listModels easily in the high-level helper.
        // Let's try a simple generation with 'gemini-pro' to see if it works with the new key.
        console.log("Testing gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-pro worked:", result.response.text());
    } catch (error) {
        console.error("gemini-pro failed:", error.message);
    }

    try {
        console.log("Testing gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash worked:", result.response.text());
    } catch (error) {
        console.error("gemini-1.5-flash failed:", error.message);
    }
}

listModels();
