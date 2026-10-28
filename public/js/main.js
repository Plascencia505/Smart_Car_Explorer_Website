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

// Botón de salida modificado con SweetAlert2
btnSalir.addEventListener("click", async (e) => {
  e.preventDefault();
  const confirmar = await confirmarSwal("¿Deseas cerrar sesión de forma segura?", "Cerrar sesión");
  if (confirmar) cerrarSesion();
});

// ===== SweetAlert2 Helpers Globales (Tema Oscuro / Coherente con el sitio) =====
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: "#1a1a1a",
  color: "#f0f0f0",
});

async function confirmarSwal(mensaje, titulo = "¿Estás seguro?") {
  const resultado = await Swal.fire({
    title: titulo,
    text: mensaje,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#e8792f", // Color acento de tu app
    cancelButtonColor: "#444444",
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
    background: "#1a1a1a",
    color: "#f0f0f0",
  });
  return resultado.isConfirmed;
}

async function alertaSwal(mensaje, tipo = "info", titulo = "") {
  await Swal.fire({
    title: titulo,
    text: mensaje,
    icon: tipo,
    confirmButtonColor: "#e8792f",
    background: "#1a1a1a",
    color: "#f0f0f0",
  });
}
