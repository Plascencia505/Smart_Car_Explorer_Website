// ===== Smart Car Explorer · Sesión (compartido) =====
// Requiere js/config.js. Se carga en el <head> de todas las páginas.
//
// La sesión real vive en el servidor (cookie "connect.sid", 10 días,
// guardada en MongoDB). La página solo recuerda el usuario y su rol para
// mostrar u ocultar opciones; los permisos los revisa siempre el servidor.
// Si la cookie vence, la API responde 401 y api.js manda al login.

const CLAVE_SESION = "sce-sesion";

const ROLES = {
  admin: "Administrador",
  usuario: "Usuario",
};

function obtenerSesion() {
  try {
    const texto = localStorage.getItem(CLAVE_SESION);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion) {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    return true;
  } catch {
    return false;
  }
}

function olvidarSesion() {
  try { localStorage.removeItem(CLAVE_SESION); } catch { /* sin almacenamiento */ }
}

// Cierra la sesión en el servidor y regresa al login
async function cerrarSesion() {
  try {
    await fetch(CONFIG.SERVIDOR + CONFIG.RUTAS.logout, { method: "POST", credentials: "include" });
  } catch { /* aunque falle la red, se sale de la página */ }
  olvidarSesion();
  window.location.replace(CONFIG.PAGINAS.login);
}

// Manda al login recordando a qué página se quería entrar
function irAlLogin() {
  olvidarSesion();
  const pagina = location.pathname;
  location.replace(esPaginaDelSitio(pagina)
    ? `${CONFIG.PAGINAS.login}?volver=${encodeURIComponent(pagina)}`
    : CONFIG.PAGINAS.login);
}

const esAdmin = () => obtenerSesion()?.rol === "admin";

// Solo las páginas propias del sitio (sin el login) son destinos válidos
function esPaginaDelSitio(ruta) {
  return Object.values(CONFIG.PAGINAS).includes(ruta) && ruta !== CONFIG.PAGINAS.login;
}

// Protección de la página: se ejecuta en cuanto se carga este archivo
(function protegerPagina() {
  const enLogin = location.pathname === CONFIG.PAGINAS.login;
  const sesion = obtenerSesion();

  if (!sesion && !enLogin) {
    irAlLogin();
    return;
  }
  // El rol se pone en <html data-rol="..."> para que el CSS oculte
  // lo que un "Usuario" no puede hacer (por ejemplo, borrar registros)
  if (sesion) document.documentElement.dataset.rol = sesion.rol;
})();
