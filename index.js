require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Google Sheets
// Note: We use Environment Variables for Render
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1k-zYD8fGlyYNzFvZpVha7IeP_sZNd1ga-L5lLQ9D36U'; // Fallback for local testing if needed
const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store conversation history in memory
const sessions = {};

// --- TOOLS ---

// Tool 1: Check Availability
async function checkAvailability(date) {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0]; // Assume first sheet
        const rows = await sheet.getRows();

        const bookedSlots = rows
            .filter(row => row.get('Date') === date)
            .map(row => row.get('Time'));

        return {
            date: date,
            booked_slots: bookedSlots,
            message: bookedSlots.length > 0 ? `Booked slots on ${date}: ${bookedSlots.join(', ')}` : `No bookings found for ${date}. All slots open.`
        };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { error: "Failed to check availability." };
    }
}

// Tool 2: Book Appointment
async function bookAppointment(name, phone, date, time) {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.addRow({
            Name: name,
            Phone: phone,
            Date: date,
            Time: time,
            Status: 'Confirmed'
        });
        return { success: true, message: `Appointment booked for ${name} on ${date} at ${time}.` };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { error: "Failed to book appointment." };
    }
}

// Tool Definitions for Gemini
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
            {
                name: "book_appointment",
                description: "Book a new appointment for a patient.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Patient's name" },
                        phone: { type: "STRING", description: "Patient's phone number" },
                        date: { type: "STRING", description: "Date in YYYY-MM-DD format" },
                        time: { type: "STRING", description: "Time of appointment (e.g., 10:00 AM)" }
                    },
                    required: ["name", "phone", "date", "time"]
                }
            }
        ]
    }
];

const SYSTEM_INSTRUCTION = `
You are Rayan, the friendly receptionist at Horizon Dental in Muscat, Al Khoud.
Hours: 9:00 AM - 9:00 PM, Sat-Thu. Closed Friday.

**Goal**: Help patients book appointments using your tools.

**Rules**:
1. **Check First**: Before booking, ALWAYS use \`check_availability(date)\` to see if the requested time is taken.
2. **Book Second**: If the slot is free, use \`book_appointment\` to save it.
3. **Format**: Ask for Date (YYYY-MM-DD) and Time if not provided.
4. **Language**: Omani Arabic for Arabic speakers. English for English speakers.
5. **Context**: Today is ${new Date().toISOString().split('T')[0]}.
`;

app.use(bodyParser.urlencoded({ extended: false }));

// WhatsApp Webhook
app.post('/whatsapp', async (req, res) => {
    const incomingMsg = req.body.Body;
    const sender = req.body.From;

    console.log(`Message from ${sender}: ${incomingMsg}`);

    const twiml = new MessagingResponse();

    try {
        // Get model with tools
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: tools
        });

        // Start/Get Chat
        if (!sessions[sender]) {
            sessions[sender] = model.startChat({
                history: [],
            });
        }
        const chat = sessions[sender];

        // Send message
        const result = await chat.sendMessage(incomingMsg);
        const response = await result.response;

        // Handle Function Calls
        const functionCalls = response.functionCalls();
        let text = "";

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const apiResponse = call.name === "check_availability"
                ? await checkAvailability(call.args.date)
                : await bookAppointment(call.args.name, call.args.phone, call.args.date, call.args.time);

            // Send API result back to model to get final natural language response
            const result2 = await chat.sendMessage([
                {
                    functionResponse: {
                        name: call.name,
                        response: apiResponse
                    }
                }
            ]);
            text = result2.response.text();
        } else {
            text = response.text();
        }

        twiml.message(text);
    } catch (error) {
        console.error('Error:', error);
        delete sessions[sender];
        twiml.message(`Sorry, I encountered an error. Please try again.`);
    }

    res.type('text/xml').send(twiml.toString());
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
