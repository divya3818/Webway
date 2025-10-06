const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Use environment variable for JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_development';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from multiple directories to fix image issues
app.use(express.static(path.join(__dirname, '..'))); // Serves from Webway/
app.use('/images', express.static(path.join(__dirname, '../frontend/images'))); // For /images paths
app.use('/frontend/images', express.static(path.join(__dirname, '../frontend/images'))); // For /frontend/images paths
app.use('/Webway/frontend/images', express.static(path.join(__dirname, '../frontend/images'))); // For current HTML paths

// MongoDB Connection with better error handling
mongoose.connect('mongodb://localhost:27017/ccoew_events', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if cannot connect to database
});

// User Schema with validation
const userSchema = new mongoose.Schema({
    fullname: { 
        type: String, 
        required: true,
        trim: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    role: { 
        type: String, 
        enum: ['admin', 'student', 'faculty'], 
        required: true 
    },
    year: { 
        type: String, 
        enum: ['FE', 'SE', 'TE', 'BE', ''], 
        default: '' 
    },
    branch: { 
        type: String, 
        enum: ['Computer', 'IT', 'Mechanical', 'Electrical', 'ENTC', ''], 
        default: '' 
    },
    bio: { 
        type: String, 
        default: '',
        maxlength: 500 
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Event Schema with validation
const eventSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true,
        trim: true 
    },
    category: { 
        type: String, 
        required: true,
        trim: true 
    },
    date: { 
        type: Date, 
        required: true 
    },
    location: { 
        type: String, 
        required: true,
        trim: true 
    },
    description: { 
        type: String, 
        required: true,
        trim: true 
    },
    full_description: { 
        type: String, 
        required: true,
        trim: true 
    },
    image_url: { 
        type: String, 
        default: '' 
    },
    registration_link: { 
        type: String, 
        default: '' 
    }
}, {
    timestamps: true
});

// Registration Link Schema
const registrationLinkSchema = new mongoose.Schema({
    eventId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Event', 
        required: true 
    },
    url: { 
        type: String, 
        required: true,
        trim: true 
    }
}, {
    timestamps: true
});

// Models
const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const RegistrationLink = mongoose.model('RegistrationLink', registrationLinkSchema);

// Auth Middleware with better error handling
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
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired.' });
        }
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};

// Admin Middleware
const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Input validation middleware
const validateRegister = (req, res, next) => {
    const { fullname, email, password, role, year, branch } = req.body;
    
    if (!fullname || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    
    if (role === 'student' && (!year || !branch)) {
        return res.status(400).json({ message: 'Year and branch are required for students.' });
    }
    
    next();
};

// Debug endpoint to check image serving
app.get('/api/debug-images', (req, res) => {
    const fs = require('fs');
    const imagesPath = path.join(__dirname, '../frontend/images');
    
    try {
        if (fs.existsSync(imagesPath)) {
            const images = fs.readdirSync(imagesPath);
            res.json({
                imagesPath: imagesPath,
                imagesFound: images,
                testUrls: [
                    `http://localhost:${PORT}/frontend/images/ccoew_logo.jpg`,
                    `http://localhost:${PORT}/images/ccoew_logo.jpg`,
                    `http://localhost:${PORT}/Webway/frontend/images/ccoew_logo.jpg`
                ]
            });
        } else {
            res.json({ error: 'Images directory not found', path: imagesPath });
        }
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Routes

// Register with validation
app.post('/api/register', validateRegister, async (req, res) => {
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
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;
        
        res.status(201).json({
            message: 'User created successfully.',
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already exists.' });
        }
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// Login with validation
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;
        
        res.json({
            message: 'Login successful.',
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// Get current user
app.get('/api/me', auth, async (req, res) => {
    res.json(req.user);
});

// Change password with validation
app.put('/api/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }
        
        const user = await User.findById(req.user._id);
        
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        user.password = hashedPassword;
        await user.save();
        
        res.json({ message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error during password change.' });
    }
});

// Update profile
app.put('/api/profile', auth, async (req, res) => {
    try {
        const { fullname, year, branch, bio } = req.body;
        
        if (!fullname) {
            return res.status(400).json({ message: 'Full name is required.' });
        }
        
        const user = await User.findById(req.user._id);
        
        user.fullname = fullname;
        user.bio = bio;
        
        if (user.role === 'student') {
            user.year = year;
            user.branch = branch;
        }
        
        await user.save();
        
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;
        
        res.json({
            message: 'Profile updated successfully.',
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during profile update.' });
    }
});

// Events routes

// Get all events with filtering
app.get('/api/events', async (req, res) => {
    try {
        const { category } = req.query;
        let filter = {};
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        const events = await Event.find(filter).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching events.' });
    }
});

// Get single event
app.get('/api/events/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid event ID.' });
        }
        
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching event.' });
    }
});

// Create event (admin only) with validation
app.post('/api/events', auth, adminAuth, async (req, res) => {
    try {
        const { title, category, date, location, description, full_description } = req.body;
        
        if (!title || !category || !date || !location || !description || !full_description) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        
        const event = new Event(req.body);
        await event.save();
        res.status(201).json({ message: 'Event created successfully.', event });
    } catch (error) {
        res.status(500).json({ message: 'Server error while creating event.' });
    }
});

// Update event (admin only)
app.put('/api/events/:id', auth, adminAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid event ID.' });
        }
        
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
        res.status(500).json({ message: 'Server error while updating event.' });
    }
});

// Delete event (admin only)
app.delete('/api/events/:id', auth, adminAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid event ID.' });
        }
        
        const event = await Event.findByIdAndDelete(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        await RegistrationLink.deleteMany({ eventId: req.params.id });
        
        res.json({ message: 'Event deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting event.' });
    }
});

// Registration links routes

// Get all registration links
app.get('/api/registration-links', async (req, res) => {
    try {
        const links = await RegistrationLink.find().populate('eventId', 'title');
        res.json(links);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching registration links.' });
    }
});

// Create or update registration link (admin only)
app.post('/api/registration-links', auth, adminAuth, async (req, res) => {
    try {
        const { eventId, url } = req.body;
        
        if (!eventId || !url) {
            return res.status(400).json({ message: 'Event ID and URL are required.' });
        }
        
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: 'Invalid event ID.' });
        }
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        let link = await RegistrationLink.findOne({ eventId });
        
        if (link) {
            link.url = url;
            await link.save();
            return res.json({ message: 'Registration link updated successfully.', link });
        } else {
            link = new RegistrationLink({ eventId, url });
            await link.save();
            await link.populate('eventId', 'title');
            return res.status(201).json({ message: 'Registration link created successfully.', link });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error while managing registration link.' });
    }
});

// Delete registration link (admin only)
app.delete('/api/registration-links/:id', auth, adminAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid registration link ID.' });
        }
        
        const link = await RegistrationLink.findByIdAndDelete(req.params.id);
        
        if (!link) {
            return res.status(404).json({ message: 'Registration link not found.' });
        }
        
        res.json({ message: 'Registration link deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting registration link.' });
    }
});

// Users routes (admin only)

// Get all users
app.get('/api/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching users.' });
    }
});

// Reset user password (admin only)
app.post('/api/users/:id/reset-password', auth, adminAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        const tempPassword = Math.random().toString(36).slice(-8);
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);
        
        user.password = hashedPassword;
        await user.save();
        
        // In production, send email instead of returning password
        console.log(`Password reset for ${user.email}. Temporary password: ${tempPassword}`);
        
        res.json({ 
            message: 'Password reset successfully. Check server logs for temporary password.' 
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error while resetting password.' });
    }
});

// Delete user (admin only)
app.delete('/api/users/:id', auth, adminAuth, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }
        
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }
        
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting user.' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Serve frontend - make sure this is the last route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found.' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Click here to open: http://localhost:${PORT}`);
    console.log(`Or copy this URL: http://localhost:${PORT}`);
});

module.exports = app; // For testing purposes