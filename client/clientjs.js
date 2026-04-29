const socket = io();
const container = document.getElementById("container");
const checkboxe_count = 100;


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

socket.on("server:error", (data) => {
    const errorMessage = data.error;
    console.error(`Server error received:`, errorMessage);
    console.log(`Showing error alert with message: ${errorMessage}`);
    showErrorAlert(errorMessage);
});

socket.on("server:checkbox:update", (data) => {
    console.log(`Received checkbox update from server:`, data);
    const checkbox = document.getElementById(`checkbox-${data.index}`);
    if (checkbox) {
        checkbox.checked = data.checked;
    }
});

window.addEventListener("load", async () => {
    const response = await fetch("/checkboxes", { method: "GET" });
    const data = await response.json();

    if (data && data.checkboxes) {
        data.checkboxes.forEach((serverData, index) => {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `checkbox-${index}`;
            container.appendChild(checkbox);
            checkbox.checked = serverData;

            checkbox.addEventListener("change", (event) => {
                const isChecked = event.target.checked;
                console.log(
                    `Checkbox ${index} is now ${isChecked ? "checked" : "unchecked"}`,
                );
                socket.emit("client:checkbox:change", {
                    index,
                    checked: isChecked,
                });
            });
        });
    }
});

