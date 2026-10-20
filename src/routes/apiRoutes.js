// src/routes/apiRoutes.js
import { Router } from "express";
import {
  getTelemetry,
  getLatestTelemetry,
  deleteTelemetry,
  exportTelemetry,
} from "../controllers/telemetryController.js";
import { isAuthenticated, isAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

// Todas las rutas de la API requieren que el usuario haya iniciado sesión
router.use(isAuthenticated);

// Endpoints de consulta y exportación de datos
router.get("/", getTelemetry);
router.get("/latest", getLatestTelemetry);
router.get("/export", exportTelemetry);

// Endpoint de eliminación restringido estrictamente a cuentas de Administrador
router.delete("/:id", isAdmin, deleteTelemetry);

export default router;
