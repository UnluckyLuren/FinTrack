const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Ruta de prueba para saber que el servidor responde
app.get('/', (req, res) => {
  res.send('Servidor de FinTrack funcionando correctamente 🚀');
});

// --- AQUÍ ES DONDE DEBES IMPORTAR TUS RUTAS EXISTENTES ---
// Ejemplo: const rutasIngresos = require('./routes/ingresos');
// app.use('/api/ingresos', rutasIngresos);

// CONFIGURACIÓN DEL PUERTO (Vital para Render)
const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});