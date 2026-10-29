// ===== Smart Car Explorer · Registro de nuevo usuario =====
// Requiere js/config.js, js/sesion.js, js/api.js y SweetAlert2
// Valida y envía a: POST /api/auth/register { username, email, password }

const $ = (id) => document.getElementById(id);
const form = $("formRegistro");
const inputUsuario = $("usuario");
const inputCorreo = $("correo");
const inputContrasena = $("contrasena");
const inputConfirmar = $("confirmarContrasena");
const errorRegistro = $("errorRegistro");
const btnRegistrar = $("btnRegistrar");

const campos = [inputUsuario, inputCorreo, inputContrasena, inputConfirmar];

// Si ya hay sesión guardada en el cliente, manda directo a /inicio
if (obtenerSesion()) location.replace(CONFIG.PAGINAS.inicio);

/* ---------- Mensajes de error ---------- */
function mostrarError(mensaje, campo) {
  errorRegistro.textContent = mensaje;
  errorRegistro.hidden = false;
  campos.forEach((i) => i.closest(".entrada").classList.remove("invalido"));
  if (campo) {
    campo.closest(".entrada").classList.add("invalido");
    campo.focus();
  }
}

function limpiarError() {
  errorRegistro.hidden = true;
  campos.forEach((i) => i.closest(".entrada").classList.remove("invalido"));
}

campos.forEach((i) => i.addEventListener("input", limpiarError));

/* ---------- Validación y envío del formulario ---------- */
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuario = inputUsuario.value.trim();
  const correo = inputCorreo.value.trim();
  const contrasena = inputContrasena.value;
  const confirmar = inputConfirmar.value;

  if (!usuario)
    return mostrarError("Escribe un nombre de usuario.", inputUsuario);
  if (!correo || !REGEX_CORREO.test(correo)) {
    return mostrarError("Escribe un correo electrónico válido.", inputCorreo);
  }
  if (contrasena.length < 6) {
    return mostrarError(
      "La contraseña debe tener al menos 6 caracteres.",
      inputContrasena,
    );
  }
  if (contrasena !== confirmar) {
    return mostrarError("Las contraseñas no coinciden.", inputConfirmar);
  }

  limpiarError();
  btnRegistrar.disabled = true;
  btnRegistrar.classList.add("cargando");

  try {
    await api.registrar(usuario, correo, contrasena);

    if (typeof Swal !== "undefined") {
      await Swal.fire({
        title: "¡Cuenta creada!",
        text: "Tu usuario ha sido registrado exitosamente. Ahora puedes iniciar sesión.",
        icon: "success",
        confirmButtonColor: "#e8792f",
        confirmButtonText: "Ir a iniciar sesión",
        background: "#1a1a1a",
        color: "#f0f0f0",
      });
    }

    location.replace(CONFIG.PAGINAS.login);
  } catch (err) {
    if (err.estado === 0) {
      mostrarError(
        "No se pudo conectar con el servidor. Revisa que esté encendido.",
      );
    } else {
      mostrarError(
        err.message || "No se pudo completar el registro. Intenta de nuevo.",
      );
    }
  } finally {
    btnRegistrar.disabled = false;
    btnRegistrar.classList.remove("cargando");
  }
});

/* ---------- Mostrar / ocultar contraseña ---------- */
const OJO =
  '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
const OJO_TACHADO =
  '<path d="M2 12s3.5-7 10-7c2 0 3.7.6 5.1 1.5M22 12s-3.5 7-10 7c-2 0-3.7-.6-5.1-1.5"/><path d="M3 3l18 18"/>';

function alternarVisibilidad(input, boton) {
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  boton.querySelector("svg").innerHTML = visible ? OJO : OJO_TACHADO;
  const texto = visible ? "Mostrar contraseña" : "Ocultar contraseña";
  boton.title = texto;
  boton.setAttribute("aria-label", texto);
  input.focus();
}

$("btnVer").addEventListener("click", () =>
  alternarVisibilidad(inputContrasena, $("btnVer")),
);
$("btnVerConfirmar").addEventListener("click", () =>
  alternarVisibilidad(inputConfirmar, $("btnVerConfirmar")),
);

/* ---------- Aviso de Bloq Mayús ---------- */
function vigilarBloqMayus(input, aviso) {
  ["keydown", "keyup"].forEach((ev) =>
    input.addEventListener(ev, (e) => {
      if (e.getModifierState) aviso.hidden = !e.getModifierState("CapsLock");
    }),
  );
  input.addEventListener("blur", () => {
    aviso.hidden = true;
  });
}

vigilarBloqMayus(inputContrasena, $("avisoMayus"));
vigilarBloqMayus(inputConfirmar, $("avisoMayusConfirmar"));

inputUsuario.focus();
