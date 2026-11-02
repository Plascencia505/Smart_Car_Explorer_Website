# Smart Car Explorer 🚗📡

Plataforma web full-stack diseñada para el monitoreo y control a distancia de un vehículo robótico autónomo. El sistema integra telemetría en tiempo real, comunicación IoT (LoRa/MQTT), navegación GPS y gestión de perfiles de usuario.

## Características Principales

* **Telemetría en Tiempo Real:** Visualización instantánea de temperatura, presión atmosférica y altitud mediante gráficas dinámicas optimizadas (Chart.js) que procesan las últimas *N* muestras de datos.
* **Control Remoto y Navegación (Leaflet):** 
  * **Modo Manual:** Control del vehículo en tiempo real mediante teclado (W,A,S,D) o controles táctiles.
  * **Modo Autónomo:** Trazado de rutas y selección de destino directamente sobre un mapa interactivo, con cálculo de distancia y tiempo estimado (Fórmula de Haversine).
* **Gestión de Roles y Privilegios:**
  * **Usuarios:** Acceso de solo lectura a la telemetría y ubicación, con capacidad de enviar comandos únicamente si el hardware del robot reporta estar activo.
  * **Administradores:** Control total sin restricciones y acceso al modo de pruebas (*dry-run*) para simulación de comandos sin conexión del hardware. Asignación de rol estricta desde base de datos.
* **Base de Datos y Auditoría:** Almacenamiento persistente del historial de telemetría con interfaz de consulta paginada, capacidades de búsqueda y exportación local (CSV / JSON).
* **Arquitectura Segura:** Gestión de sesiones persistentes en MongoDB, contraseñas encriptadas (bcryptjs) y blindaje de cabeceras HTTP (Helmet), con configuración `trust proxy` lista para balanceadores de carga en la nube.

## Stack Tecnológico

* **Backend:** Node.js 24, Express, Mongoose (MongoDB)
* **Comunicaciones:** MQTT (HiveMQ), Socket.IO (WebSockets bidireccionales)
* **Seguridad y Entorno:** `@dotenvx/dotenvx`, `express-session`, `express-validator`
* **Frontend:** HTML5, CSS3 (Variables y Flexbox/Grid), Vanilla JavaScript (Arquitectura modular)
* **Librerías Cliente:** Leaflet (Mapas), Chart.js (Gráficas), SweetAlert2 (Alertas modales)

## Requisitos Previos

* **Node.js** (v24 o superior)
* **MongoDB** (Instancia local o Atlas)
* **Broker MQTT** (Ej. HiveMQ)

## Configuración y Variables de Entorno

El proyecto utiliza `@dotenvx/dotenvx` para el manejo seguro y cifrado de variables de entorno. Crea un archivo `.env` en la raíz (o utiliza tu `.env` encriptado con `.env.keys`):
