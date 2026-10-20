// src/controllers/mqttController.js
import Telemetry from "../models/Telemetry.js";

const TOPIC = "SCEB/7B/telemetry"

export const setupMqttController = (aedes, io) => {
  // Registro de conexiones para depuración
  aedes.on("client", (client) => {
    console.log(`Cliente conectado: ${client ? client.id : "desconocido"}`);
  });

  aedes.on("clientDisconnect", (client) => {
    console.log(`Cliente desconectado: ${client ? client.id : "desconocido"}`);
  });

  // Intercepción de mensajes entrantes
  aedes.on("publish", async (packet, client) => {
    // Ignorar mensajes internos del broker (donde client es nulo)
    if (!client) return;

    const topic = packet.topic;
    const payload = packet.payload.toString();

    // Tópico acordado para la recepción de datos del hardware
    if (topic === TOPIC) {
      try {
        const data = JSON.parse(payload);

        // Validación del contrato de datos de LoRa
        if (
          data.la !== undefined &&
          data.lo !== undefined &&
          data.t !== undefined &&
          data.p !== undefined
        ) {
          // Mapeo hacia el modelo de Mongoose
          const newTelemetry = new Telemetry({
            location: {
              type: "Point",
              coordinates: [data.lo, data.la], // GeoJSON requiere [longitud, latitud]
            },
            temperature: data.t,
            pressure: data.p,
          });

          const savedTelemetry = await newTelemetry.save();

          // Emisión inmediata al frontend a través de WebSockets
          if (io) {
            io.emit("new_telemetry", savedTelemetry);
          }
        } else {
          console.warn("Payload rechazado por formato incompleto:", payload);
        }
      } catch (error) {
        console.error("Error al procesar la telemetría:", error.message);
      }
    }
  });
};
