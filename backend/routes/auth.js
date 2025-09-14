const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = 'your_jwt_secret_key'; // Change this in production

// Register
router.post('/register', async (req, res) => {
    try {
        const { fullname, email, password, role, year, branch } = req.body;
        
        // Validate email format
        if (!email.endsWith('@cumminscollege.edu.in')) {
            return res.status(400).json({ message: 'Please use a valid Cummins College email address.' });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists.' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create user
        const user = new User({
            fullname,
            email,
            password: hashedPassword,
            role,
            year: role === 'student' ? year : '',
            branch: role === 'student' ? branch : ''
        });
        
        await user.save();
        
        // Generate token
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        
        // Return user without password
        const userWithoutPassword = { ...user.toObject() };
        delete userWithoutPassword.password;
        
        res.status(201).json({
            message: 'User created successfully.',
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate email format
        if (!email.endsWith('@cumminscollege.edu.in')) {
            return res.status(400).json({ message: 'Please use your Cummins College email address.' });
        }
        
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }
        
        // Generate token
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        
        // Return user without password
        const userWithoutPassword = { ...user.toObject() };
        delete userWithoutPassword.password;
        
        res.json({
            message: 'Login successful.',
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;