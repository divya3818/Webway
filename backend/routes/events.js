const express = require('express');
const Event = require('../models/Event');
const RegistrationLink = require('../models/RegistrationLink');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single event
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create event (admin only)
router.post('/', auth, adminAuth, async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.status(201).json({ message: 'Event created successfully.', event });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update event (admin only)
router.put('/:id', auth, adminAuth, async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        res.json({ message: 'Event updated successfully.', event });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete event (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // Also delete related registration links
        await RegistrationLink.deleteMany({ eventId: req.params.id });
        
        res.json({ message: 'Event deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;