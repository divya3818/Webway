const Event = require('../Webway/Event');

const eventController = {
  getAllEvents: (req, res) => {
    Event.getAll((err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      res.json({ events: results });
    });
  },
  
  getUpcomingEvents: (req, res) => {
    Event.getUpcoming((err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      res.json({ events: results });
    });
  },
  
  getEvent: (req, res) => {
    const eventId = req.params.id;
    
    Event.getById(eventId, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.json({ event: results[0] });
    });
  },
  
  createEvent: (req, res) => {
    const eventData = {
      title: req.body.title,
      description: req.body.description,
      full_description: req.body.full_description,
      category: req.body.category,
      date: req.body.date,
      location: req.body.location,
      image_url: req.body.image_url,
      registration_link: req.body.registration_link,
      created_by: req.user.id
    };
    
    Event.create(eventData, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      res.status(201).json({ 
        message: 'Event created successfully', 
        event: { id: result.insertId, ...eventData } 
      });
    });
  },
  
  updateEvent: (req, res) => {
    const eventId = req.params.id;
    const eventData = {
      title: req.body.title,
      description: req.body.description,
      full_description: req.body.full_description,
      category: req.body.category,
      date: req.body.date,
      location: req.body.location,
      image_url: req.body.image_url,
      registration_link: req.body.registration_link
    };
    
    Event.update(eventId, eventData, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.json({ message: 'Event updated successfully' });
    });
  },
  
  deleteEvent: (req, res) => {
    const eventId = req.params.id;
    
    Event.delete(eventId, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.json({ message: 'Event deleted successfully' });
    });
  }
};

module.exports = eventController;