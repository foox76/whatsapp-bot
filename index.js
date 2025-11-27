require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const {
    checkAvailability,
    bookAppointment,
    getAppointment,
    cancelAppointment,
    modifyAppointment
} = require('./tools');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store conversation history in memory
const sessions = {};

// --- TOOLS ---
// Tools are now imported from ./tools.js

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
            },
            {
                name: "get_appointment",
                description: "Get upcoming appointments for a patient to send reminders or check details.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        phone: { type: "STRING", description: "Patient's phone number" }
                    },
                    required: ["phone"]
                }
            },
            {
                name: "cancel_appointment",
                description: "Cancel an existing appointment.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        phone: { type: "STRING", description: "Patient's phone number" },
                        date: { type: "STRING", description: "Date of the appointment to cancel (YYYY-MM-DD)" }
                    },
                    required: ["phone", "date"]
                }
            },
            {
                name: "modify_appointment",
                description: "Modify or reschedule an existing appointment.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        phone: { type: "STRING", description: "Patient's phone number" },
                        oldDate: { type: "STRING", description: "Original date of the appointment (YYYY-MM-DD)" },
                        newDate: { type: "STRING", description: "New date for the appointment (YYYY-MM-DD)" },
                        newTime: { type: "STRING", description: "New time for the appointment" }
                    },
                    required: ["phone", "oldDate", "newDate", "newTime"]
                }
            }
        ]
    }
];

const SYSTEM_INSTRUCTION = `
You are Rayan, the friendly receptionist at Horizon Dental in Muscat, Al Khoud.
Hours: 9:00 AM - 9:00 PM, Sat-Thu. Closed Friday.

**Goal**: Help patients book, modify, or cancel appointments using your tools.

**Rules**:
1. **Check First**: Before booking or modifying, ALWAYS use \`check_availability(date)\` to see if the requested time is taken.
2. **Book/Modify**: Use \`book_appointment\` or \`modify_appointment\` as requested.
3. **Cancel**: Use \`cancel_appointment\` if the user wants to cancel.
4. **Reminders**: Use \`get_appointment\` if the user asks for their appointment details.
5. **Format**: Ask for Date (YYYY-MM-DD) and Time if not provided.
6. **Language**: Omani Arabic for Arabic speakers. English for English speakers.
7. **Context**: Today is ${new Date().toISOString().split('T')[0]}.
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
            let apiResponse;

            if (call.name === "check_availability") {
                apiResponse = await checkAvailability(call.args.date);
            } else if (call.name === "book_appointment") {
                apiResponse = await bookAppointment(call.args.name, call.args.phone, call.args.date, call.args.time);
            } else if (call.name === "get_appointment") {
                apiResponse = await getAppointment(call.args.phone);
            } else if (call.name === "cancel_appointment") {
                apiResponse = await cancelAppointment(call.args.phone, call.args.date);
            } else if (call.name === "modify_appointment") {
                apiResponse = await modifyAppointment(call.args.phone, call.args.oldDate, call.args.newDate, call.args.newTime);
            }

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
