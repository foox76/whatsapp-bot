const tools = require('./tools');

async function runTests() {
    console.log("--- Starting KB Tests ---");

    // 1. Doctors
    console.log("\nAdding Doctor...");
    await tools.addDoctor('Dr. Test', 'Tester', 'Mon-Fri');
    console.log("Getting Doctors...");
    const docs = await tools.getDoctors();
    console.log(docs);
    console.log("Deleting Doctor...");
    await tools.deleteDoctor('Dr. Test');

    // 2. Services
    console.log("\nAdding Service...");
    await tools.addService('Test Service', '100 OMR', 'Testing');
    console.log("Getting Services...");
    const servs = await tools.getServices();
    console.log(servs);
    console.log("Deleting Service...");
    await tools.deleteService('Test Service');

    // 3. FAQ
    console.log("\nAdding FAQ...");
    await tools.addFAQ('Test Q', 'Test A');
    console.log("Getting FAQ...");
    const faqs = await tools.getFAQ();
    console.log(faqs);
    console.log("Deleting FAQ...");
    await tools.deleteFAQ('Test Q');

    console.log("\n--- Tests Completed ---");
}

runTests();
