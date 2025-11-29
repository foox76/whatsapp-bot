require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const connectDB = require('./db');
const Business = require('./models/Business');
const Admin = require('./models/Admin');
const authMiddleware = require('./middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
    checkAvailability,
    bookAppointment,
    getAppointment,
    cancelAppointment,
    modifyAppointment,
    // KB
    getDoctors, addDoctor, deleteDoctor,
    getServices, addService, deleteService,
    getFAQ, addFAQ, deleteFAQ
} = require('./tools');
const { startScheduler } = require('./scheduler');

const app = express();
const port = process.env.PORT || 3000;

// Connect to Database
connectDB().then(async () => {
    // Seed Admin User
    try {
        const adminExists = await Admin.findOne({ username: 'admin' });
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
            const hashedPassword = await bcrypt.hash(defaultPassword, salt);
            const admin = new Admin({
                username: 'admin',
                password: hashedPassword
            });
            await admin.save();
            console.log('Default admin user created');
        }
    } catch (err) {
        console.error('Error seeding admin:', err);
    }
});

// Serve static files (Dashboard)
app.use(express.static('public'));
app.use(bodyParser.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store conversation history in memory
const sessions = {};

// Tool Definitions for Gemini (Dynamic wrapper needed later, but definitions are static)
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
            },
            // Knowledge Base Tools
            {
                name: "get_doctor_info",
                description: "Get information about doctors and their specialties.",
                parameters: { type: "OBJECT", properties: {}, required: [] }
            },
            {
                name: "get_service_price",
                description: "Get price list and description of services.",
                parameters: { type: "OBJECT", properties: {}, required: [] }
            },
            {
                name: "get_clinic_faq",
                description: "Get answers to common questions (insurance, parking, etc).",
                parameters: { type: "OBJECT", properties: {}, required: [] }
            }
        ]
    }
];

// --- AUTH ENDPOINTS ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        let admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: admin.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// --- API ENDPOINTS FOR DASHBOARD (Needs Auth & Business Context in future) ---
// For now, these will break or need to be updated to accept a business ID.
// Disabling them temporarily or mocking them to prevent crash until Dashboard phase.
app.get('/api/doctors', async (req, res) => res.json([]));

// --- BUSINESS API ENDPOINTS ---

// Get all businesses (Protected)
app.get('/api/businesses', authMiddleware, async (req, res) => {
    try {
        const businesses = await Business.find();
        res.json(businesses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a business (Protected)
app.post('/api/businesses', authMiddleware, async (req, res) => {
    const business = new Business({
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        sheetId: req.body.sheetId,
        systemInstruction: req.body.systemInstruction,
        timezone: req.body.timezone || 'Asia/Muscat'
    });

    try {
        const newBusiness = await business.save();
        res.status(201).json(newBusiness);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a business (Protected)
app.put('/api/businesses/:id', authMiddleware, async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) return res.status(404).json({ message: 'Business not found' });

        if (req.body.name) business.name = req.body.name;
        if (req.body.phoneNumber) business.phoneNumber = req.body.phoneNumber;
        if (req.body.sheetId) business.sheetId = req.body.sheetId;
        if (req.body.systemInstruction) business.systemInstruction = req.body.systemInstruction;
        if (req.body.timezone) business.timezone = req.body.timezone;

        const updatedBusiness = await business.save();
        res.json(updatedBusiness);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a business (Protected)
app.delete('/api/businesses/:id', authMiddleware, async (req, res) => {
    try {
        const business = await Business.findById(req.params.id);
        if (!business) return res.status(404).json({ message: 'Business not found' });

        await business.deleteOne();
        res.json({ message: 'Business deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.use(bodyParser.urlencoded({ extended: false }));

// WhatsApp Webhook
app.post('/whatsapp', async (req, res) => {
    const incomingMsg = req.body.Body;
    const sender = req.body.From;
    const to = req.body.To; // The Twilio number receiving the message (e.g., whatsapp:+14155238886)

    console.log(`Message from ${sender} to ${to}: ${incomingMsg}`);

    const twiml = new MessagingResponse();

    try {
        // 1. Identify Business
        // In Sandbox, 'To' is always the sandbox number. In prod, it's the business number.
        // For testing, we can fallback to a default business if not found, or use a specific test number.
        // Let's try to find by phone number, if not found, check if it's the sandbox number and use a default.
        let business = await Business.findOne({ phoneNumber: to });

        if (!business) {
            // Fallback for Sandbox/Testing: Get the first business in DB
            business = await Business.findOne({});
            if (!business) {
                twiml.message("System Error: No business configured.");
                res.type('text/xml').send(twiml.toString());
                return;
            }
        }

        const sheetId = business.sheetId;
        const systemInstruction = business.systemInstruction;

        // Get model with tools
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction,
            tools: tools
        });

        // Start/Get Chat
        const sessionKey = `${business._id}:${sender}`; // Unique session per business per user
        if (!sessions[sessionKey]) {
            sessions[sessionKey] = model.startChat({
                history: [],
            });
        }
        const chat = sessions[sessionKey];

        // Send message
        const result = await chat.sendMessage(incomingMsg);
        const response = await result.response;

        // Handle Function Calls
        const functionCalls = response.functionCalls();
        let text = "";

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            let apiResponse;

            // Pass sheetId to all tools
            if (call.name === "check_availability") {
                apiResponse = await checkAvailability(sheetId, call.args.date);
            } else if (call.name === "book_appointment") {
                apiResponse = await bookAppointment(sheetId, call.args.name, call.args.phone, call.args.date, call.args.time);
            } else if (call.name === "get_appointment") {
                apiResponse = await getAppointment(sheetId, call.args.phone);
            } else if (call.name === "cancel_appointment") {
                apiResponse = await cancelAppointment(sheetId, call.args.phone, call.args.date);
            } else if (call.name === "modify_appointment") {
                apiResponse = await modifyAppointment(sheetId, call.args.phone, call.args.oldDate, call.args.newDate, call.args.newTime);
            } else if (call.name === "get_doctor_info") {
                apiResponse = await getDoctors(sheetId);
            } else if (call.name === "get_service_price") {
                apiResponse = await getServices(sheetId);
            } else if (call.name === "get_clinic_faq") {
                apiResponse = await getFAQ(sheetId);
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
        // delete sessions[sender]; // Cleanup might need adjustment
        twiml.message(`Sorry, I encountered an error. Please try again.`);
    }

    res.type('text/xml').send(twiml.toString());
});

// Start Scheduler
startScheduler();

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
