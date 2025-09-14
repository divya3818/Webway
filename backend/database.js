const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database with sample data
db.serialize(() => {
  // Create tables if they don't exist
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 1
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    full_description TEXT,
    image_url TEXT,
    registration_link TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  // Insert default admin if not exists
  const defaultPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO admins (email, password, name) VALUES (?, ?, ?)`, 
    ['admin.user@cumminscollege.edu.in', defaultPassword, 'Admin User']);
  
  // Insert sample events if none exist
  db.get('SELECT COUNT(*) as count FROM events', (err, row) => {
    if (row.count === 0) {
      const sampleEvents = [
        {
          title: 'Annual Cultural Fest',
          date: '2023-10-15',
          location: 'College Auditorium',
          description: 'Join us for three days of music, dance, drama and various cultural competitions.',
          full_description: 'The Annual Cultural Fest is a three-day extravaganza showcasing the diverse talents of our students. Events include singing competitions, dance performances, drama acts, fashion shows, and art exhibitions.',
          image_url: '../Webway/frontend/images/hero5.jpg',
          registration_link: 'pages/registration.html'
        },
        {
          title: 'Coding Hackathon',
          date: '2023-11-05',
          location: 'Computer Lab Block B',
          description: '24-hour hackathon to solve real-world problems using technology. Open to all students.',
          full_description: 'This 24-hour hackathon challenges participants to develop innovative solutions to real-world problems. Categories include web development, mobile apps, AI/ML, and IoT. Food and refreshments will be provided.',
          image_url: '../Webway/frontend/images/avishkar1.jpg',
          registration_link: 'pages/registration.html'
        },
        {
          title: 'Football Tournament',
          date: '2023-09-20',
          location: 'College Ground',
          description: 'Inter-college football competition with teams from across the region.',
          full_description: 'The annual inter-college football tournament brings together the best teams from across the region. Matches will be played in league format followed by knockout rounds. Trophies and medals for winners and runners-up.',
          image_url: '../Webway/frontend/images/sphurti.jpg',
          registration_link: 'pages/registration.html'
        }
      ];
      
      const stmt = db.prepare(`INSERT INTO events 
        (title, date, location, description, full_description, image_url, registration_link) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
      
      sampleEvents.forEach(event => {
        stmt.run([
          event.title, 
          event.date, 
          event.location, 
          event.description, 
          event.full_description, 
          event.image_url, 
          event.registration_link
        ]);
      });
      
      stmt.finalize();
    }
  });
});

module.exports = db;