const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyD1NjuvqNCYvZDYNiw9kvwGqAlTKFNUzf0';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.models) {
            console.log("No models found or error:", data);
            return;
        }
        const geminiModels = data.models.filter(m => m.name.includes('gemini'));
        console.log("Gemini Models Available:");
        geminiModels.forEach(m => {
            console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods})`);
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
