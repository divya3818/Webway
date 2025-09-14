const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    description: { type: String, required: true },
    full_description: { type: String, required: true },
    image_url: { type: String, default: '' },
    registration_link: { type: String, default: '' }
});

module.exports = mongoose.model('Event', eventSchema);