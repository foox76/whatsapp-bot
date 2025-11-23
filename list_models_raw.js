const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyD1NjuvqNCYvZDYNiw9kvwGqAlTKFNUzf0';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Models:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
