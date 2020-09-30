let websocket = null;
let pluginUUID = null;
let mqttServer = null;
let mqttPort = null;
let mqttUser = null;
let mqttPass = null;
let mqttClients = {};

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    pluginUUID = inPluginUUID;
    websocket = new WebSocket("ws://127.0.0.1:" + inPort);

    websocket.onopen = function () {
        websocket.send(
            JSON.stringify({
            "event": inRegisterEvent,
            "uuid": inPluginUUID
            })
        );
    };

    websocket.onmessage = function (evt) {
        const jsonObj = JSON.parse(evt.data);

        if (jsonObj['event'] == "willAppear") {
            setUpMqttClient(jsonObj);
        }

        if (jsonObj['event'] == "didReceiveSettings") {
            setUpMqttClient(jsonObj);
        }

        if (jsonObj['event'] == "keyUp") {
            if(jsonObj['action'] == "com.bretterer.mqtt.switch") {
                commandTopic = getProperty(jsonObj.payload, "commandTopic", null);
                payloadOn = getProperty(jsonObj.payload, "payloadOn", "ON");
                payloadOff = getProperty(jsonObj.payload, "payloadOff", "OFF");

                if(jsonObj.payload.state == 1) {
                    payload = payloadOff
                } else {
                    payload = payloadOn
                }
            }

            mqttClients[jsonObj.context].publish(commandTopic, payload);

        }
    };
};

function getProperty(payload, prop, defaultVal) {
    if (payload.settings != null && payload.settings.hasOwnProperty(prop)) {
        if(payload.settings[prop] == "") {
            return defaultVal
        }

        return payload.settings[prop];
    }

    return defaultVal;
}

function setUpMqttClient(jsonObj) {
    mqttServer = getProperty(jsonObj.payload, "mqttServer", null);
    mqttPort = getProperty(jsonObj.payload, "mqttPort", null);
    mqttUser = getProperty(jsonObj.payload, "mqttUser", null);
    mqttPass = getProperty(jsonObj.payload, "mqttPass", null);

    if(mqttServer == null || mqttPort == null) {
        return;
    }

    clientOptions = {};

    if(mqttUser && mqttPass) {
        clientOptions.username = mqttUser;
        clientOptions.password = mqttPass;
    }

    try {
        client  = mqtt.connect("ws://" + mqttServer + ":" + mqttPort, clientOptions);
        let stateTopic = getProperty(jsonObj.payload, "stateTopic", null);

        client.on('connect', function () {
            if(stateTopic) {
                client.subscribe(stateTopic, {"qos": 1}, (err) => {
                    if(err) {
                        console.log(err)
                    }
                });
            }
        });

        client.on('message', function (topic, message) {
            // message is Buffer
            payloadOn = getProperty(jsonObj.payload, "payloadOn", "ON");
            payloadOff = getProperty(jsonObj.payload, "payloadOff", "OFF");
            state = message.toString();
            console.log(topic, state);
            let json = {
                "event": "setState",
                "context": jsonObj.context,
                "payload": {
                    "state": 0
                }
            };

            if(state == payloadOn) {
                json.payload.state = 1
            } else if (state == payloadOff) {
                json.payload.state = 0
            }

            websocket.send(JSON.stringify(json));

        });

        mqttClients[jsonObj.context] = client;

    } catch (err) {
        client.end();
        websocket.send(
            JSON.stringify({
            "event": "showAlert",
            "context": jsonObj.context,
            })
        );

    }


}
