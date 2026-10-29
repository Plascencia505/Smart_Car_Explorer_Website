// src/routes/authRoutes.js
import { Router } from "express";
import { body, validationResult } from "express-validator";
import { register, login, logout } from "../controllers/authController.js";

const router = Router();

// Middleware local para interceptar errores de validación
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Rutas expuestas con sanitización y reglas estrictas
router.post(
  "/register",
  [
    body("username")
      .trim()
      .notEmpty()
      .escape()
      .withMessage("El usuario es obligatorio."),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("El formato de correo es inválido."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("La contraseña debe tener mínimo 8 caracteres."),
  ],
  validateRequest,
  register,
);

router.post(
  "/login",
  [body("username").trim().notEmpty().escape(), body("password").notEmpty()],
  validateRequest,
  login,
);

router.post("/logout", logout);

export default router;
