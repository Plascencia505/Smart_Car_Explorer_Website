// src/routes/pageRoutes.js
//   /login  /inicio  /base-datos  /monitoreo  /gestion
import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import {
  requirePageAuth,
  redirectIfAuthenticated,
} from "../middlewares/authMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const carpetaFrontEnd = path.join(__dirname, "..", "..", "public");

const PAGINAS_PRIVADAS = {
  "/inicio": "Inicio.html",
  "/base-datos": "Base-Datos.html",
  "/monitoreo": "Monitoreo.html",
  "/gestion": "Gestion.html",
};

const TODAS_LAS_PAGINAS = {
  "/login": "Login.html",
  ...PAGINAS_PRIVADAS,
};

const RUTA_POR_ARCHIVO = Object.fromEntries(
  Object.entries(TODAS_LAS_PAGINAS).map(([ruta, archivo]) => [
    archivo.toLowerCase(),
    ruta,
  ]),
);

const router = Router();

// 1. Normalización de Trailing Slash (ej. /inicio/ -> /inicio)
router.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith("/")) {
    const rutaLimpia = req.path.slice(0, -1);
    if (TODAS_LAS_PAGINAS[rutaLimpia]) {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, rutaLimpia + query);
    }
  }
  next();
});

// Intercepción preventiva de peticiones con extensión
router.use((req, res, next) => {
  if (req.method !== "GET" || !req.path.toLowerCase().endsWith(".html")) {
    return next();
  }
  const ruta = RUTA_POR_ARCHIVO[path.basename(req.path).toLowerCase()];
  if (!ruta) return next();
  const consulta = req.originalUrl.includes("?")
    ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
    : "";
  return res.redirect(301, ruta + consulta);
});

// Raíz del sitio: redirige según el estado real de la sesión
router.get("/", (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect("/inicio");
  }
  return res.redirect("/login");
});

// Ruta pública de Login
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(carpetaFrontEnd, "Login.html"));
});

// Rutas privadas protegidas por sesión en servidor
for (const [ruta, archivo] of Object.entries(PAGINAS_PRIVADAS)) {
  router.get(ruta, requirePageAuth, (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(carpetaFrontEnd, archivo));
  });
}

export default router;