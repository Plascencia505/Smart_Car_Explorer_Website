// Configuración de Express, middlewares y rutas
// src/app.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import MongoStore from "connect-mongo";
import { xssSanitize } from './middlewares/sanitizeMiddleware.js';

// Importación de rutas
import authRoutes from './routes/authRoutes.js';
import apiRoutes from "./routes/apiRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";

const app = express();

// Carpeta del Front-End: <proyecto>/public (al lado de src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const carpetaFrontEnd = path.join(__dirname, "..", "public");

// Middlewares de Seguridad Global
// Configura cabeceras HTTP seguras.
// La política de contenido (CSP) se amplía para que el Front-End pueda usar:
//   - Chart.js y Leaflet desde cdnjs
//   - las fotos de fondo (Unsplash y Pexels) y los mapas de OpenStreetMap
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", "https://cdnjs.cloudflare.com"],
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "https://images.unsplash.com",
          "https://images.pexels.com",
          "https://*.tile.openstreetmap.org",
        ],
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
app.use(express.json({ limit: "10kb" })); // Limita el tamaño del body para evitar saturación
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Sanitización de Datos
app.use(xssSanitize);

// 10 días de expiración para la sesión
app.use(
  session({
    secret: process.env.SESSION_SECRET || "250ef31f54d7cc16c8bf94f9d46421a91e78426f3d5889f17ec01384140142d1",
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

// Front-End
// Páginas con direcciones limpias (/login, /inicio, ...) → routes/pageRoutes.js
app.use(pageRoutes);
// Estilos y scripts (/css/..., /js/...). index: false evita entregar páginas por otra vía
app.use(express.static(carpetaFrontEnd, { index: false }));

// Manejador básico de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada en el servidor." });
});

export default app;
