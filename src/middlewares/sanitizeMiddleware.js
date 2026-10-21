// src/middlewares/sanitizeMiddleware.js
import sanitizeHtml from "sanitize-html";

const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return sanitizeHtml(value, {
      allowedTags: [], // No permite ninguna etiqueta HTML
      allowedAttributes: {}, // No permite ningún atributo
    });
  }

  if (typeof value === "object" && value !== null) {
    // Manejo de arreglos
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item));
    }
    // Manejo de objetos iterables
    const cleanObject = {};
    for (const key in value) {
      cleanObject[key] = sanitizeValue(value[key]);
    }
    return cleanObject;
  }

  return value;
};

export const xssSanitize = (req, res, next) => {
  // express.json() permite reasignar req.body por completo sin problema
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // req.query y req.params son getters en Express 5, mutamos sus propiedades individualmente
  if (req.query) {
    for (const key in req.query) {
      req.query[key] = sanitizeValue(req.query[key]);
    }
  }

  if (req.params) {
    for (const key in req.params) {
      req.params[key] = sanitizeValue(req.params[key]);
    }
  }

  next();
};
