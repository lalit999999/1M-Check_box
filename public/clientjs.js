const CHECKBOX_STATE_KEY = 'checkbox-state';
const socket = io();
const container = document.getElementById("container");
const checkboxe_count = 100;

socket.on("server:checkbox:update",  (data) => {
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