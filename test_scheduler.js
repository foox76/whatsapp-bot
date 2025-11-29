require('dotenv').config();
const { sendReminders, sendFollowUps } = require('./scheduler');

async function test() {
    console.log("Testing Reminders...");
    // Note: This will only send messages if there are appointments for "tomorrow" in the sheet.
    // For a real test, I would need to mock the date or insert a dummy appointment.
    // However, since I can't easily mock the date inside the imported module without dependency injection,
    // I will just run the function and check for errors. 
    // Ideally, I'd insert a test row first.

    try {
        await sendReminders();
        console.log("Reminders job finished.");
    } catch (err) {
        console.error("Reminders job failed:", err);
    }

    console.log("\nTesting Follow-ups...");
    try {
        await sendFollowUps();
        console.log("Follow-ups job finished.");
    } catch (err) {
        console.error("Follow-ups job failed:", err);
    }
}

test();
