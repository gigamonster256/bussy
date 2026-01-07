// State
let routes = [];
let selectedRoute = null;
let selectedDirection = null;
let selectedStop = null;
let eventSource = null;

// DOM Elements
const routeSelect = document.getElementById('route-select');
const directionSelect = document.getElementById('direction-select');
const stopSelect = document.getElementById('stop-select');
const subscribeBtn = document.getElementById('subscribe-btn');
const subscribeForm = document.getElementById('subscribe-form');
const alertsSection = document.getElementById('alerts');
const alertsContainer = document.getElementById('alerts-container');
const logContainer = document.getElementById('log');

// Init
async function init() {
    try {
        const res = await fetch('/api/routes');
        routes = await res.json();
        
        routeSelect.innerHTML = '';
        routes.forEach(route => {
            const opt = document.createElement('option');
            opt.value = route.id;
            opt.textContent = `${route.shortName} - ${route.name}`;
            routeSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Failed to load routes", e);
        log("Error loading routes: " + e.message);
    }
}

// Event Listeners
routeSelect.addEventListener('change', async (e) => {
    const routeId = e.target.value;
    selectedRoute = routes.find(r => r.id === routeId);
    
    // Reset downstream
    directionSelect.innerHTML = '<option value="">Select a direction</option>';
    directionSelect.disabled = true;
    stopSelect.innerHTML = '<option value="">Select a direction first</option>';
    stopSelect.disabled = true;
    subscribeBtn.disabled = true;

    if (routeId) {
        // Load directions
        try {
            const res = await fetch(`/api/routes/${routeId}/directions`);
            const directions = await res.json();
            
            directions.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.name;
                directionSelect.appendChild(opt);
            });
            directionSelect.disabled = false;
        } catch (e) {
            log("Error loading directions");
        }
    }
});

directionSelect.addEventListener('change', async (e) => {
    const directionId = e.target.value;
    selectedDirection = directionId; // we need the object? No just ID is fine for API usually, but let's see.

    // Reset downstream
    stopSelect.innerHTML = '<option value="">Select a stop</option>';
    stopSelect.disabled = true;
    subscribeBtn.disabled = true;

    if (directionId) {
        try {
            const res = await fetch(`/api/routes/${selectedRoute.id}/directions/${directionId}/stops`);
            const stops = await res.json();
            
            stops.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.code; // Use code as ID for API
                opt.textContent = s.name;
                stopSelect.appendChild(opt);
            });
            stopSelect.disabled = false;
        } catch (e) {
            log("Error loading stops");
        }
    }
});

stopSelect.addEventListener('change', (e) => {
    selectedStop = e.target.value;
    subscribeBtn.disabled = !selectedStop;
});

subscribeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    startTracking();
});

function startTracking() {
    if (eventSource) {
        eventSource.close();
    }

    const routeId = selectedRoute.id;
    const directionId = selectedDirection;
    const stopId = selectedStop;
    const notifyMinutes = document.getElementById('notify-minutes').value;
    
    const url = `/sse/arrivals?routeId=${routeId}&directionId=${directionId}&stopId=${stopId}&notifyMinutes=${notifyMinutes}`;
    
    log(`Connecting to SSE: ${url}`);
    eventSource = new EventSource(url);
    
    alertsSection.classList.remove('hidden');
    alertsContainer.innerHTML = '<div class="arrival-card">Waiting for updates...</div>';

    eventSource.onopen = () => {
        log("SSE Connected");
    };

    eventSource.onmessage = (event) => {
        try {
            const arrivals = JSON.parse(event.data);
            renderArrivals(arrivals);
        } catch (e) {
            log("Error parsing SSE data");
        }
    };

    eventSource.onerror = (err) => {
        log("SSE Error (check console)");
        console.error(err.data);
    };
}

function renderArrivals(arrivals) {
    alertsContainer.innerHTML = '';
    
    if (arrivals.length === 0) {
        alertsContainer.innerHTML = '<div class="arrival-card">No upcoming arrivals found.</div>';
        return;
    }

    arrivals.forEach(arr => {
        const div = document.createElement('div');
        div.className = 'arrival-card';
        
        const time = arr.estimatedDepartTimeUtc || arr.scheduledDepartTimeUtc;
        if (!time) return;

        const date = new Date(time);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Calc minutes away
        const diffMs = date - new Date();
        const diffMins = Math.round(diffMs / 60000);
        
        div.innerHTML = `
            <div class="arrival-time">${timeStr}</div>
            <div>${diffMins} minutes away</div>
            <small>${arr.isRealtime ? 'Real-time estimate' : 'Scheduled time'} ${arr.isOffRoute ? '(Off route)' : ''}</small>
        `;
        alertsContainer.appendChild(div);
    });
    
    log(`Updated: ${new Date().toLocaleTimeString()}`);
}

function log(msg) {
    const div = document.createElement('div');
    div.textContent = msg;
    logContainer.prepend(div);
}

// Start
init();
