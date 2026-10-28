// ===== Smart Car Explorer · Conexión con el servidor (compartido) =====
// Requiere js/config.js y js/sesion.js.
// Aquí están todas las llamadas a la API REST, la conexión en tiempo
// real (Socket.IO) y la conversión de los datos del servidor al formato
// que usan las páginas.

/* ------------------------------------------------------------------
   1. API REST
------------------------------------------------------------------ */
class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

async function llamarApi(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(CONFIG.SERVIDOR + ruta, {
      credentials: "include",   // envía la cookie de sesión
      headers: opciones.body ? { "Content-Type": "application/json" } : {},
      ...opciones,
    });
  } catch {
    throw new ErrorApi("No se pudo conectar con el servidor.", 0);
  }

  let datos = null;
  const tipo = respuesta.headers.get("Content-Type") || "";
  if (tipo.includes("application/json")) {
    try { datos = await respuesta.json(); } catch { /* respuesta vacía */ }
  }

  if (!respuesta.ok) {
    // Sesión vencida o inexistente: de vuelta al login
    if (respuesta.status === 401 && !ruta.startsWith("/api/auth")) {
      irAlLogin();
    }
    const mensaje = datos?.error || datos?.errors?.[0]?.msg || `Error del servidor (${respuesta.status}).`;
    throw new ErrorApi(mensaje, respuesta.status);
  }
  return datos;
}

const api = {
  // GET /api/telemetry → lista del más reciente al más antiguo
  async registros({ limite = 100, desde, hasta } = {}) {
    const params = new URLSearchParams({ limit: limite });
    if (desde && hasta) {
      params.set("startDate", new Date(desde).toISOString());
      params.set("endDate", new Date(hasta).toISOString());
    }
    const lista = await llamarApi(`${CONFIG.RUTAS.registros}?${params}`);
    return (lista || []).map(normalizarRegistro).filter(Boolean);
  },

  // GET /api/telemetry/latest → último registro o null si no hay
  async ultimo() {
    try {
      return normalizarRegistro(await llamarApi(CONFIG.RUTAS.ultimo));
    } catch (e) {
      if (e.estado === 404) return null;
      throw e;
    }
  },

  // DELETE /api/telemetry/:id (solo Administrador)
  borrar(id) {
    return llamarApi(CONFIG.RUTAS.borrar(id), { method: "DELETE" });
  },

  // POST /api/auth/login → { message, role }
  login(usuario, contrasena) {
    return llamarApi(CONFIG.RUTAS.login, {
      method: "POST",
      body: JSON.stringify({ username: usuario, password: contrasena }),
    });
  },
};

/* ------------------------------------------------------------------
   2. FORMATO DE LOS DATOS
   El servidor guarda (models/Telemetry.js):
     { _id, timestamp, location: { type: "Point", coordinates: [lon, lat] },
       temperature, pressure }
   Las páginas usan:
     { id, ts, fecha, hora, latitud, longitud, temperatura, presion, altura }
------------------------------------------------------------------ */
// El BMP280 entrega la presión en Pa; si llega en Pa se convierte a hPa
function presionEnHpa(valor) {
  const p = Number(valor);
  return p > 2000 ? p / 100 : p;
}

// Altura aproximada a partir de la presión (fórmula barométrica estándar).
// Depende de PRESION_NIVEL_MAR en config.js; para mayor exactitud, ajústala
// con la presión al nivel del mar del día en tu ciudad.
function alturaDesdePresion(hPa) {
  return 44330 * (1 - Math.pow(hPa / CONFIG.PRESION_NIVEL_MAR, 1 / 5.255));
}

const dosDigitos = (n) => String(n).padStart(2, "0");

function normalizarRegistro(doc) {
  if (!doc) return null;
  const [lon, lat] = doc.location?.coordinates || [];
  const fechaHora = new Date(doc.timestamp);
  if (Number.isNaN(fechaHora.getTime())) return null;
  const presion = presionEnHpa(doc.pressure);

  return {
    id: doc._id,
    ts: fechaHora.getTime(),
    fecha: `${fechaHora.getFullYear()}-${dosDigitos(fechaHora.getMonth() + 1)}-${dosDigitos(fechaHora.getDate())}`,
    hora: fechaHora.toTimeString().slice(0, 8),
    latitud: Number(lat),
    longitud: Number(lon),
    temperatura: Number(doc.temperature),
    presion,
    altura: alturaDesdePresion(presion),
  };
}

/* ------------------------------------------------------------------
   3. TIEMPO REAL (Socket.IO)
   El cliente de Socket.IO lo entrega el mismo servidor en
   /socket.io/socket.io.js (se incluye en cada página que lo usa).
------------------------------------------------------------------ */
let socket = null;

function conectarTiempoReal({ alRecibirRegistro, alCambiarConexion } = {}) {
  if (typeof io !== "function") {
    console.error("No se cargó Socket.IO (/socket.io/socket.io.js).");
    alCambiarConexion?.(false);
    return null;
  }
  socket = io(CONFIG.SERVIDOR || undefined, { withCredentials: true });
  socket.on("connect", () => alCambiarConexion?.(true));
  socket.on("disconnect", () => alCambiarConexion?.(false));
  socket.on("connect_error", () => alCambiarConexion?.(false));
  socket.on(CONFIG.EVENTOS.nuevoRegistro, (doc) => {
    const registro = normalizarRegistro(doc);
    if (registro) alRecibirRegistro?.(registro);
  });
  return socket;
}

function emitir(evento, datos) {
  if (!socket || !socket.connected) return false;
  socket.emit(evento, datos);
  return true;
}

/* ------------------------------------------------------------------
   4. INDICADOR DE CONEXIÓN ("En vivo" / "Sin conexión")
------------------------------------------------------------------ */
function pintarConexion(elemento, conectado) {
  if (!elemento) return;
  elemento.classList.toggle("desconectado", !conectado);
  const texto = elemento.querySelector(".texto-conexion");
  if (texto) texto.textContent = conectado ? "En vivo" : "Sin conexión con el servidor";
}
