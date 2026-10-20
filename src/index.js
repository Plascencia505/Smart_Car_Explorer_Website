// Levanta el servidor HTTP, sockets y MQTT
// src/index.js
import 'dotenv/config';

import http from "http";
import net from "net";
import os from "os";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { connectToMongoDB } from "./config/db.js";
import aedes from "./config/mqtt.js";
import { setupMqttController } from "./controllers/mqttController.js";
import { setupSocketHandler } from './sockets/socketHandler.js';

const HTTP_PORT = process.env.PORT || 3000;
const MQTT_PORT = process.env.MQTT_PORT || 1883;

// Función para obtener la IPv4 local activa
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Filtrar interfaces IPv4 que no sean loopback (127.0.0.1)
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
};

// Instancias de servidores
const httpServer = http.createServer(app);
const mqttServer = net.createServer(aedes.handle);

// Configuración de WebSockets
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

// Función de arranque global
const startServer = async () => {
  try {
    await connectToMongoDB();

    setupMqttController(aedes, io);
    setupSocketHandler(io, aedes);

    // Arranque del broker MQTT (TCP)
    mqttServer.listen(MQTT_PORT, "0.0.0.0", () => {
      const localIP = getLocalIP();
      console.log(`[MQTT] Broker TCP activo:`);
      console.log(`-> Local: mqtt://localhost:${MQTT_PORT}`);
      console.log(`-> Red/ESP: mqtt://${localIP}:${MQTT_PORT}`);
    });

    // Arranque de Express y Socket.io (HTTP/WS)
    httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
      const localIP = getLocalIP();
      console.log(`Servidor Web y WebSockets activo:`);
      console.log(`-> Local: http://localhost:${HTTP_PORT}`);
      console.log(`-> Red: http://${localIP}:${HTTP_PORT}`);
    });
  } catch (error) {
    console.error("Error crítico al iniciar los servicios:", error.message);
    process.exit(1);
  }
};

startServer();
