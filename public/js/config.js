// ===== Smart Car Explorer · Configuración =====
// Todo lo que depende del Back-End está aquí. Si cambia una ruta,
// un evento o el formato de un mensaje, solo se edita este archivo.
//
// Basado en el Back-End del proyecto (src/):
//   - app.js            → rutas /api/auth y /api/telemetry
//   - socketHandler.js  → eventos "manual_control" y "navigate_to"
//   - mqttController.js → evento "new_telemetry" (cada registro nuevo)

const CONFIG = {
  /* ---------- Direcciones de las páginas (las define src/routes/pageRoutes.js) ---------- */
  PAGINAS: {
    login: "/login",
    inicio: "/inicio",
    baseDatos: "/base-datos",
    monitoreo: "/monitoreo",
    gestion: "/gestion",
  },

  /* ---------- API REST ---------- */
  // Vacío = el mismo servidor que entrega la página (Express).
  // Si la página se abre desde otro lugar, pon aquí la dirección, ej. "http://192.168.1.50:3000"
  SERVIDOR: "",

  RUTAS: {
    login: "/api/auth/login",            // POST { username, password } → { message, role }
    logout: "/api/auth/logout",          // POST
    registros: "/api/telemetry",         // GET ?limit=N&startDate=...&endDate=...  (limit=0 → todos)
    ultimo: "/api/telemetry/latest",     // GET → último registro (404 si no hay)
    borrar: (id) => `/api/telemetry/${encodeURIComponent(id)}`,  // DELETE (solo Administrador)
    register: "/api/register"
  },

  // Roles tal como los guarda el Back-End (models/User.js)
  ROL_ADMIN: "Administrador",
  ROL_USUARIO: "Usuario",

  /* ---------- Tiempo real (Socket.IO del mismo servidor) ---------- */
  EVENTOS: {
    nuevoRegistro: "new_telemetry",      // servidor → página: registro recién guardado
    controlManual: "manual_control",     // página → servidor → MQTT <prefijo>/control
    navegarA: "navigate_to",             // página → servidor → MQTT <prefijo>/navigate
  },

  /* ---------- Órdenes al robot ----------
     ⚠ Confirmar con el código del ESP32 / Gateway.
     El Back-End reenvía el objeto tal cual (JSON) al tópico MQTT.
     El comentario del servidor indica comandos "W, A, S, D, STOP". */
  COMANDOS: {
    adelante: "W",
    izquierda: "A",
    atras: "S",
    derecha: "D",
    detener: "STOP",
  },
  formatoComando: (comando) => ({ command: comando }),
  // Mismas abreviaturas que usa la telemetría (la = latitud, lo = longitud)
  formatoDestino: (lat, lng) => ({ la: +lat.toFixed(6), lo: +lng.toFixed(6) }),

  /* ---------- Comportamiento ---------- */
  // Sin registros nuevos durante este tiempo, el robot se considera apagado
  SEGUNDOS_ROBOT_APAGADO: 30,
  // Minutos de historial para las gráficas y el recorrido del mapa
  MINUTOS_HISTORIAL: 30,
  // Registros que se cargan en Base de datos para buscar (0 = todos)
  LIMITE_REGISTROS_TABLA: 1000,
  // Distancia (m) al destino para dar el viaje por terminado (precisión del GPS)
  METROS_LLEGADA: 4,
  // Velocidad aproximada del robot (m/s), solo para el tiempo estimado
  VELOCIDAD_ROBOT: 0.5,
  // Presión al nivel del mar (hPa) para calcular la altura a partir de la presión
  PRESION_NIVEL_MAR: 1013.25,
  // Centro del mapa mientras no haya ninguna ubicación del robot
  CENTRO_MAPA_INICIAL: [19.4326, -99.1332],
};
