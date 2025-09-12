
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
const PDFDocument = require('pdfkit'); // 📄 librería PDF

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
// 🔹 Ruta para generar PDF
app.get('/api/ventas/pdf', async (req, res) => {
  try {
    const { fecha } = req.query;
    let query = {};

    if (fecha) {
      const inicio = new Date(fecha + 'T00:00:00');
      const fin = new Date(fecha + 'T23:59:59');
      query.fecha = { $gte: inicio, $lte: fin };
    }

    const ventas = await Venta.find(query).populate('producto');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ventas.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(18).text('📄 Reporte de Ventas', { align: 'center' });
    if (fecha) {
      doc.moveDown();
      doc.fontSize(12).text(`Fecha: ${fecha}`, { align: 'center' });
    }
    doc.moveDown();

    let totalGeneral = 0;

    ventas.forEach((v, i) => {
      const nombre = v.producto ? v.producto.nombre : "—";
      const precio = v.producto ? v.producto.precio : 0;
      const totalVenta = precio * v.cantidad;
      totalGeneral += totalVenta;

      doc.fontSize(10).text(
        `${i + 1}. ${nombre} | Cantidad: ${v.cantidad} | Precio: S/ ${precio.toFixed(2)} | Total: S/ ${totalVenta.toFixed(2)} | Fecha: ${new Date(v.fecha).toLocaleString('es-PE')}`
      );
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total General: S/ ${totalGeneral.toFixed(2)}`, { align: 'right' });

    doc.end();
  } catch (err) {
    console.error('❌ Error generando PDF:', err);
    res.status(500).send('Error generando PDF');
  }
});


// 🔹 Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 Ruta raíz → index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔹 Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));


