// src/routes/pageRoutes.js
// Direcciones limpias para las páginas del Front-End (sin ".html").
//   /login  /inicio  /base-datos  /monitoreo  /gestion
import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const carpetaFrontEnd = path.join(__dirname, "..", "..", "public");

// dirección → archivo dentro de public/
const PAGINAS = {
  "/login": "Login.html",
  "/inicio": "Inicio.html",
  "/base-datos": "Base-Datos.html",
  "/monitoreo": "Monitoreo.html",
  "/gestion": "Gestion.html",
};

const router = Router();

// La raíz del sitio manda al login
router.get("/", (req, res) => res.redirect("/login"));

// Cada dirección limpia entrega su archivo HTML
for (const [ruta, archivo] of Object.entries(PAGINAS)) {
  router.get(ruta, (req, res) => res.sendFile(path.join(carpetaFrontEnd, archivo)));
}

// Si alguien escribe el nombre del archivo (ej. /Monitoreo.html), se le
// manda a la dirección limpia para que nunca se vea ".html"
const RUTA_POR_ARCHIVO = Object.fromEntries(
  Object.entries(PAGINAS).map(([ruta, archivo]) => [archivo.toLowerCase(), ruta]),
);
router.use((req, res, next) => {
  if (req.method !== "GET" || !req.path.toLowerCase().endsWith(".html")) return next();
  const ruta = RUTA_POR_ARCHIVO[path.basename(req.path).toLowerCase()];
  if (!ruta) return next();
  const consulta = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  res.redirect(301, ruta + consulta);
});

export default router;
