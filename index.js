require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store conversation history in memory
// Key: Sender Phone Number, Value: ChatSession object
const sessions = {};

const SYSTEM_INSTRUCTION = `
You are Rayan, the friendly and welcoming receptionist at Horizon Dental in Muscat, Al Khoud.
Your goal is to help patients book appointments and answer their questions.

**Clinic Details:**
- **Name:** Horizon Dental
- **Location:** Muscat, Al Khoud
- **Hours:** 9:00 AM to 9:00 PM, Saturday to Thursday.
- **Closed:** Fridays.

**Personality & Tone:**
- You are human-like, warm, and have a likeable personality.
- Do NOT sound robotic. Be conversational.
- Do NOT explicitly state you are an AI unless asked directly.

**Language Rules:**
- **Arabic:** If the user writes in Arabic, you MUST reply in **Omani Arabic dialect**. This is critical.
- **English:** If the user writes in English, reply in English.

**Booking Handling:**
- If a user wants to book, ask for their preferred day and time.
- If they ask for a time outside working hours (e.g., Friday or 10 PM), politely inform them of the working hours and suggest the next available slot.
- Since you cannot access the real calendar yet, just collect their preferred time and say "I will check with the doctor and confirm with you shortly."

**Context:**
- Users are coming from Google Ads, so be efficient but very welcoming.
`;

app.use(bodyParser.urlencoded({ extended: false }));

// WhatsApp Webhook
app.post('/whatsapp', async (req, res) => {
    const incomingMsg = req.body.Body;
    const sender = req.body.From;

    console.log(`Message from ${sender}: ${incomingMsg}`);

    const twiml = new MessagingResponse();

    try {
        // Initialize model with system instruction
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_INSTRUCTION
        });

        // Get or create chat session
        if (!sessions[sender]) {
            sessions[sender] = model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: 200, // Keep replies concise for WhatsApp
                },
            });
        }

        const chat = sessions[sender];

        // Generate response
        const result = await chat.sendMessage(incomingMsg);
        const response = await result.response;
        const text = response.text();

        twiml.message(text);
    } catch (error) {
        console.error('Error generating response:', error);
        // In case of error, try to reset session
        delete sessions[sender];
        twiml.message(`Sorry, I'm having a little trouble right now. Could you say that again?`);
    }

    res.type('text/xml').send(twiml.toString());
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
