const tools = require('./tools');

async function runTests() {
    const testPhone = '99999999';
    const testDate = '2025-12-25';
    const testTime = '10:00 AM';
    const newDate = '2025-12-26';
    const newTime = '11:00 AM';

    console.log("--- Starting Tests ---");
    console.log("GOOGLE_CLIENT_EMAIL:", process.env.GOOGLE_CLIENT_EMAIL ? "Set" : "Not Set");
    console.log("GOOGLE_PRIVATE_KEY:", process.env.GOOGLE_PRIVATE_KEY ? "Set" : "Not Set");
    console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID ? "Set" : "Not Set");

    // 1. Check Availability
    console.log("\n1. Checking Availability...");
    const avail = await tools.checkAvailability(testDate);
    console.log("Result:", avail);

    // 2. Book Appointment
    console.log("\n2. Booking Appointment...");
    const book = await tools.bookAppointment('Test User', testPhone, testDate, testTime);
    console.log("Result:", book);

    // 3. Get Appointment
    console.log("\n3. Getting Appointment...");
    const get = await tools.getAppointment(testPhone);
    console.log("Result:", JSON.stringify(get, null, 2));

    // 4. Modify Appointment
    console.log("\n4. Modifying Appointment...");
    const modify = await tools.modifyAppointment(testPhone, testDate, newDate, newTime);
    console.log("Result:", modify);

    // 5. Verify Modification (Get again)
    console.log("\n5. Verifying Modification...");
    const get2 = await tools.getAppointment(testPhone);
    console.log("Result:", JSON.stringify(get2, null, 2));

    // 6. Cancel Appointment
    console.log("\n6. Canceling Appointment...");
    // Note: We need to cancel the NEW date/time
    const cancel = await tools.cancelAppointment(testPhone, newDate);
    console.log("Result:", cancel);

    // 7. Verify Cancellation
    console.log("\n7. Verifying Cancellation...");
    const get3 = await tools.getAppointment(testPhone);
    console.log("Result:", JSON.stringify(get3, null, 2));

    console.log("\n--- Tests Completed ---");
}

runTests();
