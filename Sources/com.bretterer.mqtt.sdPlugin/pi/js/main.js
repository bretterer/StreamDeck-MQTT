let socket = null;
let inspector = {};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
    inspector.registerEvent = inRegisterEvent;
    inspector.port = inPort;
    inspector.uuid = inUUID;
    inspector.inActionInfo = inActionInfo;

    connectToWebSocket();
}

function connectToWebSocket() {
    socket = new WebSocket("ws://127.0.0.1:" + inspector.port);
    socket.onopen = _ => connectedToPropertyInspector();
    socket.onmessage = message => messageReceived(message);
    socket.onclose = _ => connectToWebSocket();
}

function connectedToPropertyInspector() {
    registerPropertyInspector();

    requestSettings();

    registerChangeDetection();
}

function messageReceived(message) {
    const json = JSON.parse(message.data);

    if (json.event === "didReceiveSettings") {
        settingsReceived(json.payload.settings);
    }
}

function registerPropertyInspector() {
    socket.send(
        JSON.stringify({
            event: inspector.registerEvent,
            uuid: inspector.uuid
        })
    );
}

function requestSettings() {
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
    return socket && socket.readyState === 1;
}

function settingsReceived(settings) {
    Object.entries(settings).forEach(([key, value]) => {
        const element = document.getElementById(key);

        element.value = value;
    });
}

function registerChangeDetection() {
    getInputs().forEach(element => element.addEventListener("input", () => saveSettings()));
}

function getInputs() {
    return Array.from(document.querySelectorAll(".sdpi-item-value")).map(element => {
        if (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA") {
            return element.querySelector("input");
        }
        return element;
    })
}

function saveSettings() {
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

function sendValueToPlugin(val, param) {
    if (isConnectedToPropertyInspector()) {
        // let payload = {};

        // getInputs().forEach(element => {
        //     payload[element.id] = element.value;
        // });

        // socket.send(
        //     JSON.stringify({
        //         action: inspector.inActionInfo["action"],
        //         event: "sendToPlugin",
        //         context: inspector.uuid,
        //         payload
        //     })
        // );

        const json = {
            action: inspector.inActionInfo["action"],
            event: "sendToPlugin",
            context: inspector.uuid,
            payload: { [param]: value },
          };

        websocket.send(JSON.stringify(json));
    }
  }