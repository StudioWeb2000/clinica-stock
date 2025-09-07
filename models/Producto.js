const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  stock: { type: Number, required: true },
  fecha_vencimiento: { type: Date, required: true }
});

module.exports = mongoose.model('Producto', productoSchema);
