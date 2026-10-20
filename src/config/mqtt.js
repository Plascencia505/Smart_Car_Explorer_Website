// src/config/mqtt.js
import { Aedes } from 'aedes';

// Creación asíncrona del broker MQTT embebido según la API moderna de Aedes
const aedes = await Aedes.createBroker();

export default aedes;