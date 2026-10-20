// Configuración de Express, middlewares y rutas
// src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import MongoStore from "connect-mongo";
import { xssSanitize } from './middlewares/sanitizeMiddleware.js';

// Importación de rutas
import authRoutes from './routes/authRoutes.js';
import apiRoutes from "./routes/apiRoutes.js";

const app = express();

// Middlewares de Seguridad Global
app.use(helmet()); // Configura cabeceras HTTP seguras
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Middlewares de Análisis de Carga (Payload)
app.use(express.json({ limit: "10kb" })); // Limita el tamaño del body para evitar saturación
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Sanitización de Datos
app.use(xssSanitize);

// 10 días de expiración para la sesión
app.use(
  session({
    secret: process.env.SESSION_SECRET || "clave_secreta_por_defecto",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 días en milisegundos
      httpOnly: true, // Evita que la cookie sea leída por JavaScript del lado del cliente
      secure: process.env.NODE_ENV === "production", // Solo HTTPS en producción (Azure)
      sameSite: "lax",
    },
  }),
);

// Enrutamiento
app.use("/api/auth", authRoutes);
app.use("/api/telemetry", apiRoutes);

// Manejador básico de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada en el servidor." });
});

export default app;
