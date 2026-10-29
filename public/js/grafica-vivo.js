// ===== Smart Car Explorer · Gráficas en tiempo real (compartido) =====
// Crea una gráfica de línea que se construye con los registros existentes
// y se actualiza con cada registro nuevo. Requiere Chart.js.
//
// El selector "Graficar" decide cada cuánto se dibuja un punto:
//   - Cada lectura → cada registro del robot es un punto (tiempo real).
//   - Cada 10/20/30 s → las lecturas se agrupan en bloques de ese tamaño
//     y cada punto es el PROMEDIO del bloque (tooltip con mín. y máx.).

const MAX_PUNTOS_VIVO = 60;
const COLOR_ACENTO =
  getComputedStyle(document.documentElement)
    .getPropertyValue("--acento")
    .trim() || "#e8792f";

// Opciones comunes de estilo para todas las gráficas del sitio
function opcionesGrafica(tituloX, tituloY) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false }, // tooltip al pasar el cursor
    plugins: {
      legend: { display: false },
      tooltip: { displayColors: false, callbacks: {} },
    },
    scales: {
      x: {
        title: { display: true, text: tituloX, color: "#6b6b6b" },
        ticks: { color: "#6b6b6b", maxTicksLimit: 8, maxRotation: 0 },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: tituloY, color: "#6b6b6b" },
        ticks: { color: "#6b6b6b" },
        grid: { color: "#e0e0e0" },
      },
    },
  };
}

function datasetLinea(color = COLOR_ACENTO) {
  return {
    data: [],
    borderColor: color,
    backgroundColor: color + "22",
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 5,
    tension: 0.3,
    fill: true,
  };
}

// Momento del registro en milisegundos (lo calcula api.js)
function marcaDeTiempo(r) {
  return r.ts;
}

const horaTexto = (ms) => new Date(ms).toTimeString().slice(0, 8);

/**
 * Crea una gráfica en tiempo real.
 * @param {object} cfg
 *   canvas, selector, aviso, avisoTexto, valorActual → ids de los elementos HTML
 *   campo      → propiedad del registro a graficar ("altura", "presion", "temperatura")
 *   nombre     → texto para el tooltip ("Altura")
 *   unidad     → "m", "hPa", "°C"
 *   decimales  → decimales a mostrar
 *   color      → color de la línea
 *   obtenerRegistros → función que devuelve la lista actual de registros
 */
function crearGraficaEnVivo(cfg) {
  const { campo, nombre, unidad, decimales = 1, obtenerRegistros } = cfg;
  const $ = (id) => document.getElementById(id);
  const selector = $(cfg.selector);
  const aviso = $(cfg.aviso);
  const avisoTexto = $(cfg.avisoTexto);
  const valorActual = $(cfg.valorActual);

  const grafica = new Chart($(cfg.canvas), {
    type: "line",
    data: { labels: [], datasets: [datasetLinea(cfg.color)] },
    options: opcionesGrafica("Hora", `${nombre} (${unidad})`),
  });

  const formato = (v) => `${v.toFixed(decimales)} ${unidad}`;

  grafica.options.plugins.tooltip.callbacks.label = (c) =>
    `${nombre}: ${formato(c.parsed.y)}`;

  function construir() {
    const limite = Number(selector.value);
    // Tomamos solo los últimos N registros
    const registrosLimpios = obtenerRegistros().filter(
      (r) => r[campo] !== undefined,
    );
    const datos = registrosLimpios.slice(-limite);

    grafica.data.labels = datos.map((r) => r.hora);
    grafica.data.datasets[0].data = datos.map(
      (r) => +r[campo].toFixed(decimales + 1),
    );
    grafica.update();

    if (datos.length === 0) {
      avisoTexto.textContent = "Esperando lecturas del robot…";
      aviso.hidden = false;
    } else {
      aviso.hidden = true;
    }
  }

  selector.addEventListener("change", construir);

  function iniciar() {
    const ultimo = obtenerRegistros().at(-1);
    if (ultimo) valorActual.textContent = formato(ultimo[campo]);
    construir();
  }

  iniciar();

  return {
    recargar: iniciar,
    recibir(registro) {
      valorActual.textContent = formato(registro[campo]);
      construir();
    },
  };
}
