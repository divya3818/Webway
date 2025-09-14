const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'student', 'faculty'], required: true },
    year: { type: String, enum: ['FE', 'SE', 'TE', 'BE', ''], default: '' },
    branch: { type: String, enum: ['Computer', 'IT', 'Mechanical', 'Electrical', 'ENTC', ''], default: '' },
    bio: { type: String, default: '' }
});

module.exports = mongoose.model('User', userSchema);