require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(bodyParser.urlencoded({ extended: false }));

// WhatsApp Webhook
app.post('/whatsapp', async (req, res) => {
    const incomingMsg = req.body.Body;
    const sender = req.body.From;

    console.log(`Message from ${sender}: ${incomingMsg}`);

    const twiml = new MessagingResponse();

    try {
        // Get response from Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(incomingMsg);
        const response = await result.response;
        const text = response.text();

        twiml.message(text);
    } catch (error) {
        console.error('Error generating response:', error);
        twiml.message(`Error: ${error.message || JSON.stringify(error)}`);
    }

    res.type('text/xml').send(twiml.toString());
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
