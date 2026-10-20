// src/sockets/socketHandler.js

const TOPIC_NAVIGATE = "SCEB/7B/navigate"
const TOPIC_CONTROL = "SCEB/7B/control"

export const setupSocketHandler = (io, aedes) => {
  io.on("connection", (socket) => {
    console.log(`[WS] Dashboard conectado: ${socket.id}`);

    // Recepción de comandos de movimiento desde el joystick virtual
    socket.on("manual_control", (commandData) => {
      // commandData esperado: { action: 'W' | 'A' | 'S' | 'D' | 'STOP' }
      aedes.publish({
        topic: TOPIC_CONTROL,
        payload: JSON.stringify(commandData),
        qos: 0,
        retain: false,
      });
    });

    // Recepción de coordenadas destino desde el mapa interactivo
    socket.on("navigate_to", (coordinates) => {
      // coordinates esperado: { la: 19.24, lo: -103.72 }
      aedes.publish({
        topic: TOPIC_NAVIGATE,
        payload: JSON.stringify(coordinates),
        qos: 1, // QoS 1 para asegurar la entrega de la coordenada
        retain: false,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Dashboard desconectado: ${socket.id}`);
    });
  });
};
