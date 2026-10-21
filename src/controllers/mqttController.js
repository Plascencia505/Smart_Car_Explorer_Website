// src/controllers/mqttController.js
import Telemetry from "../models/Telemetry.js";

export const setupMqttController = (mqttClient, io) => {
  const prefix = process.env.MQTT_TOPIC_PREFIX || "SCEB_LMJAPFMCSS/7B";
  const telemetryTopic = `${prefix}/telemetry`;

  mqttClient.subscribe(telemetryTopic, (err) => {
    if (err) {
      console.error(`Error al suscribirse a ${telemetryTopic}:`, err.message);
    } else {
      console.log(`Escuchando telemetría en: ${telemetryTopic}`);
    }
  });

  mqttClient.on("message", async (topic, message) => {
    if (topic === telemetryTopic) {
      try {
        const data = JSON.parse(message.toString());

        if (
          data.la !== undefined &&
          data.lo !== undefined &&
          data.t !== undefined &&
          data.p !== undefined
        ) {
          const newTelemetry = new Telemetry({
            location: { type: "Point", coordinates: [data.lo, data.la] },
            temperature: data.t,
            pressure: data.p,
          });

          const savedTelemetry = await newTelemetry.save();
          if (io) io.emit("new_telemetry", savedTelemetry);
        }
      } catch (error) {
        console.error("Error al procesar telemetría:", error.message);
      }
    }
  });
};
