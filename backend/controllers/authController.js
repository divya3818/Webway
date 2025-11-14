const User = require('../Webway/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const authController = {
  register: (req, res) => {
    const { fullname, email, password, role, year, branch } = req.body;
    
    // Validate email domain
    if (!email.endsWith('@cumminscollege.edu.in')) {
      return res.status(400).json({ message: 'Only @cumminscollege.edu.in emails are allowed' });
    }
    
    User.findByEmail(email, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
      }
      
      User.create({ fullname, email, password, role, year, branch }, (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Error creating user', error: err });
        }
        
        res.status(201).json({ 
          message: 'User created successfully', 
          user: { id: result.insertId, fullname, email, role, year, branch } 
        });
      });
    });
  },
  
  login: (req, res) => {
    const { email, password } = req.body;
    
    User.findByEmail(email, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      const user = results[0];
      
      User.comparePassword(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ message: 'Server error', error: err });
        }
        
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            fullname: user.fullname,
            email: user.email,
            role: user.role,
            year: user.year,
            branch: user.branch
          }
        });
      });
    });
  },
  
  getProfile: (req, res) => {
    const userId = req.user.id;
    
    User.findById(userId, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ user: results[0] });
    });
  },
  
  updateProfile: (req, res) => {
    const userId = req.user.id;
    const { fullname, year, branch } = req.body;
    
    User.update(userId, { fullname, year, branch }, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'Profile updated successfully' });
    });
  },
  
  deleteAccount: (req, res) => {
    const userId = req.user.id;
    
    User.delete(userId, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'Account deleted successfully' });
    });
  }
};

module.exports = authController;