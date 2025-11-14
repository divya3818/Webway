const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_jwt_secret_key'; // Change this in production

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory (one level up from backend)
app.use(express.static(path.join(__dirname, '..')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../images')));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/ccoew_events', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'student', 'faculty'], required: true },
    year: { type: String, enum: ['FE', 'SE', 'TE', 'BE', ''], default: '' },
    branch: { type: String, enum: ['Computer', 'IT', 'Mechanical', 'Electrical', 'ENTC', ''], default: '' },
    bio: { type: String, default: '' }
});

// Event Schema
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

// Registration Link Schema
const registrationLinkSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    url: { type: String, required: true }
});

// Models
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

// Routes

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { fullname, email, password, role, year, branch } = req.body;
        
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
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
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

// Get current user
app.get('/api/me', auth, async (req, res) => {
    res.json(req.user);
});

// Change password
app.put('/api/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);
        
        // Check current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        user.password = hashedPassword;
        await user.save();
        
        res.json({ message: 'Password changed successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update profile
app.put('/api/profile', auth, async (req, res) => {
    try {
        const { fullname, year, branch, bio } = req.body;
        const user = await User.findById(req.user._id);
        
        user.fullname = fullname;
        user.bio = bio;
        
        if (user.role === 'student') {
            user.year = year;
            user.branch = branch;
        }
        
        await user.save();
        
        // Return user without password
        const userWithoutPassword = { ...user.toObject() };
        delete userWithoutPassword.password;
        
        res.json({
            message: 'Profile updated successfully.',
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Events routes

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single event
app.get('/api/events/:id', async (req, res) => {
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
app.post('/api/events', auth, adminAuth, async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        res.status(201).json({ message: 'Event created successfully.', event });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update event (admin only)
app.put('/api/events/:id', auth, adminAuth, async (req, res) => {
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
app.delete('/api/events/:id', auth, adminAuth, async (req, res) => {
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

// Registration links routes

// Get all registration links
app.get('/api/registration-links', async (req, res) => {
    try {
        const links = await RegistrationLink.find().populate('eventId', 'title');
        res.json(links);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create or update registration link (admin only)
app.post('/api/registration-links', auth, adminAuth, async (req, res) => {
    try {
        const { eventId, url } = req.body;
        
        // Check if link already exists for this event
        let link = await RegistrationLink.findOne({ eventId });
        
        if (link) {
            // Update existing link
            link.url = url;
            await link.save();
            return res.json({ message: 'Registration link updated successfully.', link });
        } else {
            // Create new link
            link = new RegistrationLink({ eventId, url });
            await link.save();
            await link.populate('eventId', 'title');
            return res.status(201).json({ message: 'Registration link created successfully.', link });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete registration link (admin only)
app.delete('/api/registration-links/:id', auth, adminAuth, async (req, res) => {
    try {
        const link = await RegistrationLink.findByIdAndDelete(req.params.id);
        
        if (!link) {
            return res.status(404).json({ message: 'Registration link not found.' });
        }
        
        res.json({ message: 'Registration link deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Users routes (admin only)

// Get all users
app.get('/api/users', auth, adminAuth, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reset user password (admin only)
app.post('/api/users/:id/reset-password', auth, adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        
        // Hash temporary password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);
        
        // Update password
        user.password = hashedPassword;
        await user.save();
        
        // In a real application, you would send an email with the temporary password
        res.json({ 
            message: 'Password reset successfully.', 
            tempPassword // In production, don't send this back - send via email instead
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user (admin only)
app.delete('/api/users/:id', auth, adminAuth, async (req, res) => {
    try {
        // Cannot delete yourself
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }
        
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Serve frontend - make sure this is the LAST route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log('🟢 Connected to MongoDB');
  console.log(`📁 Serving files from: ${path.join(__dirname, '..')}`);
});