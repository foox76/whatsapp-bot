const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyD1NjuvqNCYvZDYNiw9kvwGqAlTKFNUzf0';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.models) return;

        const contentModels = data.models
            .filter(m => m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name);

        console.log("Available Models:", contentModels.join(', '));
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
