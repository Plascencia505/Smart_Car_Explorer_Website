// src/index.js
import http from "http";
import os from "os";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { connectToMongoDB } from "./config/db.js";
import mqttClient from "./config/mqtt.js";
import { setupMqttController } from "./controllers/mqttController.js";
import { setupSocketHandler } from "./sockets/socketHandler.js";

const HTTP_PORT = process.env.PORT || 3000;

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "localhost";
};

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

const startServer = async () => {
  try {
    await connectToMongoDB();

    setupMqttController(mqttClient, io);
    setupSocketHandler(io, mqttClient);

    httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
      const localIP = getLocalIP();
      console.log(`[HTTP] Servidor Web y WebSockets activo:`);
      console.log(`-> Local: http://localhost:${HTTP_PORT}`);
      console.log(`-> Red: http://${localIP}:${HTTP_PORT}`);
    });
  } catch (error) {
    console.error("Error crítico al iniciar los servicios:", error.message);
    process.exit(1);
  }
};

startServer();
