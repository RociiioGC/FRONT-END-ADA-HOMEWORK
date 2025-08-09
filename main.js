const $ = (sel) => document.querySelector(sel);

// Estado
const items = []; // { id, nombre, categoria }
let filtroActual = 'Todos';

// Elementos
const form    = $('#itemForm');
const nombre  = $('#itemName');
const cat     = $('#itemCategory');
const lista   = $('#list');
const estado  = $('#status');
const vacio   = $('#empty');

const filterBtn  = $('#filterBtn');
const filterMenu = $('#filterMenu');

// Inicio
document.addEventListener('DOMContentLoaded', () => {
  form.addEventListener('submit', agregarItem);
  lista.addEventListener('click', onListaClick);

  // Abrir/cerrar menú
  filterBtn.addEventListener('click', () => {
    if (filterMenu.hasAttribute('hidden')) filterMenu.removeAttribute('hidden');
    else filterMenu.setAttribute('hidden', '');
  });

  // Elegir categoría desde el menú
  filterMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    setFiltro(item.dataset.cat);
    filterBtn.textContent = item.textContent + ' ▾';
    filterMenu.setAttribute('hidden', '');
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!filterMenu.contains(e.target) && e.target !== filterBtn) {
      filterMenu.setAttribute('hidden', '');
    }
  });

  render();
});

function agregarItem(e){
  e.preventDefault();
  const nombreNuevo = nombre.value.trim();
  if (!nombreNuevo) {
    alert('Ingresá un producto');
    nombre.focus();
    return;
  }
  items.push({
    id: Date.now(),
    nombre: nombreNuevo,
    categoria: cat.value
  });
  form.reset();
  nombre.focus();
  render();
}

function onListaClick(e){
  if (!e.target.matches('.delete')) return;
  const li = e.target.closest('[data-id]');
  const id = Number(li.dataset.id);
  const idx = items.findIndex(it => it.id === id);
  if (idx !== -1) {
    items.splice(idx, 1);
    render();
  }
}

function setFiltro(cat){
  filtroActual = cat;
  render();
}

function render(){
  const visibles = items.filter(it =>
    filtroActual === 'Todos' ? true : it.categoria === filtroActual
  );

  lista.innerHTML = visibles.map(it => `
    <li class="item" data-id="${it.id}">
      <strong>${escapeHtml(it.nombre)}</strong>
      <span class="badge">${it.categoria}</span>
      <button class="delete">Eliminar</button>
    </li>
  `).join('');

  estado.textContent = `Mostrando: ${filtroActual} (${visibles.length})`;
  vacio.hidden = visibles.length !== 0;
}

function escapeHtml(str){
  return str.replace(/[&<>"']/g, (m)=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}