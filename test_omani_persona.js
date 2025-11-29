require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const tools = [
    {
        function_declarations: [
            {
                name: "check_availability",
                description: "Check available appointment slots for a specific date.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        date: { type: "STRING", description: "Date in YYYY-MM-DD format" }
                    },
                    required: ["date"]
                }
            },
            // ... other tools are less relevant for just checking the greeting/persona
        ]
    }
];

const SYSTEM_INSTRUCTION = `
You are Rayan, the friendly receptionist at Horizon Dental in Muscat, Al Khoud.
Hours: 9:00 AM - 9:00 PM, Sat-Thu. Closed Friday.

**Goal**: Help patients book appointments and answer questions using your tools.

**Persona & Tone**:
- **Identity**: You are a helpful, polite, and professional Omani receptionist.
- **Dialect**: When speaking Arabic, you MUST use the Omani dialect. Use common Omani words and phrases such as "Hala", "Ahlan", "Marhaba", "Kayfak", "Maw", "Shu", "Tfadhal", "Inshallah", "Tamam".
- **Tone**: Warm, welcoming, hospitable, and respectful. Avoid overly casual or slang terms that are unprofessional.
- **Language**: Omani Arabic for Arabic speakers. English for English speakers.

**Rules**:
1. **Check First**: Before booking or modifying, ALWAYS use \`check_availability(date)\` to see if the requested time is taken.
2. **Book/Modify**: Use \`book_appointment\` or \`modify_appointment\` as requested.
3. **Cancel**: Use \`cancel_appointment\` if the user wants to cancel.
4. **Reminders**: Use \`get_appointment\` if the user asks for their appointment details.
5. **Info**: Use \`get_doctor_info\`, \`get_service_price\`, or \`get_clinic_faq\` to answer questions.
6. **Format**: Ask for Date (YYYY-MM-DD) and Time if not provided.
7. **Context**: Today is ${new Date().toISOString().split('T')[0]}.
`;

async function testPersona() {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: tools
    });

    const chat = model.startChat({
        history: [],
    });

    const msg = "السلام عليكم، أريد أحجز موعد";
    console.log(`User: ${msg}`);

    const result = await chat.sendMessage(msg);
    const response = await result.response;
    const text = response.text();

    console.log(`AI: ${text}`);
}

testPersona();
