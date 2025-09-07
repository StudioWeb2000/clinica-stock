const Venta = require('../models/Venta');
const Producto = require('../models/Producto');
const PDFDocument = require('pdfkit');

// Registrar venta
exports.registrarVenta = async (data) => {
  const producto = await Producto.findById(data.producto);
  if (!producto) {
    throw new Error('Producto no encontrado');
  }

  // Reducir stock
  if (producto.stock < data.cantidad) {
    throw new Error('No hay suficiente stock');
  }
  producto.stock -= data.cantidad;
  await producto.save();

  const venta = new Venta({
    producto: producto._id,
    cantidad: data.cantidad
  });

  await venta.save();

  // Retornar con populate para frontend
  return await Venta.findById(venta._id).populate('producto');
};

// Listar ventas
exports.listarVentas = async (req, res) => {
  const ventas = await Venta.find().populate('producto');
  res.json(ventas);
};

// Generar PDF
exports.generarPDF = async (req, res) => {
  try {
    const ventas = await Venta.find().populate('producto');
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Disposition', 'attachment; filename=ventas.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // Encabezado
    doc.fontSize(16).text('Clínica Oftalmológica', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text('Reporte de Ventas', { align: 'center' });
    doc.moveDown(1);

    // Tabla
    const tableTop = 120;
    const productoX = 50;
    const cantidadX = 200;
    const precioX = 280;
    const totalX = 360;
    const fechaX = 440;

    doc.fontSize(10).text('Producto', productoX, tableTop);
    doc.text('Cantidad', cantidadX, tableTop);
    doc.text('Precio', precioX, tableTop);
    doc.text('Total', totalX, tableTop);
    doc.text('Fecha', fechaX, tableTop);

    let y = tableTop + 20;
    let sumaTotal = 0;

    ventas.forEach(v => {
      const nombre = v.producto?.nombre || '—';
      const precio = v.producto?.precio || 0;
      const total = precio * v.cantidad;
      sumaTotal += total;

      doc.text(nombre, productoX, y);
      doc.text(v.cantidad.toString(), cantidadX, y);
      doc.text(`S/ ${precio.toFixed(2)}`, precioX, y);
      doc.text(`S/ ${total.toFixed(2)}`, totalX, y);
      doc.text(new Date(v.fecha).toLocaleDateString('es-PE'), fechaX, y);
      y += 20;
    });

    // Total general
    doc.moveDown(2);
    doc.fontSize(12).text(`Suma total: S/ ${sumaTotal.toFixed(2)}`, { align: 'right' });

    // Firma
    doc.moveDown(3);
    doc.text('__________________________', { align: 'right' });
    doc.text('Firma y Sello', { align: 'right' });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Error generando PDF de ventas', error: err.message });
  }
};
