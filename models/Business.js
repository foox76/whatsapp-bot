const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    systemInstruction: {
        type: String,
        required: true
    },
    sheetId: {
        type: String,
        required: true
    },
    timezone: {
        type: String,
        default: 'Asia/Muscat'
    }
});

module.exports = mongoose.model('Business', BusinessSchema);
