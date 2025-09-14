const express = require('express');
const path = require('path');
const app = express();

// ✅ Serve all static assets (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ✅ Dynamic pages (example: /umang, /technoformer, /subpages/traditional)
app.get('/:page', (req, res) => {
  const page = req.params.page;

  // Serve HTML files from frontend/pages
  res.sendFile(path.join(__dirname, 'frontend', 'pages', `${page}.html`), err => {
    if (err) {
      res.status(404).send("Page not found");
    }
  });
});

// ✅ Subpages (example: /subpages/traditional)
app.get('/subpages/:subpage', (req, res) => {
  const subpage = req.params.subpage;

  res.sendFile(path.join(__dirname, 'frontend', 'pages', 'subpages', `${subpage}.html`), err => {
    if (err) {
      res.status(404).send("Subpage not found");
    }
  });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
