const mongoose = require('mongoose');

const registrationLinkSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    url: { type: String, required: true }
});

module.exports = mongoose.model('RegistrationLink', registrationLinkSchema);