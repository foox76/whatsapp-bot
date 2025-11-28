require('dotenv').config();
const cron = require('node-cron');
const twilio = require('twilio');
const { getAppointmentsByDate } = require('./tools');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID; // Optional, or use 'from' number

// Helper to send WhatsApp message
async function sendWhatsApp(to, body) {
    try {
        // Ensure 'to' number has 'whatsapp:' prefix
        const toNum = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        const fromNum = 'whatsapp:+14155238886'; // Sandbox number or your sender

        await client.messages.create({
            body: body,
            from: fromNum,
            to: toNum
        });
        console.log(`Message sent to ${to}`);
    } catch (error) {
        console.error(`Failed to send message to ${to}:`, error);
    }
}

// 1. Reminders (Send at 8:00 PM for tomorrow's appointments)
async function sendReminders() {
    console.log("Running Reminder Job...");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const appointments = await getAppointmentsByDate(dateStr);

    for (const appt of appointments) {
        const msg = `Hala ${appt.name}! 🌟\nJust a friendly reminder about your appointment with Horizon Dental tomorrow at ${appt.time}.\nWe look forward to seeing you! Inshallah.`;
        await sendWhatsApp(appt.phone, msg);
    }
}

// 2. Follow-ups (Send at 10:00 AM for yesterday's appointments)
async function sendFollowUps() {
    console.log("Running Follow-up Job...");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const appointments = await getAppointmentsByDate(dateStr);

    for (const appt of appointments) {
        const msg = `Ahlan ${appt.name}! 👋\nWe hope your visit yesterday went well. If you have any questions or need further assistance, please let us know. Take care!`;
        await sendWhatsApp(appt.phone, msg);
    }
}

function startScheduler() {
    // Schedule Reminders: Every day at 20:00 (8 PM)
    cron.schedule('0 20 * * *', () => {
        sendReminders();
    });

    // Schedule Follow-ups: Every day at 10:00 (10 AM)
    cron.schedule('0 10 * * *', () => {
        sendFollowUps();
    });

    console.log("Scheduler started: Reminders at 8 PM, Follow-ups at 10 AM.");
}

module.exports = { startScheduler, sendReminders, sendFollowUps };
