// ===== Smart Car Explorer · Funcionalidades de "Gestión" =====
// Requiere: Leaflet, js/config.js y js/api.js
//
// Órdenes (Socket.IO → servidor → MQTT):
//   - "manual_control" → <prefijo>/control  (W, A, S, D, STOP)
//   - "navigate_to"    → <prefijo>/navigate (destino)
// Posición y estado del robot: GET /api/telemetry/latest + "new_telemetry"

/* ------------------------------------------------------------------
   1. ESTADO GENERAL
------------------------------------------------------------------ */
const estado = {
  robotEncendido: false,
  conectado: false,        // conexión en tiempo real con el servidor
  ultimoDato: 0,           // cuándo llegó el último registro (reloj de este navegador)
  ultimaHora: null,        // fecha y hora del último registro (texto)
  modo: "manual",          // "manual" | "automatico"
  destino: null,           // { lat, lng } elegido en el mapa
  viajando: false,
  comando: "detener",      // comando manual actual
};

// Posición actual del robot (null hasta recibir la primera ubicación)
let posicionRobot = null;

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------
   2. ENVÍO DE ÓRDENES
------------------------------------------------------------------ */
function enviarComando(direccion) {
  const enviado = emitir(CONFIG.EVENTOS.controlManual, CONFIG.formatoComando(CONFIG.COMANDOS[direccion]));
  if (!enviado) mostrarAvisoFlotante("Sin conexión con el servidor: la orden no se envió.");
  return enviado;
}

function enviarDestino(lat, lng) {
  const enviado = emitir(CONFIG.EVENTOS.navegarA, CONFIG.formatoDestino(lat, lng));
  if (!enviado) mostrarAvisoFlotante("Sin conexión con el servidor: el destino no se envió.");
  return enviado;
}

/* ------------------------------------------------------------------
   3. AVISO FLOTANTE
------------------------------------------------------------------ */
let temporizadorAvisoFlotante = null;
function mostrarAvisoFlotante(texto, ms = 3500) {
  const aviso = $("avisoFlotante");
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(temporizadorAvisoFlotante);
  temporizadorAvisoFlotante = setTimeout(() => { aviso.hidden = true; }, ms);
}

/* ------------------------------------------------------------------
   4. MODOS DE OPERACIÓN
------------------------------------------------------------------ */
const btnManual = $("modoManual");
const btnAutomatico = $("modoAutomatico");
const panelManual = $("panelManual");
const panelAutomatico = $("panelAutomatico");

function cambiarModo(modo) {
  if (modo === estado.modo || !estado.robotEncendido) return;

  if (estado.viajando) {
    const ok = confirm("Cambiar a modo manual cancelará el viaje en curso. ¿Deseas continuar?");
    if (!ok) return;
    cancelarViaje("Cancelado");
  }
  detenerManual();

  estado.modo = modo;
  pintarModo();
}

function pintarModo() {
  const manual = estado.modo === "manual";
  btnManual.classList.toggle("activo", manual);
  btnAutomatico.classList.toggle("activo", !manual);
  btnManual.setAttribute("aria-selected", manual);
  btnAutomatico.setAttribute("aria-selected", !manual);
  panelManual.hidden = !manual;
  panelAutomatico.hidden = manual;
  if (!manual) prepararMapa();
}

btnManual.addEventListener("click", () => cambiarModo("manual"));
btnAutomatico.addEventListener("click", () => cambiarModo("automatico"));

/* ------------------------------------------------------------------
   5. MODO MANUAL (joystick)
   Al presionar una flecha se envía su comando UNA vez, y al soltarla se
   envía STOP. No se repite mientras está presionada para no saturar el
   enlace LoRa (que tiene poco ancho de banda).
------------------------------------------------------------------ */
const joystick = $("joystick");
const flechas = [...document.querySelectorAll(".flecha")];
const comandoActual = $("comandoActual");

const TEXTO_COMANDO = {
  "detener": "Detenido",
  "adelante": "Avanzando",
  "atras": "Retrocediendo",
  "izquierda": "Girando a la izquierda",
  "derecha": "Girando a la derecha",
};

function iniciarComando(dir) {
  if (!estado.robotEncendido || estado.modo !== "manual" || estado.comando === dir) return;
  if (!enviarComando(dir)) return;
  estado.comando = dir;
  flechas.forEach((f) => f.classList.toggle("presionada", f.dataset.dir === dir));
  comandoActual.textContent = TEXTO_COMANDO[dir];
}

function detenerManual() {
  flechas.forEach((f) => f.classList.remove("presionada"));
  if (estado.comando !== "detener") {
    estado.comando = "detener";
    enviarComando("detener");
  }
  comandoActual.textContent = estado.robotEncendido ? TEXTO_COMANDO.detener : "Robot no encendido";
}

// Mouse y pantalla táctil
flechas.forEach((f) => {
  f.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    f.setPointerCapture(e.pointerId);
    iniciarComando(f.dataset.dir);
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) =>
    f.addEventListener(ev, () => { if (estado.comando === f.dataset.dir) detenerManual(); })
  );
  f.addEventListener("contextmenu", (e) => e.preventDefault()); // evita el menú al mantener presionado en celular
});

// Teclado: W A S D o flechas. Solo hay 4 direcciones (sin diagonales):
// si se presionan dos teclas, manda la última que se presionó.
const TECLAS = {
  w: "adelante", arrowup: "adelante",
  s: "atras", arrowdown: "atras",
  a: "izquierda", arrowleft: "izquierda",
  d: "derecha", arrowright: "derecha",
};
const teclasPresionadas = [];   // en orden: la última es la que manda

function direccionDesdeTeclas() {
  return teclasPresionadas.at(-1) || "detener";
}

function alCambiarTeclas() {
  const dir = direccionDesdeTeclas();
  if (dir === "detener") detenerManual(); else iniciarComando(dir);
}

document.addEventListener("keydown", (e) => {
  const tecla = TECLAS[e.key.toLowerCase()];
  if (!tecla || estado.modo !== "manual" || e.target.closest("input, select, textarea")) return;
  e.preventDefault();          // evita que las flechas muevan la página
  if (e.repeat) return;
  if (!teclasPresionadas.includes(tecla)) teclasPresionadas.push(tecla);
  alCambiarTeclas();
});

document.addEventListener("keyup", (e) => {
  const tecla = TECLAS[e.key.toLowerCase()];
  if (!tecla) return;
  const i = teclasPresionadas.indexOf(tecla);
  if (i >= 0) teclasPresionadas.splice(i, 1);
  alCambiarTeclas();
});

// Si la ventana pierde el foco, el robot se detiene
window.addEventListener("blur", () => { teclasPresionadas.length = 0; detenerManual(); });

/* ------------------------------------------------------------------
   6. MODO AUTOMÁTICO (mapa)
------------------------------------------------------------------ */
const btnDirigir = $("btnDirigir");
const contenedorMapa = $("mapaGestion");
const sinRobot = $("sinRobot");
const rutaDatos = $("rutaDatos");
const instruccionAuto = $("instruccionAuto");

let mapa = null, marcadorRobot = null, marcadorDestino = null, lineaRuta = null, lineaRecorrido = null;

const ICONO_ROBOT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="8" width="16" height="10" rx="2"/><path d="M12 8V4M9 4h6"/>
  <circle cx="9" cy="13" r="1.3" fill="currentColor"/><circle cx="15" cy="13" r="1.3" fill="currentColor"/></svg>`;

// El mapa se crea la primera vez que se abre el modo automático
function prepararMapa() {
  if (!estado.robotEncendido) return;
  if (mapa) { mapa.invalidateSize(); return; }

  const centro = posicionRobot ? [posicionRobot.lat, posicionRobot.lng] : CONFIG.CENTRO_MAPA_INICIAL;
  mapa = L.map("mapaGestion").setView(centro, 18);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  L.control.scale({ imperial: false }).addTo(mapa);

  marcadorRobot = L.marker(centro, {
    icon: L.divIcon({ className: "", html: `<div class="marcador-robot">${ICONO_ROBOT}</div>`, iconSize: [36, 36], iconAnchor: [18, 18] }),
    title: "Posición actual del robot",
    zIndexOffset: 1000,
  }).addTo(mapa);

  const acento = getComputedStyle(document.documentElement).getPropertyValue("--acento").trim() || "#e8792f";
  lineaRecorrido = L.polyline([], { color: acento, weight: 4, opacity: .9 }).addTo(mapa);
  lineaRuta = L.polyline([], { color: "#c0392b", weight: 3, dashArray: "8 8" }).addTo(mapa);

  mapa.on("click", (e) => {
    if (estado.viajando || !estado.robotEncendido) return;
    elegirDestino(e.latlng);
  });
}

function elegirDestino(latlng) {
  estado.destino = { lat: latlng.lat, lng: latlng.lng };

  if (!marcadorDestino) {
    marcadorDestino = L.marker([latlng.lat, latlng.lng], {
      draggable: true,
      icon: L.divIcon({ className: "", html: '<div class="marcador-destino"></div>', iconSize: [30, 30], iconAnchor: [15, 30] }),
      title: "Destino (puedes arrastrarlo)",
    }).addTo(mapa);
    marcadorDestino.on("drag", () => {
      const p = marcadorDestino.getLatLng();
      estado.destino = { lat: p.lat, lng: p.lng };
      actualizarRuta();
    });
  } else {
    marcadorDestino.setLatLng([latlng.lat, latlng.lng]);
  }

  lineaRecorrido.setLatLngs([]);
  btnDirigir.disabled = false;
  $("datoEstadoRuta").textContent = "Destino seleccionado";
  actualizarRuta();
}

// Planificación: línea recta del robot al destino, distancia y tiempo estimado
function actualizarRuta() {
  if (!estado.destino || !posicionRobot) {
    lineaRuta?.setLatLngs([]);
    $("datoDestino").textContent = "Sin seleccionar";
    $("datoDistanciaRuta").textContent = "--";
    $("datoTiempo").textContent = "--";
    return;
  }
  const d = distanciaMetros(posicionRobot, estado.destino);
  lineaRuta.setLatLngs([[posicionRobot.lat, posicionRobot.lng], [estado.destino.lat, estado.destino.lng]]);
  $("datoDestino").textContent = `${estado.destino.lat.toFixed(6)}, ${estado.destino.lng.toFixed(6)}`;
  $("datoDistanciaRuta").textContent = d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${d.toFixed(0)} m`;
  $("datoTiempo").textContent = formatearTiempo(d / CONFIG.VELOCIDAD_ROBOT);
}

function formatearTiempo(segundos) {
  if (segundos < 60) return `${Math.ceil(segundos)} s`;
  const m = Math.floor(segundos / 60), s = Math.round(segundos % 60);
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

// Distancia en metros entre dos puntos GPS (fórmula de Haversine)
function distanciaMetros(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ---- Botón "Dirigir robot" / "Cancelar" ---- */
function pintarBotonDirigir() {
  btnDirigir.classList.toggle("cancelar", estado.viajando);
  btnDirigir.querySelector("span").textContent = estado.viajando ? "Cancelar" : "Dirigir robot";
  btnDirigir.querySelector("svg").innerHTML = estado.viajando
    ? '<path d="M6 6l12 12M18 6L6 18"/>'
    : '<path d="M3 11l18-8-8 18-2-8-8-2z"/>';
  btnDirigir.disabled = !estado.robotEncendido || (!estado.viajando && !estado.destino);
}

btnDirigir.addEventListener("click", () => {
  if (estado.viajando) cancelarViaje("Cancelado");
  else iniciarViaje();
});

function iniciarViaje() {
  if (!estado.destino || !estado.robotEncendido) return;
  if (!enviarDestino(estado.destino.lat, estado.destino.lng)) return;
  estado.viajando = true;

  marcadorDestino.dragging.disable();
  contenedorMapa.classList.add("viajando");
  lineaRecorrido.setLatLngs(posicionRobot ? [[posicionRobot.lat, posicionRobot.lng]] : []);
  instruccionAuto.textContent = "El robot se dirige al destino. Puedes cancelar el viaje en cualquier momento.";
  $("datoEstadoRuta").textContent = "En camino";
  pintarBotonDirigir();
}

// Se llama con cada ubicación nueva que manda el robot
function moverRobotEnMapa(lat, lng) {
  posicionRobot = { lat, lng };
  if (!marcadorRobot) return;          // el mapa aún no se ha abierto
  marcadorRobot.setLatLng([lat, lng]);
  if (estado.viajando) {
    lineaRecorrido.addLatLng([lat, lng]);
    if (distanciaMetros(posicionRobot, estado.destino) <= CONFIG.METROS_LLEGADA) {
      llegarADestino();
      return;
    }
  }
  actualizarRuta();
}

function terminarViaje() {
  estado.viajando = false;
  contenedorMapa.classList.remove("viajando");
  instruccionAuto.textContent = "Selecciona en el mapa el sitio donde quieres que el vehículo se dirija.";
}

function llegarADestino() {
  terminarViaje();
  marcadorDestino.remove();
  marcadorDestino = null;
  estado.destino = null;
  actualizarRuta();
  $("datoEstadoRuta").textContent = "Llegó al destino";
  pintarBotonDirigir();
  mostrarAvisoFlotante("✔ El robot llegó a su destino.");
}

function cancelarViaje(motivo) {
  if (!estado.viajando) return;
  terminarViaje();
  // El servidor no tiene una orden de "cancelar": se detiene el robot con STOP
  enviarComando("detener");
  marcadorDestino.dragging.enable();   // el destino se conserva por si se quiere reanudar
  $("datoEstadoRuta").textContent = motivo;
  pintarBotonDirigir();
  mostrarAvisoFlotante(`Viaje ${motivo.toLowerCase()}. El robot se detuvo.`);
}

/* ------------------------------------------------------------------
   7. ROBOT ENCENDIDO / APAGADO
   El servidor no publica un estado del robot, así que se deduce:
   está encendido si llegó un registro en los últimos
   CONFIG.SEGUNDOS_ROBOT_APAGADO segundos y hay conexión con el servidor.
------------------------------------------------------------------ */
function actualizarEstadoRobot(encendido) {
  const cambio = encendido !== estado.robotEncendido;
  estado.robotEncendido = encendido;

  $("pastillaEstado").classList.toggle("apagado", !encendido);
  $("textoEstado").textContent = encendido
    ? "Robot encendido"
    : !estado.conectado
      ? "Sin conexión con el servidor"
      : estado.ultimaHora
        ? `Robot apagado · último dato: ${estado.ultimaHora}`
        : "Robot apagado · sin datos todavía";

  if (!cambio) return;   // sin cambio: solo se actualizó el texto

  // Botones de modo
  btnManual.disabled = btnAutomatico.disabled = !encendido;

  // Joystick
  if (!encendido) { teclasPresionadas.length = 0; detenerManual(); }
  flechas.forEach((f) => { f.disabled = !encendido; });
  joystick.classList.toggle("apagado", !encendido);
  comandoActual.textContent = encendido ? TEXTO_COMANDO[estado.comando] : "Robot no encendido";

  // Mapa: se retira y se muestra "Robot no encendido"
  if (!encendido && estado.viajando) cancelarViaje("Interrumpido");
  contenedorMapa.hidden = !encendido;
  rutaDatos.hidden = !encendido;
  sinRobot.hidden = encendido;
  instruccionAuto.textContent = encendido
    ? "Selecciona en el mapa el sitio donde quieres que el vehículo se dirija."
    : "El robot no está encendido. El mapa volverá a aparecer cuando esté operativo.";
  if (encendido && estado.modo === "automatico") prepararMapa();

  pintarBotonDirigir();
}

function revisarEstadoRobot() {
  const reciente = Date.now() - estado.ultimoDato < CONFIG.SEGUNDOS_ROBOT_APAGADO * 1000;
  actualizarEstadoRobot(estado.conectado && reciente);
}

function registrarDato(registro, recibidoAhora) {
  estado.ultimoDato = recibidoAhora ? Date.now() : registro.ts;
  estado.ultimaHora = `${registro.fecha} ${registro.hora}`;
  moverRobotEnMapa(registro.latitud, registro.longitud);
  revisarEstadoRobot();
}

/* ------------------------------------------------------------------
   8. INICIO
------------------------------------------------------------------ */
pintarModo();
estado.robotEncendido = true;      // para que el primer cálculo aplique el estado "apagado"
actualizarEstadoRobot(false);

conectarTiempoReal({
  alRecibirRegistro: (registro) => registrarDato(registro, true),
  alCambiarConexion(conectado) {
    estado.conectado = conectado;
    revisarEstadoRobot();
  },
});

// Última ubicación conocida (para centrar el mapa y saber si el robot está activo)
api.ultimo()
  .then((registro) => { if (registro) registrarDato(registro, false); })
  .catch((err) => console.error("No se pudo obtener el último registro:", err.message));

setInterval(revisarEstadoRobot, 1000);
