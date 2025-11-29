require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('./models/Business');
const connectDB = require('./db');

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

async function seedAndTest() {
    await connectDB();

    // 1. Create a Test Business
    const testPhone = 'whatsapp:+14155238886'; // Twilio Sandbox Number
    const sheetId = '1k-zYD8fGlyYNzFvZpVha7IeP_sZNd1ga-L5lLQ9D36U'; // Original Sheet ID

    try {
        await Business.deleteMany({}); // Clear old data

        const business = await Business.create({
            phoneNumber: testPhone,
            name: 'Horizon Dental',
            systemInstruction: SYSTEM_INSTRUCTION,
            sheetId: sheetId,
            timezone: 'Asia/Muscat'
        });

        console.log('Test Business Created:', business.name);

        // 2. Verify we can find it
        const found = await Business.findOne({ phoneNumber: testPhone });
        if (found) {
            console.log('Verification Successful: Business found in DB.');
        } else {
            console.error('Verification Failed: Business not found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.connection.close();
    }
}

seedAndTest();
