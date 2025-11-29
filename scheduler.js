require('dotenv').config();
const cron = require('node-cron');
const twilio = require('twilio');
const Business = require('./models/Business');
const { getAppointmentsByDate } = require('./tools');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

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

    try {
        const businesses = await Business.find();
        console.log(`Processing reminders for ${businesses.length} businesses.`);

        for (const business of businesses) {
            try {
                const appointments = await getAppointmentsByDate(business.sheetId, dateStr);

                for (const appt of appointments) {
                    const msg = `Hala ${appt.name}! 🌟\nJust a friendly reminder about your appointment with ${business.name} tomorrow at ${appt.time}.\nWe look forward to seeing you! Inshallah.`;
                    await sendWhatsApp(appt.phone, msg);
                }
            } catch (err) {
                console.error(`Error processing reminders for business ${business.name}:`, err);
            }
        }
    } catch (err) {
        console.error("Error fetching businesses for reminders:", err);
    }
}

// 2. Follow-ups (Send at 10:00 AM for yesterday's appointments)
async function sendFollowUps() {
    console.log("Running Follow-up Job...");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    try {
        const businesses = await Business.find();
        console.log(`Processing follow-ups for ${businesses.length} businesses.`);

        for (const business of businesses) {
            try {
                const appointments = await getAppointmentsByDate(business.sheetId, dateStr);

                for (const appt of appointments) {
                    const msg = `Ahlan ${appt.name}! 👋\nWe hope your visit to ${business.name} yesterday went well. If you have any questions or need further assistance, please let us know. Take care!`;
                    await sendWhatsApp(appt.phone, msg);
                }
            } catch (err) {
                console.error(`Error processing follow-ups for business ${business.name}:`, err);
            }
        }
    } catch (err) {
        console.error("Error fetching businesses for follow-ups:", err);
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
