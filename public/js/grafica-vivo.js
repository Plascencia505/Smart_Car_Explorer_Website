// ===== Smart Car Explorer · Gráficas en tiempo real (compartido) =====
// Crea una gráfica de línea que se construye con los registros existentes
// y se actualiza con cada registro nuevo. Requiere Chart.js.
//
// El selector "Graficar" decide cada cuánto se dibuja un punto:
//   - Cada lectura → cada registro del robot es un punto (tiempo real).
//   - Cada 10/20/30 s → las lecturas se agrupan en bloques de ese tamaño
//     y cada punto es el PROMEDIO del bloque (tooltip con mín. y máx.).

const MAX_PUNTOS_VIVO = 60;
const COLOR_ACENTO = getComputedStyle(document.documentElement).getPropertyValue("--acento").trim() || "#e8792f";

// Opciones comunes de estilo para todas las gráficas del sitio
function opcionesGrafica(tituloX, tituloY) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },   // tooltip al pasar el cursor
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

  let detallesPuntos = [];   // por cada punto: { n, min, max } para el tooltip
  let temporizadorGrafica = null;
  let temporizadorAviso = null;

  const formato = (v) => `${v.toFixed(decimales)} ${unidad}`;
  const segundosPorPunto = () => Number(selector.value);

  // Tooltip: en tiempo real solo el valor; con promedio, también mín. y máx.
  grafica.options.plugins.tooltip.callbacks.label = (c) => {
    const d = detallesPuntos[c.dataIndex];
    if (!d || d.n === 1) return `${nombre}: ${formato(c.parsed.y)}`;
    return [
      `Promedio: ${formato(c.parsed.y)}`,
      `Mín: ${formato(d.min)} · Máx: ${formato(d.max)}`,
      `(${d.n} lecturas)`,
    ];
  };

  // Arma los puntos de la gráfica con los registros existentes
  function construir() {
    const segundos = segundosPorPunto();
    const tamBloque = segundos * 1000;
    const bloqueActual = Math.floor(Date.now() / tamBloque);
    const desde = (bloqueActual - MAX_PUNTOS_VIVO) * tamBloque;

    // En tiempo real cada registro es su propio bloque (un punto por lectura)
    // y se toman los últimos 60 sin importar cada cuánto lleguen
    const bloques = new Map();
    for (const r of obtenerRegistros()) {
      const t = marcaDeTiempo(r);
      if (segundos > 2 && t < desde) continue;
      const n = segundos > 2 ? Math.floor(t / tamBloque) : t;
      if (segundos > 2 && n >= bloqueActual) continue; // el bloque en curso aún no termina
      if (!bloques.has(n)) bloques.set(n, []);
      bloques.get(n).push(r);
    }

    const claves = [...bloques.keys()].sort((x, y) => x - y).slice(-MAX_PUNTOS_VIVO);
    const etiquetas = [], valores = [];
    detallesPuntos = [];

    for (const n of claves) {
      const grupo = bloques.get(n);
      const v = grupo.map((r) => r[campo]);
      const promedio = v.reduce((a, b) => a + b, 0) / v.length;
      // En tiempo real se usa la hora exacta; con promedio, la hora en que termina el bloque
      etiquetas.push(segundos > 2 ? horaTexto((n + 1) * tamBloque) : grupo.at(-1).hora);
      valores.push(+promedio.toFixed(decimales + 1));
      detallesPuntos.push({ n: v.length, min: Math.min(...v), max: Math.max(...v) });
    }

    grafica.data.labels = etiquetas;
    grafica.data.datasets[0].data = valores;
    grafica.update();

    // Aviso mientras no haya puntos que dibujar
    if (valores.length === 0 && segundos > 2) mostrarAviso(segundos, bloqueActual);
    else if (valores.length === 0) mostrarEspera();
    else ocultarAviso();
  }

  // Aviso con cuenta regresiva hasta que termina el primer bloque
  function mostrarAviso(segundos, bloqueActual) {
    const fin = (bloqueActual + 1) * segundos * 1000;
    const pintar = () => {
      const restantes = Math.max(Math.ceil((fin - Date.now()) / 1000), 1);
      avisoTexto.textContent = `Calculando el primer promedio de ${segundos} segundos… (${restantes} s)`;
    };
    pintar();
    aviso.hidden = false;
    clearInterval(temporizadorAviso);
    temporizadorAviso = setInterval(pintar, 1000);
  }

  function mostrarEspera() {
    clearInterval(temporizadorAviso);
    avisoTexto.textContent = "Esperando lecturas del robot…";
    aviso.hidden = false;
  }

  function ocultarAviso() {
    clearInterval(temporizadorAviso);
    aviso.hidden = true;
  }

  // Con promedio, la gráfica se recalcula justo cuando termina cada bloque
  function aplicarIntervalo() {
    clearTimeout(temporizadorGrafica);
    construir();
    const segundos = segundosPorPunto();
    if (segundos > 2) {
      const programar = () => {
        const tam = segundos * 1000;
        const espera = tam - (Date.now() % tam) + 50; // 50 ms después del cierre
        temporizadorGrafica = setTimeout(() => { construir(); programar(); }, espera);
      };
      programar();
    }
  }

  selector.addEventListener("change", aplicarIntervalo);

  // Estado inicial: último valor + gráfica con el historial
  function iniciar() {
    const ultimo = obtenerRegistros().at(-1);
    if (ultimo) valorActual.textContent = formato(ultimo[campo]);
    aplicarIntervalo();
  }
  iniciar();

  return {
    // Volver a dibujar todo (por ejemplo, después de cargar el historial)
    recargar: iniciar,
    // Llamar con cada registro nuevo (después de agregarlo a la lista)
    recibir(registro) {
      valorActual.textContent = formato(registro[campo]); // siempre la última lectura
      if (segundosPorPunto() <= 2) construir();           // en tiempo real, un punto por lectura
    },
  };
}
