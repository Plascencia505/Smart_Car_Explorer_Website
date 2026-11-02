# 🚗 Smart Car Explorer - Web Dashboard

Plataforma web integral para el monitoreo y control a distancia de un vehículo robótico explorador. Este sistema actúa como la estación de control terrestre, recibiendo telemetría en tiempo real mediante MQTT y permitiendo el envío de comandos de navegación vía WebSockets.

## ✨ Características Principales

* **Telemetría en Tiempo Real:** Visualización dinámica de datos del entorno (presión atmosférica, temperatura, altitud y coordenadas GPS) utilizando gráficas dinámicas.
* **Modos de Conducción:**
  * **Manual:** Control directo del robot mediante un joystick virtual o el teclado (W, A, S, D).
  * **Autónomo:** Planificación de rutas y selección de destinos directamente sobre un mapa interactivo (Leaflet).
* **Control de Acceso (RBAC):** Sistema de autenticación seguro. Los Administradores tienen acceso a herramientas de prueba (incluso con el robot desconectado), mientras que los Usuarios estándar solo pueden operar el vehículo cuando este transmite conexión activa.
* **Auditoría y Registros:** Almacenamiento histórico de toda la telemetría en base de datos con una tabla paginada y capacidad de búsqueda.

## 🛠️ Tecnologías y Arquitectura

El proyecto está construido bajo una arquitectura cliente-servidor renderizada desde el backend, optimizada para un bajo consumo de recursos:

**Back-end:**
* **Entorno:** Node.js (v24) + Express.js
* **Base de Datos:** MongoDB (Mongoose + connect-mongo para sesiones persistentes)
* **Comunicaciones:** MQTT.js (recepción LoRa/Gateway) y Socket.IO (interactividad bidireccional)
* **Seguridad:** Helmet (CSP estricto), bcryptjs, express-validator
* **Gestión de Entorno:** @dotenvx/dotenvx (variables de entorno cifradas)

**Front-end:**
* **Estructura:** HTML5 y CSS3 (Vanilla, diseño responsivo y optimizado)
* **Librerías externas (vía CDN):** Chart.js (gráficas), Leaflet (mapas cartográficos), SweetAlert2 (modales).

## 🚀 Requisitos Previos

* **Node.js** v24 o superior.
* Instancia de **MongoDB** (local o Atlas).
* Un **Broker MQTT** (ej. HiveMQ, Mosquitto).

## ⚙️ Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Plascencia505/Smart_Car_Explorer_Website.git
   cd Smart_Car_Explorer_Website