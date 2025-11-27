require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Initialize Google Sheets
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1k-zYD8fGlyYNzFvZpVha7IeP_sZNd1ga-L5lLQ9D36U';

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
const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);

// Helper to get the sheet
async function getSheet() {
    await doc.loadInfo();
    return doc.sheetsByIndex[0];
}

// Tool 1: Check Availability
async function checkAvailability(date) {
    try {
        const sheet = await getSheet();
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
async function bookAppointment(name, phone, date, time) {
    try {
        const sheet = await getSheet();
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
async function getAppointment(phone) {
    try {
        const sheet = await getSheet();
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

// Tool 4: Cancel Appointment
async function cancelAppointment(phone, date) {
    try {
        const sheet = await getSheet();
        const rows = await sheet.getRows();

        // Find the appointment to delete
        // We match both phone AND date to be safe, though phone should be unique enough if they only have one per day.
        // Ideally we'd match time too, but let's assume one per day for now or just delete the first one found for that date.
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
async function modifyAppointment(phone, oldDate, newDate, newTime) {
    try {
        const sheet = await getSheet();
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

module.exports = {
    checkAvailability,
    bookAppointment,
    getAppointment,
    cancelAppointment,
    modifyAppointment
};
