const socket = io();
const container = document.getElementById("container");
const checkboxe_count = 100;

let isAuthenticated = false;
let isReadOnly = false;
let userData = null;

// Function to show error alert UI
function showErrorAlert(message) {
    const alertContainer = document.createElement("div");
    alertContainer.className = "error-alert";
    alertContainer.innerHTML = `
        <div class="error-alert-content">
            <div class="error-alert-header">
                <span class="error-icon">⚠️</span>
                <span class="error-title">Error</span>
                <button class="error-close-btn">&times;</button>
            </div>
            <div class="error-alert-message">${message}</div>
        </div>
    `;

    document.body.appendChild(alertContainer);

    // Close button functionality
    const closeBtn = alertContainer.querySelector(".error-close-btn");
    closeBtn.addEventListener("click", () => {
        alertContainer.remove();
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertContainer.parentNode) {
            alertContainer.remove();
        }
    }, 5000);
}

// Function to show read-only mode banner
function showReadOnlyBanner() {
    const banner = document.createElement("div");
    banner.className = "readonly-banner";
    banner.innerHTML = `
        <div class="readonly-banner-content">
            <span class="readonly-icon">🔒</span>
            <span class="readonly-text">You are viewing in <strong>Read-Only Mode</strong>. <a href="/login.html">Login</a> to modify checkboxes.</span>
        </div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
}

// Socket event: server error
socket.on("server:error", (data) => {
    const errorMessage = data.error;
    console.error(`Server error received:`, errorMessage);
    showErrorAlert(errorMessage);
});

// Socket event: checkbox update
socket.on("server:checkbox:update", (data) => {
    console.log(`Received checkbox update from server:`, data);
    const checkbox = document.getElementById(`checkbox-${data.index}`);
    if (checkbox) {
        checkbox.checked = data.checked;
    }
});

// Socket event: user info - tells us if we're in read-only mode
socket.on("server:user-info", (data) => {
    isAuthenticated = data.authenticated;
    isReadOnly = data.isReadOnly;
    userData = data.user;
    console.log(`Socket user info:`, data);

    if (isReadOnly) {
        console.warn("Socket connected in READ-ONLY mode. Checkbox edits will be blocked.");
        showReadOnlyBanner();
    }
});

// Socket event: connection
socket.on("connect", () => {
    console.log(`Socket connected with ID: ${socket.id}`);
});

// Socket event: disconnection
socket.on("disconnect", () => {
    console.log(`Socket disconnected`);
});

// Load checkboxes on page load
window.addEventListener("load", async () => {
    // Wait for app to be ready
    let retries = 0;
    while (!window.appReady && retries < 50) {
        await new Promise(r => setTimeout(r, 100));
        retries++;
    }

    if (!window.appReady) {
        console.error("App not ready after timeout");
        return;
    }

    try {
        // Try authenticated endpoint first, fall back to public endpoint
        let response = await fetch("/checkboxes", { method: "GET" });

        // If 401, user is not authenticated - use the public read-only endpoint
        if (response.status === 401) {
            console.log("Not authenticated, using public read-only endpoint");
            response = await fetch("/api/checkboxes/view", { method: "GET" });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.checkboxes) {
            data.checkboxes.forEach((serverData, index) => {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.id = `checkbox-${index}`;
                container.appendChild(checkbox);
                checkbox.checked = serverData;

                // Disable checkbox if in read-only mode, otherwise attach change listener
                if (isReadOnly) {
                    checkbox.disabled = true;
                    checkbox.classList.add('checkbox-readonly');
                    checkbox.title = 'Login to modify';
                } else {
                    checkbox.addEventListener("change", (event) => {
                        // Check if user is authenticated before sending
                        if (!isAuthenticated) {
                            showErrorAlert("You must be logged in to modify checkboxes");
                            // Revert the checkbox
                            event.target.checked = !event.target.checked;
                            return;
                        }

                        const isChecked = event.target.checked;
                        console.log(
                            `Checkbox ${index} is now ${isChecked ? "checked" : "unchecked"}`,
                        );
                        socket.emit("client:checkbox:change", {
                            index,
                            checked: isChecked,
                        });
                    });
                }
            });
        }
    } catch (error) {
        console.error("Error loading checkboxes:", error);
        showErrorAlert("Failed to load checkboxes. Please refresh the page.");
    }
});

