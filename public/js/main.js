// conexión socket (usa misma URL del servidor)
const socket = io();

// ---------- utilidades ----------
const fmtDate = d => new Date(d).toLocaleDateString('es-PE');
const fmtDateTime = d => new Date(d).toLocaleString('es-PE');

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  let body = null;
  try { body = await res.json(); } catch(e) { /* no json */ }
  if (!res.ok) {
    const msg = body && body.message ? body.message : JSON.stringify(body);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return body;
}

// ---------- CARGAR PRODUCTOS Y ALERTAS ----------
async function cargarProductos() {
  try {
    const data = await fetchJson('/api/productos');
    const productos = data.productos || [];
    const vencidos = productos.filter(p => new Date(p.fecha_vencimiento) < new Date());
    const porVencer = productos.filter(p => {
      const hoy = new Date();
      const fecha30 = new Date(hoy.getTime() + 30*24*60*60*1000);
      const fechaVen = new Date(p.fecha_vencimiento);
      return fechaVen >= hoy && fechaVen <= fecha30;
    });

    // tabla productos
    const tbody = document.getElementById('productosTabla');
    if (!tbody) return;
    tbody.innerHTML = '';

    productos.forEach(p => {
      const fechaVen = new Date(p.fecha_vencimiento);
      let rowClass = '';
      if (fechaVen < new Date()) rowClass = 'bg-red-50';
      else if (fechaVen <= new Date(new Date().getTime()+30*24*60*60*1000)) rowClass = 'bg-yellow-50';

      tbody.innerHTML += `
        <tr class="${rowClass} text-center">
          <td class="py-2 px-3">${escapeHtml(p.nombre)}</td>
          <td class="py-2 px-3">S/ ${Number(p.precio).toFixed(2)}</td>
          <td class="py-2 px-3">${p.stock}</td>
          <td class="py-2 px-3">${fmtDate(p.fecha_vencimiento)}</td>
          <td class="py-2 px-3">
            <button onclick="abrirModalEditar('${p._id}')" class="bg-blue-500 text-white px-2 py-1 rounded mr-2">Editar</button>
            <button onclick="eliminarProducto('${p._id}')" class="bg-red-500 text-white px-2 py-1 rounded">Eliminar</button>
          </td>
        </tr>
      `;
    });

    // alertas visuales
    const alertVencidosEl = document.getElementById('alertVencidos');
    const alertPorVencerEl = document.getElementById('alertPorVencer');

    if (vencidos.length > 0) {
      alertVencidosEl.classList.remove('hidden');
      alertVencidosEl.innerHTML = `<strong>${vencidos.length}</strong> producto(s) vencido(s): ${vencidos.map(x => escapeHtml(x.nombre)).slice(0,5).join(', ')}${vencidos.length>5? '...' : ''}`;
    } else alertVencidosEl.classList.add('hidden');

    if (porVencer.length > 0) {
      alertPorVencerEl.classList.remove('hidden');
      alertPorVencerEl.innerHTML = `<strong>${porVencer.length}</strong> producto(s) por vencer (30d): ${porVencer.map(x => escapeHtml(x.nombre)).slice(0,5).join(', ')}${porVencer.length>5? '...' : ''}`;
    } else alertPorVencerEl.classList.add('hidden');

    // actualizar select ventas
    await poblarSelectProductos();

  } catch (err) {
    console.error('Error en cargarProductos:', err);
    alert('Error cargando productos: ' + err.message);
  }
}

// escape html
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

// ---------- AGREGAR PRODUCTO ----------
async function agregarProducto(event) {
  event.preventDefault();
  try {
    const nombre = document.getElementById('prodNombre').value.trim();
    const precio = parseFloat(document.getElementById('prodPrecio').value);
    const stock = parseInt(document.getElementById('prodStock').value, 10);
    const fecha_vencimiento = document.getElementById('prodFecha').value;

    if (!nombre || Number.isNaN(precio) || Number.isNaN(stock) || !fecha_vencimiento) {
      return alert('Completa todos los campos correctamente');
    }

    // comprobar duplicados
    const productosExistentes = await fetchJson('/api/productos');
    if (productosExistentes.productos.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) {
      return alert('⚠️ Este producto ya existe');
    }

    await fetchJson('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio, stock, fecha_vencimiento })
    });

    document.getElementById('formProducto').reset();
    await cargarProductos();
    alert('Producto agregado correctamente');
  } catch (err) {
    console.error('Error agregarProducto:', err);
    alert('Error al agregar producto: ' + err.message);
  }
}

// ---------- EDITAR ----------
function abrirModalEditar(id) {
  fetch('/api/productos')
    .then(r => r.json())
    .then(data => {
      const p = (data.productos || []).find(x => x._id === id);
      if (!p) return alert('Producto no encontrado');

      document.getElementById('editId').value = p._id;
      document.getElementById('editNombre').value = p.nombre;
      document.getElementById('editPrecio').value = p.precio;
      document.getElementById('editStock').value = p.stock;
      const dt = new Date(p.fecha_vencimiento);
      const iso = new Date(dt.getTime() - dt.getTimezoneOffset()*60000).toISOString().slice(0,10);
      document.getElementById('editFecha').value = iso;

      const modal = document.getElementById('modalEditar');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    })
    .catch(err => {
      console.error(err);
      alert('Error al abrir modal: ' + err.message);
    });
}

function cerrarModal() {
  const modal = document.getElementById('modalEditar');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function enviarEdicion(e) {
  e.preventDefault();
  try {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value.trim();
    const precio = parseFloat(document.getElementById('editPrecio').value);
    const stock = parseInt(document.getElementById('editStock').value, 10);
    const fecha_vencimiento = document.getElementById('editFecha').value;

    if (!id || !nombre || Number.isNaN(precio) || Number.isNaN(stock) || !fecha_vencimiento) {
      return alert('Completa todos los campos para editar');
    }

    await fetchJson('/api/productos/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio, stock, fecha_vencimiento })
    });

    cerrarModal();
    await cargarProductos();
    alert('Producto actualizado');
  } catch (err) {
    console.error('Error enviarEdicion:', err);
    alert('Error al actualizar producto: ' + err.message);
  }
}

// ---------- ELIMINAR ----------
async function eliminarProducto(id) {
  if (!confirm('¿Eliminar producto?')) return;
  try {
    await fetchJson('/api/productos/' + id, { method: 'DELETE' });
    await cargarProductos();
    alert('Producto eliminado');
  } catch (err) {
    console.error('Error eliminarProducto:', err);
    alert('Error al eliminar: ' + err.message);
  }
}

// ---------- VENTAS ----------
async function poblarSelectProductos() {
  const sel = document.getElementById('selectProducto');
  if (!sel) return;
  try {
    const data = await fetchJson('/api/productos');
    sel.innerHTML = '';
    (data.productos || []).forEach(p => {
      if ((p.stock || 0) > 0) {
        const opt = document.createElement('option');
        opt.value = p._id;
        opt.textContent = `${p.nombre} (stock: ${p.stock})`;
        sel.appendChild(opt);
      }
    });
  } catch (err) {
    console.error('Error poblarSelectProductos:', err);
  }
}

async function registrarVenta(e) {
  if (e) e.preventDefault();
  const select = document.getElementById('selectProducto');
  if (!select) return;
  const producto = select.value;
  const cantidad = parseInt(document.getElementById('ventaCantidad').value, 10);
  if (!producto || Number.isNaN(cantidad) || cantidad <= 0) return alert('Selecciona producto y cantidad válida');

  try {
    const res = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ producto, cantidad })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Error al registrar venta');
    }
    await cargarProductos();
    await cargarVentas();
    await poblarSelectProductos();
    alert('Venta registrada');
  } catch (err) {
    console.error('Error registrarVenta:', err);
    alert('Error al registrar venta: ' + err.message);
  }
}

async function cargarVentas(mostrarTodas = false) {
  const res = await fetch('/api/ventas');
  const ventas = await res.json();

  if (!mostrarTodas) {
    // calcular rango de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    // filtrar solo las ventas de hoy
    const ventasHoy = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      return fechaVenta >= hoy && fechaVenta < mañana;
    });

    mostrarVentasEnTabla(ventasHoy);
  } else {
    // mostrar todas (cuando presionas el botón "Mostrar todas")
    mostrarVentasEnTabla(ventas);
  }
}

function mostrarVentasEnTabla(ventas) {
  const tbody = document.getElementById('ventasTabla');
  tbody.innerHTML = '';
  let totalGeneral = 0;

  ventas.forEach(v => {
    const precio = v.producto?.precio || 0;
    const nombre = v.producto?.nombre || "—";
    const totalVenta = precio * v.cantidad;
    totalGeneral += totalVenta;

    tbody.innerHTML += `
      <tr class="text-center">
        <td class="py-2 px-3">${nombre}</td>
        <td class="py-2 px-3">${v.cantidad}</td>
        <td class="py-2 px-3">S/ ${precio.toFixed(2)}</td>
        <td class="py-2 px-3">S/ ${totalVenta.toFixed(2)}</td>
        <td class="py-2 px-3">${new Date(v.fecha).toLocaleString('es-PE')}</td>
      </tr>
    `;
  });

  let totalEl = document.getElementById('totalGeneral');
  if (totalEl) totalEl.textContent = "S/ " + totalGeneral.toFixed(2);
}


// ---------- FILTRO POR FECHA ----------
async function filtrarVentas() {
  const fecha = document.getElementById('fechaFiltro').value;
  if (!fecha) return;

  const inicio = new Date(fecha + 'T00:00:00');
  const fin = new Date(fecha + 'T23:59:59');

  const res = await fetch('/api/ventas');
  const ventas = await res.json();

  const ventasFiltradas = ventas.filter(v => {
    const fechaVenta = new Date(v.fecha);
    return fechaVenta >= inicio && fechaVenta <= fin;
  });

  mostrarVentasEnTabla(ventasFiltradas);
}

// ---------- PDF ----------
function descargarPDF() {
  const fecha = document.getElementById('fechaFiltro').value;
  let url = '/api/ventas/pdf';
  if (fecha) url += `?fecha=${fecha}`;
  window.open(url, '_blank');
}

// ---------- CONSULTAR STOCK ----------
async function consultarStock() {
  const nombre = document.getElementById('buscarStock').value.trim().toLowerCase();
  if (!nombre) {
    document.getElementById('resultadoStock').innerText = "⚠️ Ingrese un nombre de producto.";
    return;
  }

  const res = await fetch('/api/productos');
  const data = await res.json();
  const producto = data.productos.find(p => p.nombre.toLowerCase() === nombre);

  document.getElementById('resultadoStock').innerText = producto
    ? `📦 El producto "${producto.nombre}" tiene ${producto.stock} unidades en stock.`
    : "❌ Producto no encontrado.";
}

// ---------- SOCKET ----------
socket.on('ventaActualizada', () => {
  cargarProductos();
  cargarVentas();
  poblarSelectProductos();
});

// ---------- INICIALIZAR ----------
document.addEventListener('DOMContentLoaded', () => {
  const formProducto = document.getElementById('formProducto');
  if (formProducto) formProducto.addEventListener('submit', agregarProducto);

  const formEditar = document.getElementById('formEditar');
  if (formEditar) formEditar.addEventListener('submit', enviarEdicion);

  const formVenta = document.getElementById('formVenta');
  if (formVenta) formVenta.addEventListener('submit', registrarVenta);

  const btnFiltrar = document.getElementById('btnFiltrar');
  if (btnFiltrar) btnFiltrar.addEventListener('click', filtrarVentas);

  const btnMostrarTodos = document.getElementById('btnMostrarTodos');
  if (btnMostrarTodos) btnMostrarTodos.addEventListener('click', cargarVentas);

  // cargar datos iniciales
  cargarProductos();
  cargarVentas();
  poblarSelectProductos();
});


