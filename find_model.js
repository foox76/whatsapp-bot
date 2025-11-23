const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyD1NjuvqNCYvZDYNiw9kvwGqAlTKFNUzf0';
const genAI = new GoogleGenerativeAI(apiKey);
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function findWorkingModel() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.models) return;

        const contentModels = data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', '')); // SDK expects name without 'models/' usually, or handles it.

        console.log("Found models:", contentModels.join(', '));

        for (const modelName of contentModels) {
            console.log(`Trying ${modelName}...`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                console.log(`SUCCESS! Working model found: ${modelName}`);
                return; // Stop after finding one
            } catch (e) {
                console.log(`Failed ${modelName}: ${e.message.split('\n')[0]}`);
            }
        }
        console.log("No working models found.");
    } catch (error) {
        console.error("Error:", error);
    }
}

findWorkingModel();
