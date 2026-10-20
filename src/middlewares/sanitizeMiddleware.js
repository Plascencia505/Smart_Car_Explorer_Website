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
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};
