// src/middlewares/authMiddleware.js

export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res
    .status(401)
    .json({ error: "Acceso denegado. Inicie sesión para continuar." });
};

export const isAdmin = (req, res, next) => {
  if (req.session && req.session.role === "Administrador") {
    return next();
  }
  return res
    .status(403)
    .json({ error: "Acceso denegado. Permisos de Administrador requeridos." });
};

// Protección a nivel servidor para las vistas HTML privadas
export const requirePageAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  const destino = encodeURIComponent(req.path);
  return res.redirect(`/login?volver=${destino}`);
};

// Evita mostrar la vista de login si ya existe una sesión activa en el servidor
export const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    const volver = req.query.volver;
    const rutasValidas = ["/inicio", "/base-datos", "/monitoreo", "/gestion"];
    if (volver && rutasValidas.includes(volver)) {
      return res.redirect(volver);
    }
    return res.redirect("/inicio");
  }
  return next();
};