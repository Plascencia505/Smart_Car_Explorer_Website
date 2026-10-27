// ===== Smart Car Explorer · Funcionalidades de "Monitoreo" =====
// Requiere: Chart.js, Leaflet, js/config.js, js/api.js y js/grafica-vivo.js
//
// Datos: GET /api/telemetry (últimos minutos) + evento "new_telemetry"

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------
   1. REGISTROS (del más antiguo al más reciente)
------------------------------------------------------------------ */
let registros = [];

const colorCSS = (nombre, respaldo) =>
  getComputedStyle(document.documentElement).getPropertyValue(nombre).trim() || respaldo;

/* ------------------------------------------------------------------
   2. GRÁFICAS DE PRESIÓN Y TEMPERATURA (ver js/grafica-vivo.js)
------------------------------------------------------------------ */
const graficaPresion = crearGraficaEnVivo({
  canvas: "graficaPresion",
  selector: "intervaloPresion",
  aviso: "avisoPresion",
  avisoTexto: "avisoTextoPresion",
  valorActual: "actualPresion",
  campo: "presion",
  nombre: "Presión",
  unidad: "hPa",
  decimales: 1,
  color: colorCSS("--color-presion", "#3b6fd8"),
  obtenerRegistros: () => registros,
});

const graficaTemperatura = crearGraficaEnVivo({
  canvas: "graficaTemperatura",
  selector: "intervaloTemperatura",
  aviso: "avisoTemperatura",
  avisoTexto: "avisoTextoTemperatura",
  valorActual: "actualTemperatura",
  campo: "temperatura",
  nombre: "Temperatura",
  unidad: "°C",
  decimales: 1,
  color: colorCSS("--color-temperatura", "#d9483b"),
  obtenerRegistros: () => registros,
});

/* ------------------------------------------------------------------
   3. MAPA (Leaflet + OpenStreetMap)
------------------------------------------------------------------ */
const ZOOM_INICIAL = 18;
const mapa = L.map("mapa", { zoomControl: true }).setView(CONFIG.CENTRO_MAPA_INICIAL, 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(mapa);
L.control.scale({ imperial: false }).addTo(mapa);

// Recorrido (rastro) del robot
const rastro = L.polyline([], { color: colorCSS("--acento", "#e8792f"), weight: 4, opacity: .85 }).addTo(mapa);

// Punto donde empieza el recorrido mostrado
const marcadorInicio = L.marker(CONFIG.CENTRO_MAPA_INICIAL, {
  icon: L.divIcon({ className: "", html: '<div class="marcador-inicio"></div>', iconSize: [14, 14], iconAnchor: [7, 7] }),
  title: "Inicio del recorrido",
});

// Marcador del robot (aparece con la primera ubicación)
const ICONO_ROBOT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="8" width="16" height="10" rx="2"/><path d="M12 8V4M9 4h6"/>
  <circle cx="9" cy="13" r="1.3" fill="currentColor"/><circle cx="15" cy="13" r="1.3" fill="currentColor"/></svg>`;

const marcadorRobot = L.marker(CONFIG.CENTRO_MAPA_INICIAL, {
  icon: L.divIcon({ className: "", html: `<div class="marcador-robot">${ICONO_ROBOT}</div>`, iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20] }),
  title: "Smart Car Explorer",
  zIndexOffset: 1000,
});
marcadorRobot.bindPopup("");

/* ---- Controles del mapa ---- */
const chkSeguir = $("seguirRobot");
const chkRastro = $("mostrarRastro");

mapa.on("dragstart", () => { chkSeguir.checked = false; });

chkSeguir.addEventListener("change", () => {
  if (chkSeguir.checked && registros.length) mapa.panTo(marcadorRobot.getLatLng());
});

chkRastro.addEventListener("change", () => {
  if (chkRastro.checked) {
    rastro.addTo(mapa);
    if (registros.length) marcadorInicio.addTo(mapa);
  } else {
    rastro.remove();
    marcadorInicio.remove();
  }
});

$("btnCentrar").addEventListener("click", () => {
  if (!registros.length) return;
  mapa.setView(marcadorRobot.getLatLng(), Math.max(mapa.getZoom(), ZOOM_INICIAL - 1));
  chkSeguir.checked = true;
});

/* ---- Datos debajo del mapa ---- */
// Distancia en metros entre dos puntos GPS (fórmula de Haversine)
function distanciaMetros(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.latitud - a.latitud) * rad;
  const dLon = (b.longitud - a.longitud) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(a.latitud * rad) * Math.cos(b.latitud * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

let distanciaTotal = 0;

function contenidoPopup(r) {
  return `<div class="popup-robot">
    <strong>Smart Car Explorer</strong>
    Lat: ${r.latitud.toFixed(6)}<br>
    Lon: ${r.longitud.toFixed(6)}<br>
    Temperatura: ${r.temperatura.toFixed(1)} °C<br>
    Presión: ${r.presion.toFixed(1)} hPa<br>
    ${r.fecha} ${r.hora}
  </div>`;
}

function actualizarDatosMapa() {
  const r = registros.at(-1);
  const anterior = registros.at(-2);
  if (!r) return;
  $("datoLatitud").textContent = r.latitud.toFixed(6);
  $("datoLongitud").textContent = r.longitud.toFixed(6);
  $("datoHora").textContent = `${r.fecha} ${r.hora}`;
  $("datoDistancia").textContent = distanciaTotal >= 1000
    ? `${(distanciaTotal / 1000).toFixed(2)} km`
    : `${distanciaTotal.toFixed(0)} m`;
  if (anterior) {
    const segundos = (r.ts - anterior.ts) / 1000;
    const velocidad = segundos > 0 ? distanciaMetros(anterior, r) / segundos : 0;
    $("datoVelocidad").textContent = `${velocidad.toFixed(2)} m/s`;
  }
  marcadorRobot.setPopupContent(contenidoPopup(r));
}

// Solo se conserva el recorrido de los últimos minutos configurados
function recortarHistorial() {
  const limite = Date.now() - CONFIG.MINUTOS_HISTORIAL * 60 * 1000;
  const i = registros.findIndex((r) => r.ts >= limite);
  if (i > 0) registros.splice(0, i);
}

function dibujarMapaCompleto() {
  if (!registros.length) {
    $("datoHora").textContent = "Sin ubicaciones todavía";
    return;
  }
  distanciaTotal = 0;
  for (let i = 1; i < registros.length; i++) distanciaTotal += distanciaMetros(registros[i - 1], registros[i]);

  rastro.setLatLngs(registros.map((r) => [r.latitud, r.longitud]));
  const primero = registros[0], ultimo = registros.at(-1);
  marcadorInicio.setLatLng([primero.latitud, primero.longitud]);
  if (chkRastro.checked) marcadorInicio.addTo(mapa);
  marcadorRobot.setLatLng([ultimo.latitud, ultimo.longitud]).addTo(mapa);
  mapa.setView([ultimo.latitud, ultimo.longitud], ZOOM_INICIAL);
  actualizarDatosMapa();
}

// Mueve el robot en el mapa con cada registro nuevo
function moverRobot(r) {
  const anterior = registros.at(-2);
  if (anterior) distanciaTotal += distanciaMetros(anterior, r);
  const pos = [r.latitud, r.longitud];

  if (registros.length === 1) {          // primera ubicación recibida
    dibujarMapaCompleto();
    return;
  }
  marcadorRobot.setLatLng(pos);
  rastro.addLatLng(pos);
  const viejo = registros[0];
  const puntos = rastro.getLatLngs();
  if (puntos.length > registros.length) {   // se recortó el historial
    rastro.setLatLngs(registros.map((x) => [x.latitud, x.longitud]));
  }
  marcadorInicio.setLatLng([viejo.latitud, viejo.longitud]);
  if (chkSeguir.checked) mapa.panTo(pos, { animate: true, duration: 0.5 });
  actualizarDatosMapa();
}

/* ------------------------------------------------------------------
   4. CARGA INICIAL Y TIEMPO REAL
------------------------------------------------------------------ */
async function cargarHistorial() {
  try {
    const ahora = Date.now();
    const lista = await api.registros({
      limite: 0,
      desde: ahora - CONFIG.MINUTOS_HISTORIAL * 60 * 1000,
      hasta: ahora + 60 * 1000,
    });
    const recibidos = registros;
    registros = lista.reverse();
    recibidos.forEach((r) => { if (!registros.some((x) => x.id === r.id)) registros.push(r); });
    registros.sort((a, b) => a.ts - b.ts);

    // Si no hay nada reciente, al menos se muestra la última ubicación conocida
    if (!registros.length) {
      const ultimo = await api.ultimo();
      if (ultimo) registros = [ultimo];
    }
  } catch (err) {
    console.error("No se pudo cargar el historial:", err.message);
    $("datoHora").textContent = "No se pudo cargar el historial";
  }
  graficaPresion.recargar();
  graficaTemperatura.recargar();
  dibujarMapaCompleto();
}

conectarTiempoReal({
  alRecibirRegistro(registro) {
    if (registros.some((x) => x.id === registro.id)) return;
    registros.push(registro);
    recortarHistorial();
    graficaPresion.recibir(registro);
    graficaTemperatura.recibir(registro);
    moverRobot(registro);
  },
  alCambiarConexion: (conectado) => pintarConexion($("estadoConexion"), conectado),
});

cargarHistorial();
