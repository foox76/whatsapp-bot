require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

let serviceAccountAuth;
if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
} else {
    try {
        const serviceAccount = require('./service_account.json');
        serviceAccountAuth = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    } catch (err) {
        console.error("Failed to load credentials from env or service_account.json");
    }
}

// Helper to get a specific sheet by title, creating it if it doesn't exist
async function getSheet(sheetId, title, headerValues) {
    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();
    let sheet = doc.sheetsByTitle[title];
    if (!sheet) {
        sheet = await doc.addSheet({ title: title, headerValues: headerValues });
    }
    return sheet;
}

// --- APPOINTMENTS ---
async function checkAvailability(sheetId, date) {
    try {
        const sheet = await getSheet(sheetId, 'Appointments', ['Name', 'Phone', 'Date', 'Time', 'Status']);
        const rows = await sheet.getRows();

        const bookedSlots = rows
            .filter(row => row.get('Date') === date)
            .map(row => row.get('Time'));

        return {
            date: date,
            booked_slots: bookedSlots,
            message: bookedSlots.length > 0 ? `Booked slots on ${date}: ${bookedSlots.join(', ')}` : `No bookings found for ${date}. All slots open.`
        };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { error: "Failed to check availability." };
    }
}

// Tool 2: Book Appointment
async function bookAppointment(sheetId, name, phone, date, time) {
    try {
        const sheet = await getSheet(sheetId, 'Appointments', ['Name', 'Phone', 'Date', 'Time', 'Status']);
        await sheet.addRow({
            Name: name,
            Phone: phone,
            Date: date,
            Time: time,
            Status: 'Confirmed'
        });
        return { success: true, message: `Appointment booked for ${name} on ${date} at ${time}.` };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { error: "Failed to book appointment." };
    }
}

// Tool 3: Get Appointment (Reminder)
async function getAppointment(sheetId, phone) {
    try {
        const sheet = await getSheet(sheetId, 'Appointments', ['Name', 'Phone', 'Date', 'Time', 'Status']);
        const rows = await sheet.getRows();

        // STRICT FILTERING by phone number for privacy
        const appointments = rows
            .filter(row => row.get('Phone') === phone)
            .map(row => ({
                date: row.get('Date'),
                time: row.get('Time'),
                status: row.get('Status')
            }));

        if (appointments.length === 0) {
            return { message: "No appointments found for this phone number." };
        }

        return { appointments: appointments };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { error: "Failed to retrieve appointments." };
    }
}

async function getAppointmentsByDate(sheetId, date) {
    try {
        const sheet = await getSheet(sheetId, 'Appointments', ['Name', 'Phone', 'Date', 'Time', 'Status']);
        const rows = await sheet.getRows();

        const appointments = rows
            .filter(row => row.get('Date') === date)
            .map(row => ({
                name: row.get('Name'),
                phone: row.get('Phone'),
                time: row.get('Time'),
                status: row.get('Status')
            }));

        return appointments;
    } catch (error) {
        console.error("Sheet Error:", error);
        return [];
    }
}

// Tool 4: Cancel Appointment
async function cancelAppointment(sheetId, phone, date) {
    try {
        const sheet = await getSheet(sheetId, 'Appointments', ['Name', 'Phone', 'Date', 'Time', 'Status']);
        const rows = await sheet.getRows();

        const rowToDelete = rows.find(row => row.get('Phone') === phone && row.get('Date') === date);

        if (!rowToDelete) {
            return { error: "Appointment not found." };
        }

        await rowToDelete.delete();
        return { success: true, message: `Appointment on ${date} has been cancelled.` };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { error: "Failed to cancel appointment." };
    }
}

// Tool 5: Modify Appointment
async function modifyAppointment(sheetId, phone, oldDate, newDate, newTime) {
    try {
        const sheet = await getSheet(sheetId, 'Appointments', ['Name', 'Phone', 'Date', 'Time', 'Status']);
        const rows = await sheet.getRows();

        // 1. Check if new slot is available
        const isTaken = rows.some(row => row.get('Date') === newDate && row.get('Time') === newTime);
        if (isTaken) {
            return { error: `The slot on ${newDate} at ${newTime} is already taken.` };
        }

        // 2. Find the old appointment
        const rowToUpdate = rows.find(row => row.get('Phone') === phone && row.get('Date') === oldDate);

        if (!rowToUpdate) {
            return { error: "Original appointment not found." };
        }

        // 3. Update
        rowToUpdate.set('Date', newDate);
        rowToUpdate.set('Time', newTime);
        await rowToUpdate.save();

        return { success: true, message: `Appointment rescheduled to ${newDate} at ${newTime}.` };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { error: "Failed to modify appointment." };
    }
}

// --- KNOWLEDGE BASE (CRUD) ---

// 1. DOCTORS
async function getDoctors(sheetId) {
    try {
        const sheet = await getSheet(sheetId, 'Doctors', ['Name', 'Specialty', 'Availability']);
        const rows = await sheet.getRows();
        const doctors = rows.map(row => ({
            name: row.get('Name'),
            specialty: row.get('Specialty'),
            availability: row.get('Availability')
        }));
        return { doctors: doctors };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { doctors: [], error: "Failed to retrieve doctors." };
    }
}

async function addDoctor(sheetId, name, specialty, availability) {
    try {
        const sheet = await getSheet(sheetId, 'Doctors', ['Name', 'Specialty', 'Availability']);
        await sheet.addRow({ Name: name, Specialty: specialty, Availability: availability });
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

async function deleteDoctor(sheetId, name) {
    try {
        const sheet = await getSheet(sheetId, 'Doctors', ['Name', 'Specialty', 'Availability']);
        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('Name') === name);
        if (row) await row.delete();
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

// 2. SERVICES
async function getServices(sheetId) {
    try {
        const sheet = await getSheet(sheetId, 'Services', ['Service', 'Price', 'Description']);
        const rows = await sheet.getRows();
        const services = rows.map(row => ({
            service: row.get('Service'),
            price: row.get('Price'),
            description: row.get('Description')
        }));
        return { services: services };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { services: [], error: "Failed to retrieve services." };
    }
}

async function addService(sheetId, service, price, description) {
    try {
        const sheet = await getSheet(sheetId, 'Services', ['Service', 'Price', 'Description']);
        await sheet.addRow({ Service: service, Price: price, Description: description });
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

async function deleteService(sheetId, serviceName) {
    try {
        const sheet = await getSheet(sheetId, 'Services', ['Service', 'Price', 'Description']);
        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('Service') === serviceName);
        if (row) await row.delete();
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

// 3. FAQ
async function getFAQ(sheetId) {
    try {
        const sheet = await getSheet(sheetId, 'FAQ', ['Question', 'Answer']);
        const rows = await sheet.getRows();
        const faq = rows.map(row => ({
            question: row.get('Question'),
            answer: row.get('Answer')
        }));
        return { faq: faq };
    } catch (error) {
        console.error("Sheet Error:", error);
        return { faq: [], error: "Failed to retrieve FAQ." };
    }
}

async function addFAQ(sheetId, question, answer) {
    try {
        const sheet = await getSheet(sheetId, 'FAQ', ['Question', 'Answer']);
        await sheet.addRow({ Question: question, Answer: answer });
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

async function deleteFAQ(sheetId, question) {
    try {
        const sheet = await getSheet(sheetId, 'FAQ', ['Question', 'Answer']);
        const rows = await sheet.getRows();
        const row = rows.find(r => r.get('Question') === question);
        if (row) await row.delete();
        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = {
    checkAvailability,
    bookAppointment,
    getAppointment,
    getAppointmentsByDate,
    cancelAppointment,
    modifyAppointment,
    // KB
    getDoctors, addDoctor, deleteDoctor,
    getServices, addService, deleteService,
    getFAQ, addFAQ, deleteFAQ
};
