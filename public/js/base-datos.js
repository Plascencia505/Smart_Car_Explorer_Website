// ===== Smart Car Explorer · Funcionalidades de "Base de datos" =====
// La tabla solo permite LEER y BORRAR registros (R y D de CRUD).
// Borrar solo está disponible para el rol Administrador (lo revisa el servidor).
// Requiere: js/config.js, js/api.js y js/grafica-vivo.js
//
// Datos: GET /api/telemetry (historial) + evento "new_telemetry" (tiempo real)

const MAX_FILAS = 10;
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------
   1. REGISTROS (del más antiguo al más reciente)
------------------------------------------------------------------ */
let registros = [];
let estadoCarga = "cargando"; // "cargando" | "listo" | "error"
let mensajeError = "";

function agregarRegistro(r) {
  if (registros.some((x) => x.id === r.id)) return false; // evita duplicados
  registros.push(r);
  return true;
}

async function cargarRegistros() {
  estadoCarga = "cargando";
  actualizarTabla();
  try {
    const lista = await api.registros({
      limite: CONFIG.LIMITE_REGISTROS_TABLA,
    });
    // Puede haber llegado alguno por tiempo real mientras se cargaba
    const nuevos = registros;
    registros = lista.reverse();
    nuevos.forEach(agregarRegistro);
    registros.sort((a, b) => a.ts - b.ts);
    estadoCarga = "listo";
  } catch (err) {
    estadoCarga = "error";
    mensajeError = err.message;
  }
  actualizarTabla();
  graficaAltura.recargar();
}

/* ------------------------------------------------------------------
   2. TABLA (10 más recientes o 10 con más coincidencias)
------------------------------------------------------------------ */
const cuerpoTabla = $("cuerpoTabla");
const tablaInfo = $("tablaInfo");
const inputBusqueda = $("busqueda");
const COLUMNAS_TABLA = 8;

const ICONO_BOTE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`;

// Los valores tal como se ven en la tabla. La búsqueda usa este mismo
// formato, así "27.0" encuentra una temperatura de 27.0 (el ID no se busca).
function camposVisibles(r) {
  return {
    fecha: r.fecha,
    hora: r.hora,
    latitud: r.latitud.toFixed(6),
    longitud: r.longitud.toFixed(6),
    temperatura: r.temperatura.toFixed(1),
    presion: r.presion.toFixed(1),
    altura: r.altura.toFixed(1),
  };
}

const masReciente = (a, b) => b.ts - a.ts;

function recientes(lista) {
  return [...lista].sort(masReciente).slice(0, MAX_FILAS);
}

// Quita acentos y pasa a minúsculas para comparar sin importar "ó" vs "o"
function normalizar(texto) {
  return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Puntúa cada registro según qué tanto coincide con lo escrito
function buscar(consulta, lista = registros, limite = MAX_FILAS) {
  const palabras = normalizar(consulta).split(/\s+/).filter(Boolean);
  const resultados = [];

  for (const r of lista) {
    const campos = Object.values(camposVisibles(r)).map(normalizar);
    let puntos = 0;
    for (const p of palabras) {
      let mejor = 0;
      for (const c of campos) {
        if (c === p)
          mejor = Math.max(mejor, 3); // coincidencia exacta
        else if (c.startsWith(p))
          mejor = Math.max(mejor, 2); // empieza igual
        else if (c.includes(p)) mejor = Math.max(mejor, 1); // la contiene
      }
      puntos += mejor;
    }
    if (puntos > 0) resultados.push({ r, puntos });
  }

  return resultados
    .sort((a, b) => b.puntos - a.puntos || masReciente(a.r, b.r))
    .slice(0, limite)
    .map((x) => x.r);
}

function filaMensaje(texto) {
  return `<tr class="sin-registros"><td colspan="${COLUMNAS_TABLA + 1}">${texto}</td></tr>`;
}

function actualizarTabla() {
  if (estadoCarga === "cargando" && registros.length === 0) {
    cuerpoTabla.innerHTML = filaMensaje("Cargando registros…");
    tablaInfo.textContent = "";
    return;
  }
  if (estadoCarga === "error" && registros.length === 0) {
    cuerpoTabla.innerHTML = filaMensaje(
      `No se pudieron cargar los registros. ${mensajeError}<br><button type="button" class="btn-reintentar" id="btnReintentar">Reintentar</button>`,
    );
    $("btnReintentar").addEventListener("click", cargarRegistros);
    tablaInfo.textContent = "";
    return;
  }

  const consulta = inputBusqueda.value.trim();
  const filas = consulta ? buscar(consulta) : recientes(registros);

  if (filas.length === 0) {
    cuerpoTabla.innerHTML = filaMensaje(
      consulta
        ? "No se encontraron registros"
        : "Aún no hay registros guardados.",
    );
    tablaInfo.textContent = "";
    return;
  }

  // El ID no se muestra, pero se guarda en el botón para saber qué registro borrar
  cuerpoTabla.innerHTML = filas
    .map((r) => {
      const v = camposVisibles(r);
      return `
    <tr>
      <td class="num">${v.fecha}</td>
      <td class="num">${v.hora}</td>
      <td class="num">${v.latitud}</td>
      <td class="num">${v.longitud}</td>
      <td class="num">${v.temperatura}</td>
      <td class="num">${v.presion}</td>
      <td class="num">${v.altura}</td>
      <td class="col-acciones">
        <div class="acciones">
          <button class="btn-icono borrar" data-id="${r.id}" title="Borrar registro" aria-label="Borrar registro del ${v.fecha} a las ${v.hora}">${ICONO_BOTE}</button>
        </div>
      </td>
    </tr>`;
    })
    .join("");

  const total = registros.length;
  const alcance =
    CONFIG.LIMITE_REGISTROS_TABLA > 0 && total >= CONFIG.LIMITE_REGISTROS_TABLA
      ? ` (se buscan los ${total} más recientes)`
      : "";
  tablaInfo.textContent = consulta
    ? `Mostrando ${filas.length} registro(s) con más coincidencias para "${consulta}"${alcance}.`
    : `Mostrando los ${filas.length} registros más recientes de ${total}${alcance ? " cargados" : ""}.`;
}

inputBusqueda.addEventListener("input", actualizarTabla);

// Botón de borrar de cada fila: DELETE /api/telemetry/:id
cuerpoTabla.addEventListener("click", async (e) => {
  const boton = e.target.closest(".btn-icono.borrar");
  if (!boton || !esAdmin()) return;
  const id = boton.dataset.id;
  const r = registros.find((x) => x.id === id);

  if (!r) return;
  const seguro = await confirmarSwal(
    `Se eliminará el registro del ${r.fecha} a las ${r.hora}.`,
    "¿Borrar registro?",
  );
  if (!seguro) return;

  boton.disabled = true;
  try {
    await api.borrar(id);
    registros = registros.filter((x) => x.id !== id);
    actualizarTabla();
    graficaAltura.recargar();
    Toast.fire({ icon: "success", title: "Registro borrado correctamente" });
  } catch (err) {
    boton.disabled = false;
    await alertaSwal(
      err.estado === 403
        ? "Tu cuenta no tiene permisos para borrar registros."
        : `No se pudo borrar el registro. ${err.message}`,
      "error",
      "Acceso denegado",
    );
  }
});

/* ------------------------------------------------------------------
   2.1 EXPORTAR REGISTROS (CSV y JSON)
   Se piden TODOS los registros al servidor (limit=0) y, si hay una
   búsqueda escrita, se exportan todos los que coinciden.
------------------------------------------------------------------ */
const COLUMNAS_EXPORTAR = [
  { campo: "id", titulo: "ID" },
  { campo: "fecha", titulo: "Fecha" },
  { campo: "hora", titulo: "Hora" },
  { campo: "latitud", titulo: "Latitud" },
  { campo: "longitud", titulo: "Longitud" },
  { campo: "temperatura", titulo: "Temperatura (°C)" },
  { campo: "presion", titulo: "Presión (hPa)" },
  { campo: "altura", titulo: "Altura calculada (m)" },
];

// Encierra en comillas los valores con comas, comillas o saltos de línea
function celdaCSV(valor) {
  const texto = String(valor ?? "");
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function generarCSV(lista) {
  const encabezado = COLUMNAS_EXPORTAR.map((c) => celdaCSV(c.titulo)).join(",");
  const filas = lista.map((r) => {
    const v = { ...r, ...camposVisibles(r) }; // mismos decimales que la tabla
    return COLUMNAS_EXPORTAR.map((c) => celdaCSV(v[c.campo])).join(",");
  });
  // "﻿" (BOM) hace que Excel reconozca los acentos (UTF-8)
  return "﻿" + [encabezado, ...filas].join("\r\n");
}

function generarJSON(lista) {
  // Mismo formato que acepta la gráfica "Altura de registros" ({ registros: [...] })
  return JSON.stringify(
    {
      proyecto: "Smart Car Explorer",
      exportado: new Date().toISOString(),
      busqueda: inputBusqueda.value.trim() || null,
      total: lista.length,
      registros: lista.map((r) => {
        const v = camposVisibles(r);
        return {
          id: r.id,
          fecha: r.fecha,
          hora: r.hora,
          latitud: r.latitud,
          longitud: r.longitud,
          temperatura: +v.temperatura,
          presion: +v.presion,
          altura: +v.altura,
        };
      }),
    },
    null,
    2,
  );
}

function descargarArchivo(contenido, nombre, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function nombreDescarga(extension) {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  const marca = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}`;
  const sufijo = inputBusqueda.value.trim() ? "-busqueda" : "";
  return `registros-smart-car${sufijo}_${marca}.${extension}`;
}

const botonesExportar = [...document.querySelectorAll(".btn-exportar")];

async function exportar(formato, boton) {
  const textoOriginal = boton.textContent;
  botonesExportar.forEach((b) => {
    b.disabled = true;
  });
  boton.textContent = "…";
  try {
    const todos = await api.registros({ limite: 0 });
    const consulta = inputBusqueda.value.trim();
    const lista = consulta ? buscar(consulta, todos, Infinity) : todos;
    if (lista.length === 0) {
      await alertaSwal(
        consulta
          ? "No hay registros que coincidan con la búsqueda."
          : "Aún no hay registros para exportar.",
        "warning",
        "Sin datos",
      );
      return;
    }
    if (formato === "csv")
      descargarArchivo(
        generarCSV(lista),
        nombreDescarga("csv"),
        "text/csv;charset=utf-8",
      );
    else
      descargarArchivo(
        generarJSON(lista),
        nombreDescarga("json"),
        "application/json",
      );
    Toast.fire({
      icon: "success",
      title: `Archivo ${formato.toUpperCase()} descargado`,
    });
  } catch (err) {
    await alertaSwal(
      `No se pudieron exportar los registros. ${err.message}`,
      "error",
      "Error de exportación",
    );
  } finally {
    boton.textContent = textoOriginal;
    botonesExportar.forEach((b) => {
      b.disabled = false;
    });
  }
}

botonesExportar.forEach((b) => {
  b.title = `Descargar en ${b.dataset.formato.toUpperCase()} (todos los registros, o los que coincidan con la búsqueda)`;
  b.addEventListener("click", () => exportar(b.dataset.formato, b));
});

/* ------------------------------------------------------------------
   3. GRÁFICA DE ALTURA EN TIEMPO REAL (ver js/grafica-vivo.js)
   La altura se calcula a partir de la presión (ver api.js).
------------------------------------------------------------------ */
const graficaAltura = crearGraficaEnVivo({
  canvas: "graficaTiempoReal",
  selector: "intervalo",
  aviso: "avisoPromedio",
  avisoTexto: "avisoTexto",
  valorActual: "alturaActual",
  campo: "altura",
  nombre: "Altura",
  unidad: "m",
  decimales: 1,
  obtenerRegistros: () => registros,
});

/* ------------------------------------------------------------------
   4. TIEMPO REAL: cada registro nuevo que guarda el servidor
------------------------------------------------------------------ */
conectarTiempoReal({
  alRecibirRegistro(registro) {
    if (!agregarRegistro(registro)) return;
    actualizarTabla();
    graficaAltura.recibir(registro);
  },
  alCambiarConexion: (conectado) =>
    pintarConexion($("estadoConexion"), conectado),
});

cargarRegistros();

/* ------------------------------------------------------------------
   5. GRÁFICA DE ALTURA DEL ARCHIVO (JSON de la microSD)
   Formatos aceptados (lista directa o dentro de { "registros": [...] }):
     [1500.2, 1501.0, ...]                              → alturas
     [{ "hora": "12:00:01", "altura": 1500.2 }, ...]    → alturas
     [{ "la": .., "lo": .., "t": .., "p": .. }, ...]     → presión (como la telemetría)
     [{ "pressure": .., "timestamp": .. }, ...]         → presión (como MongoDB)
   Si el archivo trae presión, la altura se calcula igual que en la tabla.
------------------------------------------------------------------ */
const graficaArchivo = new Chart($("graficaArchivo"), {
  type: "line",
  data: { labels: [], datasets: [datasetLinea()] },
  options: opcionesGrafica("Registro", "Altura (m)"),
});
graficaArchivo.options.plugins.tooltip.callbacks.label = (c) =>
  `Altura: ${c.parsed.y.toFixed(1)} m`;

const inputArchivo = $("archivoJSON");
const nombreArchivo = $("nombreArchivo");
const graficaVacia = $("graficaVacia");

inputArchivo.addEventListener("change", () => {
  const archivo = inputArchivo.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = () => {
    try {
      const puntos = leerAlturas(JSON.parse(lector.result));
      if (puntos.length === 0)
        throw new Error(
          "El archivo no contiene valores de altura ni de presión.",
        );

      graficaArchivo.data.labels = puntos.map((p) => p.etiqueta);
      graficaArchivo.data.datasets[0].data = puntos.map(
        (p) => +p.altura.toFixed(2),
      );
      graficaArchivo.options.scales.x.title.text = puntos[0].esHora
        ? "Hora"
        : "Registro";
      graficaArchivo.update();

      nombreArchivo.textContent = `${archivo.name} · ${puntos.length} registros`;
      graficaVacia.hidden = true;
      graficaVacia.classList.remove("error");
    } catch (err) {
      mostrarErrorArchivo(
        err.message.startsWith("El archivo")
          ? err.message
          : "El archivo no es un JSON válido.",
      );
    }
    inputArchivo.value = ""; // permite volver a cargar el mismo archivo
  };
  lector.readAsText(archivo);
});

function etiquetaHora(item) {
  if (item.hora) return item.hora;
  const marca = item.timestamp ?? item.fecha_hora ?? item.ts;
  if (marca === undefined) return null;
  const d = new Date(marca);
  return Number.isNaN(d.getTime())
    ? String(marca)
    : d.toTimeString().slice(0, 8);
}

function leerAlturas(json) {
  const lista = Array.isArray(json) ? json : json.registros || json.data || [];
  return lista
    .map((item, i) => {
      if (typeof item === "number") return { etiqueta: i + 1, altura: item };
      let altura = Number(item.altura ?? item.altitud ?? item.alt);
      if (!Number.isFinite(altura)) {
        const presion = item.p ?? item.pressure ?? item.presion;
        if (presion !== undefined)
          altura = alturaDesdePresion(presionEnHpa(presion));
      }
      const hora = etiquetaHora(item);
      return { etiqueta: hora || i + 1, altura, esHora: Boolean(hora) };
    })
    .filter((p) => Number.isFinite(p.altura));
}

function mostrarErrorArchivo(mensaje) {
  graficaArchivo.data.labels = [];
  graficaArchivo.data.datasets[0].data = [];
  graficaArchivo.update();
  nombreArchivo.textContent = "Sin archivo";
  graficaVacia.textContent = mensaje;
  graficaVacia.classList.add("error");
  graficaVacia.hidden = false;
}
