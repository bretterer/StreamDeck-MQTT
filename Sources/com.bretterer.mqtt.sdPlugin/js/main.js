let websocket = null;
let pluginUUID = null;
let mqttServer = null;
let mqttPort = null;
let mqttUser = null;
let mqttPass = null;
let client = null

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    pluginUUID = inPluginUUID;
    debugger;
    websocket = new WebSocket("ws://127.0.0.1:" + inPort);

    websocket.onopen = function () {
        const json = {
            "event": inRegisterEvent,
            "uuid": inPluginUUID
        };

        websocket.send(JSON.stringify(json));
    };

    websocket.onmessage = function (evt) {
        const jsonObj = JSON.parse(evt.data);

        debugger;

        if (jsonObj['event'] == "willAppear") {

            mqttServer = getProperty(jsonObj.payload, "mqttServer", null);
            mqttPort = getProperty(jsonObj.payload, "mqttPort", null);
            mqttUser = getProperty(jsonObj.payload, "mqttUser", null);
            mqttPass = getProperty(jsonObj.payload, "mqttPass", null);

            stateTopic = getProperty(jsonObj.payload, "stateTopic", null);

            if (mqttUser && mqttPass) {
                client  = mqtt.connect("ws://" + mqttServer + ":" + mqttPort, {"username": mqttUser, "password": mqttPass})
            } else {
                client  = mqtt.connect("ws://" + mqttServer + ":" + mqttPort)
            }

            client.on('connect', function () {
                client.subscribe(stateTopic, {'qos': 1}, function(err, body, body2) {

                })
            })

            client.on('message', function (topic, message) {
                // message is Buffer
                state = message.toString();
                let json = {
                    "event": "setState",
                    "context": jsonObj.context,
                    "payload": {
                        "state": 0
                    }
                };
                console.log(state);

                if(state == "ON") {
                    json.payload.state = 1
                } else {
                    json.payload.state = 0
                }

                websocket.send(JSON.stringify(json));
            })

        }

        if (jsonObj['event'] == "keyDown") {

            if(jsonObj['action'] == "com.bretterer.mqtt.switch") {
                commandTopic = getProperty(jsonObj.payload, "commandTopic", null);
                payloadOn = getProperty(jsonObj.payload, "payloadOn", "ON");
                payloadOff = getProperty(jsonObj.payload, "payloadOff", "OFF");

                if(jsonObj.payload.state == 0) {
                    payload = payloadOn
                } else {
                    payload = payloadOff
                }
            }

            client.publish(commandTopic, payload);

        }
    };
};

function getProperty(payload, prop, defaultVal) {
    if (defaultVal !== null && payload.settings != null && payload.settings.hasOwnProperty(prop) && payload.settings[prop] == "") {
        return defaultVal;
    }
    if (payload.settings != null && payload.settings.hasOwnProperty(prop)) {
        return payload.settings[prop];
    }

    return defaultVal;
}
