
// 🔹 Solo usar dotenv en desarrollo local
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const productoRoutes = require('./routes/productos');
const ventaRoutes = require('./routes/ventas');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// 🔹 Middlewares
app.use(cors());
app.use(express.json());

// 🔹 Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB conectado a clinica_stock'))
.catch(err => console.error('❌ Error al conectar MongoDB:', err));

// 🔹 Rutas API
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes(io));

// 🔹 Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 Ruta raíz → index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔹 Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));

