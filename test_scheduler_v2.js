const mongoose = require('mongoose');
const { sendReminders, sendFollowUps } = require('./scheduler');
const connectDB = require('./db');

async function testScheduler() {
    console.log("Connecting to DB...");
    await connectDB();

    console.log("\n--- Testing Reminders ---");
    await sendReminders();

    console.log("\n--- Testing Follow-ups ---");
    await sendFollowUps();

    console.log("\nDone.");
    process.exit(0);
}

testScheduler();
