const Producto = require('../models/Producto');

// Agregar producto
exports.agregarProducto = async (req, res) => {
  try {
    const { nombre, precio, stock, fecha_vencimiento } = req.body;

    // Verificar si ya existe un producto con el mismo nombre
    const productoExistente = await Producto.findOne({ nombre: nombre.trim() });
    if (productoExistente) {
      return res.status(400).json({ mensaje: '❌ El producto ya existe' });
    }

    const producto = new Producto({ nombre, precio, stock, fecha_vencimiento });
    await producto.save();
    res.json({ mensaje: '✅ Producto agregado correctamente', producto });
  } catch (err) {
    res.status(500).json({ mensaje: '❌ Error al agregar producto', error: err.message });
  }
};

// Listar productos y alertas
exports.listarProductos = async (req, res) => {
  try {
    const hoy = new Date();
    const treintaDias = new Date();
    treintaDias.setDate(hoy.getDate() + 30);

    const productos = await Producto.find();
    const vencidos = productos.filter(p => p.fecha_vencimiento < hoy);
    const porVencer = productos.filter(p => p.fecha_vencimiento >= hoy && p.fecha_vencimiento <= treintaDias);

    res.json({ productos, vencidos, porVencer });
  } catch (err) {
    res.status(500).json({ mensaje: '❌ Error al listar productos', error: err.message });
  }
};

// Actualizar producto
exports.actualizarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ mensaje: '❌ Error al actualizar producto', error: err.message });
  }
};

// Eliminar producto
exports.eliminarProducto = async (req, res) => {
  try {
    await Producto.findByIdAndDelete(req.params.id);
    res.json({ mensaje: '✅ Producto eliminado' });
  } catch (err) {
    res.status(500).json({ mensaje: '❌ Error al eliminar producto', error: err.message });
  }
};

// Generar PDF de productos (stock, vencidos y por vencer)
exports.generarPDFProductos = async (req, res) => {
  try {
    const productos = await Producto.find();
    const doc = new PDFDocument({ margin: 30, size: "A4" });

    res.setHeader("Content-Disposition", "attachment; filename=productos.pdf");
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Encabezado
    doc.fontSize(16).text("Clínica Oftalmológica", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).text("Reporte de Stock de Productos", { align: "center" });
    doc.moveDown(1);

    // Tabla
    const tableTop = 120;
    const nombreX = 50;
    const stockX = 200;
    const fechaX = 280;
    const estadoX = 420;

    doc.fontSize(10).text("Producto", nombreX, tableTop);
    doc.text("Stock", stockX, tableTop);
    doc.text("Vencimiento", fechaX, tableTop);
    doc.text("Estado", estadoX, tableTop);

    let y = tableTop + 20;
    const hoy = new Date();
    const en30dias = new Date(hoy.getTime() + 30*24*60*60*1000);

    productos.forEach(p => {
      let estado = "OK";
      if (p.fecha_vencimiento < hoy) estado = "Vencido";
      else if (p.fecha_vencimiento <= en30dias) estado = "Por vencer";

      doc.text(p.nombre, nombreX, y);
      doc.text(p.stock.toString(), stockX, y);
      doc.text(new Date(p.fecha_vencimiento).toLocaleDateString("es-PE"), fechaX, y);
      doc.text(estado, estadoX, y);

      y += 20;
    });

    // Firma
    doc.moveDown(3);
    doc.text("__________________________", { align: "right" });
    doc.text("Firma y Sello", { align: "right" });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Error generando PDF de productos" });
  }
};
