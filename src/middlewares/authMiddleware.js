// src/middlewares/authMiddleware.js

export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Acceso denegado. Inicie sesión para continuar.' });
};

export const isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'Administrador') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado. Permisos de Administrador requeridos.' });
};