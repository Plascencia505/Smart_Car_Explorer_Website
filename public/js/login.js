// ===== Smart Car Explorer · Inicio de sesión =====
// Requiere js/config.js, js/sesion.js y js/api.js
// Valida contra el servidor: POST /api/auth/login { username, password }
// Si es correcto, el servidor crea la sesión (cookie) y responde el rol.

const $ = (id) => document.getElementById(id);
const form = $("formLogin");
const inputUsuario = $("usuario");
const inputContrasena = $("contrasena");
const errorLogin = $("errorLogin");
const btnIngresar = $("btnIngresar");

// Página a la que se regresa después de iniciar sesión (solo páginas del sitio)
function paginaDestino() {
  const volver = new URLSearchParams(location.search).get("volver") || "";
  return esPaginaDelSitio(volver) ? volver : CONFIG.PAGINAS.inicio;
}

// Si ya hay sesión guardada, no tiene caso mostrar el login
// Si el servidor nos expulsó de una página privada, la URL tendrá "?volver="
// Eso significa que la sesión caducó en el backend. Borramos la local.
if (new URLSearchParams(location.search).has("volver")) {
  olvidarSesion();
} else if (obtenerSesion()) {
  location.replace(paginaDestino());
}

/* ---------- Mensajes de error ---------- */
function mostrarError(mensaje, campo) {
  errorLogin.textContent = mensaje;
  errorLogin.hidden = false;
  [inputUsuario, inputContrasena].forEach((i) => i.closest(".entrada").classList.remove("invalido"));
  if (campo) {
    campo.closest(".entrada").classList.add("invalido");
    campo.focus();
  }
}

function limpiarError() {
  errorLogin.hidden = true;
  [inputUsuario, inputContrasena].forEach((i) => i.closest(".entrada").classList.remove("invalido"));
}

[inputUsuario, inputContrasena].forEach((i) => i.addEventListener("input", limpiarError));

/* ---------- Envío del formulario ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = inputUsuario.value.trim();
  const contrasena = inputContrasena.value;

  if (!usuario) return mostrarError("Escribe tu usuario.", inputUsuario);
  if (!contrasena) return mostrarError("Escribe tu contraseña.", inputContrasena);

  limpiarError();
  btnIngresar.disabled = true;
  btnIngresar.classList.add("cargando");

  try {
    const respuesta = await api.login(usuario, contrasena);
    const rol = respuesta?.role === CONFIG.ROL_ADMIN ? "admin" : "usuario";
    guardarSesion({ usuario, rol, inicio: new Date().toISOString() });
    location.replace(paginaDestino());
  } catch (err) {
    if (err.estado === 401 || err.estado === 400) {
      // El servidor no dice cuál de los dos campos está mal, por seguridad
      inputContrasena.value = "";
      mostrarError("Usuario o contraseña incorrectos.", inputContrasena);
    } else if (err.estado === 0) {
      mostrarError("No se pudo conectar con el servidor. Revisa que esté encendido.");
    } else {
      mostrarError(err.message || "Ocurrió un error al iniciar sesión. Intenta de nuevo.");
    }
  } finally {
    btnIngresar.disabled = false;
    btnIngresar.classList.remove("cargando");
  }
});

/* ---------- Mostrar / ocultar contraseña ---------- */
const btnVer = $("btnVer");
const OJO = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
const OJO_TACHADO = '<path d="M2 12s3.5-7 10-7c2 0 3.7.6 5.1 1.5M22 12s-3.5 7-10 7c-2 0-3.7-.6-5.1-1.5"/><path d="M3 3l18 18"/>';

btnVer.addEventListener("click", () => {
  const visible = inputContrasena.type === "text";
  inputContrasena.type = visible ? "password" : "text";
  btnVer.querySelector("svg").innerHTML = visible ? OJO : OJO_TACHADO;
  const texto = visible ? "Mostrar contraseña" : "Ocultar contraseña";
  btnVer.title = texto;
  btnVer.setAttribute("aria-label", texto);
  inputContrasena.focus();
});

/* ---------- Aviso de Bloq Mayús ---------- */
const avisoMayus = $("avisoMayus");
["keydown", "keyup"].forEach((ev) =>
  inputContrasena.addEventListener(ev, (e) => {
    if (e.getModifierState) avisoMayus.hidden = !e.getModifierState("CapsLock");
  })
);
inputContrasena.addEventListener("blur", () => { avisoMayus.hidden = true; });

inputUsuario.focus();
