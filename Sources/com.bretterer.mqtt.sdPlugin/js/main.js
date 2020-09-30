let websocket = null;
let pluginUUID = null;
let mqttServer = null;
let mqttPort = null;
let mqttUser = null;
let mqttPass = null;
let client = null;
let pluginGotSettings = false;

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    pluginUUID = inPluginUUID;
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
        // console.log(jsonObj['event']);

        if (jsonObj['event'] == "willAppear") {
            setUpMqttClient(jsonObj);
        }

        if (jsonObj['event'] == "propertyInspectorDidDisappear") {
            var json = {
                "event": "getSettings",
                "context": jsonObj['context']
            };

            websocket.send(JSON.stringify(json));

            pluginGotSettings = true;
        }

        if (jsonObj['event'] == "didReceiveSettings") {
            if(pluginGotSettings) {
                setUpMqttClient(jsonObj);
                pluginGotSettings = false;
            }
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

            client.publish(commandTopic, payload, function(err) {

                console.log(err);
            });

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
    console.log(mqttServer, mqttPort, mqttUser, mqttPass);

    if(mqttServer == null || mqttPort == null) {
        return;
    }

    stateTopic = getProperty(jsonObj.payload, "stateTopic", null);

    client  = mqtt.connect("ws://" + mqttServer + ":" + mqttPort, {"username": mqttUser, "password": mqttPass})

    client.on('connect', function () {
        client.subscribe(stateTopic, {'qos': 1}, function(err) {

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

        if(state == "ON") {
            json.payload.state = 1
        } else {
            json.payload.state = 0
        }

        websocket.send(JSON.stringify(json));
    })
}
