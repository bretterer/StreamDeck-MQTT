let socket = null;
let inspector = {};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    debugger;
    inspector.registerEvent = inRegisterEvent;
    inspector.port = inPort;
    inspector.uuid = inUUID;

    connectToWebSocket();
}

function connectToWebSocket() {
    debugger;
    socket = new WebSocket("ws://127.0.0.1:" + inspector.port);
    socket.onopen = _ => connectedToPropertyInspector();
    socket.onmessage = message => messageReceived(message);
    socket.onclose = _ => connectToWebSocket();
}

function connectedToPropertyInspector() {
    debugger;
    registerPropertyInspector();

    requestSettings();

    registerChangeDetection();
}

function messageReceived(message) {
    debugger;
    const json = JSON.parse(message.data);

    if (json.event === "didReceiveSettings") {
        settingsReceived(json.payload.settings);
    }
}

function registerPropertyInspector() {
    debugger;
    socket.send(
        JSON.stringify({
            event: inspector.registerEvent,
            uuid: inspector.uuid
        })
    );
}

function requestSettings() {
    debugger;
    if (isConnectedToPropertyInspector()) {
        socket.send(
            JSON.stringify({
                event: "getSettings",
                context: inspector.uuid
            })
        );
    }
}

function isConnectedToPropertyInspector() {
    debugger;
    return socket && socket.readyState === 1;
}

function settingsReceived(settings) {
    debugger;
    Object.entries(settings).forEach(([key, value]) => {
        const element = document.getElementById(key);

        element.value = value;
    });
}

function registerChangeDetection() {
    debugger;
    getInputs().forEach(element => element.addEventListener("input", () => saveSettings()));
}

function getInputs() {
    debugger;
    return Array.from(document.querySelectorAll(".sdpi-item-value")).map(element => {
        if (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA") {
            return element.querySelector("input");
        }
        return element;
    })
}

function saveSettings() {
    debugger;
    if (isConnectedToPropertyInspector()) {
        let payload = {};

        getInputs().forEach(element => {
            payload[element.id] = element.value;
        });

        socket.send(
            JSON.stringify({
                event: "setSettings",
                context: inspector.uuid,
                payload
            })
        );
    }
}
