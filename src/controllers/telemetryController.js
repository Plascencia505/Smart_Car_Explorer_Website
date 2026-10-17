// src/controllers/telemetryController.js
import Telemetry from '../models/Telemetry.js';

export const getTelemetry = async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;
    let query = {};

    // Filtros por rango de fechas
    if (startDate && endDate) {
      query.timestamp = { 
        $gte: new Date(startDate),$lte: new Date(endDate) 
      };
    }

    const data = await Telemetry.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el historial de telemetría.' });
  }
};

export const getLatestTelemetry = async (req, res) => {
  try {
    const latest = await Telemetry.findOne().sort({ timestamp: -1 });
    if (!latest) return res.status(404).json({ error: 'No hay registros disponibles.' });
    
    res.status(200).json(latest);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el último registro.' });
  }
};

export const deleteTelemetry = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await Telemetry.findByIdAndDelete(id);
    
    if (!deletedRecord) {
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }

    res.status(200).json({ message: 'Registro eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el registro.' });
  }
};

export const exportTelemetry = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const data = await Telemetry.find().sort({ timestamp: -1 }).lean();

    if (format === 'csv') {
      const csvHeaders = 'Timestamp,Longitud,Latitud,Temperatura,Presion\n';
      const csvRows = data.map(record => {
        const [lo, la] = record.location.coordinates;
        return `${record.timestamp.toISOString()},${lo},${la},${record.temperature},${record.pressure}`;
      }).join('\n');
      
      res.header('Content-Type', 'text/csv');
      res.attachment('telemetry_export.csv');
      return res.status(200).send(csvHeaders + csvRows);
    }

    // Por defecto exporta en JSON
    res.header('Content-Type', 'application/json');
    res.attachment('telemetry_export.json');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al exportar los datos.' });
  }
};