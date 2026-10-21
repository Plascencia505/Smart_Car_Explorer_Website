// src/sockets/socketHandler.js
export const setupSocketHandler = (io, mqttClient) => {
  const prefix = process.env.MQTT_TOPIC_PREFIX || "SCEB_LMJAPFMCSS/7B";
  const controlTopic = `${prefix}/control`;
  const navigateTopic = `${prefix}/navigate`;

  io.on("connection", (socket) => {
    console.log(`[WS] Dashboard conectado: ${socket.id}`);

    // Comandos de marcha manual (W, A, S, D, STOP)
    socket.on("manual_control", (commandData) => {
      mqttClient.publish(controlTopic, JSON.stringify(commandData), { qos: 0 });
    });

    // Envío de coordenadas destino para navegación autónoma
    socket.on("navigate_to", (coordinates) => {
      mqttClient.publish(navigateTopic, JSON.stringify(coordinates), {
        qos: 1,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Dashboard desconectado: ${socket.id}`);
    });
  });
};
