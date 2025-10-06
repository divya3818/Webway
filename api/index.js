const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ccoew_events';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Your existing schemas and models
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'student', 'faculty'], required: true },
    year: { type: String, enum: ['FE', 'SE', 'TE', 'BE', ''], default: '' },
    branch: { type: String, enum: ['Computer', 'IT', 'Mechanical', 'Electrical', 'ENTC', ''], default: '' },
    bio: { type: String, default: '' }
});

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

const registrationLinkSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    url: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const RegistrationLink = mongoose.model('RegistrationLink', registrationLinkSchema);

// Auth Middleware
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// Admin Middleware
const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Include all your API routes here (register, login, events, etc.)
app.post('/api/register', async (req, res) => {
    try {
        const { fullname, email, password, role, year, branch } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const user = new User({
            fullname,
            email,
            password: hashedPassword,
            role,
            year: role === 'student' ? year : '',
            branch: role === 'student' ? branch : ''
        });
        
        await user.save();
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        
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

// Add all your other routes here (login, events, etc.)

// Serve frontend files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/register.html'));
});

// Export the app as a serverless function
module.exports = app;