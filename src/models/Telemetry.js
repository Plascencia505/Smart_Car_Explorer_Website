// src/models/Telemetry.js
import mongoose from 'mongoose';

const telemetrySchema = new mongoose.Schema({
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point',
      required: true
    },
    coordinates: { 
      type: [Number], // El estándar GeoJSON exige [longitud, latitud]
      required: true 
    }
  },
  temperature: { 
    type: Number, 
    required: true 
  },
  pressure: { 
    type: Number, 
    required: true 
  }
});

// Índice geoespacial 2dsphere indispensable para búsquedas y mapeo
telemetrySchema.index({ location: '2dsphere' });

export default mongoose.model('Telemetry', telemetrySchema);