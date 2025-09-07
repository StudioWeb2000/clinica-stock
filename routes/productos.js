const express = require('express');
const router = express.Router();
const { agregarProducto, listarProductos, actualizarProducto, eliminarProducto, generarPDFProductos } = require('../controllers/productoController');

router.post('/', agregarProducto);
router.get('/', listarProductos);
router.put('/:id', actualizarProducto);
router.delete('/:id', eliminarProducto);
router.get('/pdf', generarPDFProductos);

module.exports = router;
