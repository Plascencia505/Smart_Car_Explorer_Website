// src/config/mqtt.js
import mqtt from "mqtt";

const brokerUrl = process.env.HIVEMQ_URL || "mqtt://broker.hivemq.com:1883";

const mqttClient = mqtt.connect(brokerUrl);

mqttClient.on("connect", () => {
  console.log(`[MQTT] Conectado exitosamente al broker público (${brokerUrl})`);
});

mqttClient.on("error", (err) => {
  console.error("[MQTT] Error de conexión:", err.message);
});

export default mqttClient;
