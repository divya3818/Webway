// Test connection to backend
async function testBackendConnection() {
    try {
        const response = await fetch('http://localhost:5000/api/events');
        const events = await response.json();
        console.log('Backend connection successful!', events);
        
        // Display the events on the page
        displayEvents(events);
    } catch (error) {
        console.error('Error connecting to backend:', error);
        // Show a message on the page if backend is not reachable
        showErrorMessage();
    }
}

// Display events on the page
// Display events on the page
function displayEvents(events) {
    const eventsContainer = document.getElementById('events-container');
    
    if (!eventsContainer) {
        console.error('Events container not found');
        return;
    }
    
    // Clear loading message if exists
    eventsContainer.innerHTML = '';
    
    if (events.length === 0) {
        eventsContainer.innerHTML = '<p class="text-center">No events found.</p>';
        return;
    }
    
    events.forEach(event => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-4';
        
        col.innerHTML = `
            <div class="card h-100">
                <img src="https://via.placeholder.com/300x200?text=${encodeURIComponent(event.title)}" 
                     class="card-img-top" alt="${event.title}">
                <div class="card-body">
                    <h5 class="card-title">${event.title}</h5>
                    <p class="card-text">
                        <span class="badge bg-primary">${event.category}</span>
                    </p>
                    <button class="btn btn-outline-primary btn-sm">View Details</button>
                </div>
            </div>
        `;
        
        eventsContainer.appendChild(col);
    });
}

// Show error message if backend is not reachable
function showErrorMessage() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: #ffebee;
        color: #c62828;
        padding: 15px;
        margin: 20px;
        border-radius: 5px;
        text-align: center;
    `;
    errorDiv.innerHTML = `
        <h3>Backend Connection Issue</h3>
        <p>Could not connect to the server. Make sure your backend is running on port 5000.</p>
        <p>Your backend is working if you can see <a href="http://localhost:5000" target="_blank">this message</a>.</p>
    `;
    
    // Add at the beginning of the main content
    const main = document.querySelector('main');
    if (main) {
        main.insertBefore(errorDiv, main.firstChild);
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Frontend loaded successfully!');
    testBackendConnection();
    
    // Add a button to test the connection manually
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Backend Connection';
    testBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 15px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    `;
    testBtn.onclick = testBackendConnection;
    document.body.appendChild(testBtn);
});