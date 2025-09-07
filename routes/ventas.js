const express = require('express');
const router = express.Router();
const { registrarVenta, listarVentas, generarPDF } = require('../controllers/ventaController');

module.exports = (io) => {
  router.post('/', async (req, res) => {
    const venta = await registrarVenta(req.body);
    io.emit('ventaActualizada', venta);
    res.json(venta);
  });

  router.get('/', listarVentas);
  router.get('/pdf', generarPDF);

  return router;
};
