// ===== Smart Car Explorer · Funcionalidades generales =====
// Requiere js/sesion.js (cargado en el <head>)

// Menú desplegable en móvil
const btnMenu = document.getElementById("btnMenu");
const menu = document.getElementById("menu");
btnMenu.addEventListener("click", () => menu.classList.toggle("abierto"));

// Botón de salida: muestra quién tiene la sesión y la cierra
const btnSalir = document.getElementById("btnSalir");
const sesionActual = obtenerSesion();
if (sesionActual) {
  const texto = `Cerrar sesión (${sesionActual.usuario} · ${ROLES[sesionActual.rol]})`;
  btnSalir.title = texto;
  btnSalir.setAttribute("aria-label", texto);
}

btnSalir.addEventListener("click", (e) => {
  e.preventDefault();
  if (confirm("¿Deseas cerrar sesión?")) cerrarSesion();
});
