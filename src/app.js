// Configuración de Express, middlewares y rutas
// src/app.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import MongoStore from "connect-mongo";
import { xssSanitize } from "./middlewares/sanitizeMiddleware.js";

// Importación de rutas
import authRoutes from "./routes/authRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";

const app = express();

// Necesario para cookies 'secure: true' detrás del balanceador de carga de Azure
app.set("trust proxy", 1);

// Carpeta del Front-End: <proyecto>/public (al lado de src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const carpetaFrontEnd = path.join(__dirname, "..", "public");

// Middlewares de Seguridad Global
// Middlewares de Seguridad Global
app.use(
  helmet({
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://cdnjs.cloudflare.com"],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "https://images.unsplash.com",
          "https://images.pexels.com",
          "https://*.tile.openstreetmap.org",
          "https://cdnjs.cloudflare.com",
        ],
        "connect-src": ["'self'", "ws:", "wss:"],
      },
    },
  }),
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Middlewares de Análisis de Carga (Payload)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Sanitización de Datos
app.use(xssSanitize);

// 10 días de expiración para la sesión
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "250ef31f54d7cc16c8bf94f9d46421a91e78426f3d5889f17ec01384140142d1",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 10 * 24 * 60 * 60 * 1000, // 10 días en milisegundos
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);

// Enrutamiento de API
app.use("/api/auth", authRoutes);
app.use("/api/telemetry", apiRoutes);

// Activos estáticos aislados (impide descarga directa de archivos .html en la raíz de public/)
app.use("/css", express.static(path.join(carpetaFrontEnd, "css")));
app.use("/js", express.static(path.join(carpetaFrontEnd, "js")));

// Enrutador de vistas del Front-End con validación de sesión
app.use(pageRoutes);

// Manejador básico de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada en el servidor." });
});

export default app;