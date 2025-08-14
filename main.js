const $ = (selector) => document.querySelector(selector);

// ===== Estado =====
let productos = [];

// ===== Elementos del DOM (IDs) =====
const formulario      = $("#itemForm");
const nombreInput     = $("#itemName");
const categoriaSelect = $("#itemCategory");
const listaContainer  = $("#list");      // <ul>
const estado          = $("#status");    // contador

const filterBtn  = $("#filterBtn");      // botón "Todos ▾" 
const filterMenu = $("#filterMenu");     // menú con .menu-item 

// ===== Inicio =====
document.addEventListener("DOMContentLoaded", function () {
  formulario.addEventListener("submit", agregarProducto);
  obtenerProductos();
  mostrarProductos();

  // sincronizar el label con la URL:
  const params = new URLSearchParams(window.location.search);
  const catURL = params.get("categoria");
  if (filterBtn) filterBtn.textContent = (catURL || "Todos") + " ▾";

  // menú de categorías 
  if (filterBtn && filterMenu) {
    // abrir/cerrar
    filterBtn.addEventListener("click", () => {
      if (filterMenu.hasAttribute("hidden")) filterMenu.removeAttribute("hidden");
      else filterMenu.setAttribute("hidden", "");
    });

    // elegir categoría -> actualiza URL y repinta
    filterMenu.addEventListener("click", (e) => {
      const item = e.target.closest(".menu-item");
      if (!item) return;
      filtrarPorCategoria(item.dataset.cat); 
      filterMenu.setAttribute("hidden", "");
    });

    // cerrar al click fuera
    document.addEventListener("click", (e) => {
      if (!filterMenu.contains(e.target) && !filterBtn.contains(e.target)) {
        filterMenu.setAttribute("hidden", "");
      }
    });
  }
});

// ===== Funciones =====
function agregarProducto(e) {
  e.preventDefault();

  const nombre   = nombreInput.value.trim();
  const categoria = categoriaSelect.value;

  if (!nombre) {
    alert("Ingresá un producto");
    return;
  }

  const nuevoProducto = {
    id: Date.now(),
    nombre,
    categoria,
  };

  productos.push(nuevoProducto);

  guardarProductosLocal();
  mostrarProductos();
  formulario.reset();
  nombreInput.focus();
}

function mostrarProductos() {
  const params = new URLSearchParams(window.location.search);
  const categoriaFiltrada = params.get("categoria");

  // Filtrar por categoría
  let productosFiltrados = productos;
  if (categoriaFiltrada) {
    productosFiltrados = productos.filter(p => p.categoria === categoriaFiltrada);
  }

  // Mensaje de lista vacía 
  if (productosFiltrados.length === 0) {
    listaContainer.innerHTML = '<li class="vacio">No hay productos en tu lista</li>';
  } else {
    listaContainer.innerHTML = productosFiltrados.map(
      (p) => `
        <li class="item" data-id="${p.id}">
          <strong>${p.nombre}</strong>
          <span class="badge">${p.categoria}</span>
          <button id="delete" onclick="eliminarProducto(${p.id})" type="button" class="delete">Eliminar</button>
        </li>`
    ).join('');
  }

  // Contador y etiqueta del botón
  if (estado) {
    const label = categoriaFiltrada || "Todos";
    estado.textContent = `Mostrando: ${label} (${productosFiltrados.length})`;
  }
  if (filterBtn) filterBtn.textContent = (categoriaFiltrada || "Todos") + " ▾";
}

function eliminarProducto(id) {
  productos = productos.filter(p => p.id !== id);
  guardarProductosLocal();
  mostrarProductos();
}

function guardarProductosLocal() {
  localStorage.setItem("productos", JSON.stringify(productos));
}

function obtenerProductos() {
  const guardados = localStorage.getItem("productos");
  if (guardados) {
    productos = JSON.parse(guardados);
  }
}

// Actualizar la URL con ?categoria=... 
function filtrarPorCategoria(categoria) {
  const url = new URL(window.location); // URL actual

  if (categoria) {
    url.searchParams.set("categoria", categoria);
  } else {
    url.searchParams.delete("categoria");
  }

  window.history.pushState({}, "", url); // cambiar URL sin recargar
  mostrarProductos();

  // actualizar etiqueta del botón (si existe)
  if (filterBtn) filterBtn.textContent = (categoria || "Todos") + " ▾";
}