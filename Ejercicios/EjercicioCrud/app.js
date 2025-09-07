/***************
 * CONFIG
 ***************/
const API_URL = "https://68bdeb02227c48698f85a6c4.mockapi.io/api/v1/favorites";
// 👆 REEMPLAZA por tu URL completa de MockAPI si es distinta

// RestCountries optimizado (menos peso, menos errores por tamaño)
const COUNTRIES_URL = "https://restcountries.com/v3.1/all?fields=name,cca3,region,flags";

/***************
 * DOM
 ***************/
const tablaBody = document.getElementById("tabla-favoritos");
const form = document.getElementById("form-pais");
const btnAbrirCrear = document.getElementById("btn-abrir-crear");
const btnCancelar = document.getElementById("btn-cancelar");
const btnGuardar = document.getElementById("btn-guardar");
const selectPais = document.getElementById("select-pais");
const inputNota = document.getElementById("nota");
const inputId = document.getElementById("id");
const mensajeBox = document.getElementById("mensaje");
const previewFlag = document.getElementById("preview-flag");
const previewName = document.getElementById("preview-name");
const previewRegion = document.getElementById("preview-region");

/***************
 * STATE
 ***************/
let COUNTRIES = [];
let editId = null;

/***************
 * UTILS
 ***************/
function setMensaje(texto = "", tipo = "info") {
  if (!texto) { mensajeBox.innerHTML = ""; return; }
  const color = { info: "is-info", success: "is-success", warning: "is-warning", danger: "is-danger" }[tipo] || "is-info";
  mensajeBox.innerHTML = `<div class="notification ${color}">${texto}</div>`;
}

function mostrarForm(modo = "crear") {
  form.classList.remove("is-hidden");
  btnGuardar.textContent = modo === "editar" ? "Actualizar" : "Guardar";
}

function ocultarForm() {
  form.classList.add("is-hidden");
  form.reset();
  inputId.value = "";
  editId = null;
  btnGuardar.textContent = "Guardar";
  previewFlag.src = "https://placehold.co/56x36?text=%E2%80%94";
  previewName.textContent = "—";
  previewRegion.textContent = "—";
}

function countryFromSelectValue(cca3) {
  return COUNTRIES.find(c => c.cca3 === cca3);
}

function actualizarPreviewDesdeSelect() {
  const opt = selectPais.selectedOptions[0];
  if (!opt) return;
  const c = countryFromSelectValue(opt.value);
  if (!c) return;
  previewFlag.src = (c.flags?.png || c.flags?.svg || "https://placehold.co/56x36?text=%E2%80%94");
  previewName.textContent = c.name?.common || "—";
  previewRegion.textContent = c.region || "—";
}

// fetch con timeout
function fetchWithTimeout(url, opts = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => { ctrl.abort(); reject(new Error("Timeout")); }, timeoutMs);
    fetch(url, { ...opts, signal: ctrl.signal })
      .then(r => { clearTimeout(t); resolve(r); })
      .catch(err => { clearTimeout(t); reject(err); });
  });
}

// retry simple
async function fetchRetry(url, opts = {}, intentos = 2) {
  let lastErr;
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetchWithTimeout(url, opts, 10000);
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 600)); // espera corta
    }
  }
  throw lastErr;
}

/***************
 * RESTCOUNTRIES (READ externo)
 ***************/
const FALLBACK_COUNTRIES = [
  { cca3: "ARG", name: { common: "Argentina" }, region: "Americas", flags: { png: "https://flagcdn.com/w320/ar.png" } },
  { cca3: "ESP", name: { common: "Spain" }, region: "Europe", flags: { png: "https://flagcdn.com/w320/es.png" } },
  { cca3: "GBR", name: { common: "United Kingdom" }, region: "Europe", flags: { png: "https://flagcdn.com/w320/gb.png" } },
  { cca3: "FRA", name: { common: "France" }, region: "Europe", flags: { png: "https://flagcdn.com/w320/fr.png" } },
  { cca3: "USA", name: { common: "United States" }, region: "Americas", flags: { png: "https://flagcdn.com/w320/us.png" } },
  { cca3: "BRA", name: { common: "Brazil" }, region: "Americas", flags: { png: "https://flagcdn.com/w320/br.png" } },
];

async function cargarPaises() {
    try {
      setMensaje("Cargando países…");
      const res = await fetchRetry(COUNTRIES_URL);
      if (!res.ok) throw new Error(`Error HTTP RestCountries: ${res.status}`);
      const data = await res.json();
  
      COUNTRIES = data.sort((a, b) =>
        (a.name?.common || "").localeCompare(b.name?.common || "")
      );
  
      // Poblar el select
      selectPais.innerHTML = COUNTRIES
        .map(c => `<option value="${c.cca3}">${c.name?.common || c.cca3}</option>`)
        .join("");
  
      actualizarPreviewDesdeSelect();
      setMensaje(""); // 👈 LIMPIA el cartel azul
    } catch (err) {
      console.warn("RestCountries falló, usando fallback:", err);
      COUNTRIES = FALLBACK_COUNTRIES;
  
      // Poblar igual con fallback
      selectPais.innerHTML = COUNTRIES
        .map(c => `<option value="${c.cca3}">${c.name?.common || c.cca3}</option>`)
        .join("");
  
      actualizarPreviewDesdeSelect();
      setMensaje("No se pudieron cargar los países (usando lista básica).", "warning");
    }
  }

/***************
 * MOCKAPI (CRUD)
 ***************/
async function obtenerFavoritos() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Error HTTP MockAPI: ${res.status}`);
    const data = await res.json();
    mostrarFavoritosEnDOM(data);
  } catch (err) {
    console.error("Error al obtener favoritos:", err);
    const hint = API_URL.includes("<") ? " (revisa que API_URL tenga tu URL real de MockAPI)" : "";
    setMensaje("Error al obtener favoritos." + hint, "danger");
    mostrarFavoritosEnDOM([]); // deja la tabla vacía pero visible
  }
}

function mostrarFavoritosEnDOM(lista) {
  if (!lista.length) {
    tablaBody.innerHTML = `<tr><td colspan="5">No hay datos para mostrar.</td></tr>`;
    return;
  }
  tablaBody.innerHTML = "";
  lista.forEach(({ id, code, name, region, flag, note }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${name || "—"}</td>
      <td>${region || "—"}</td>
      <td>
        <img src="${flag || "https://placehold.co/56x36?text=%E2%80%94"}"
             alt="flag"
             class="flag"
             onerror="this.src='https://placehold.co/56x36?text=%E2%80%94'">
      </td>
      <td>${note || "—"}</td>
      <td>
        <button class="button is-warning is-small" onclick="editFav('${id}')">Editar</button>
        <button class="button is-danger is-small" onclick="deleteFav('${id}')">Eliminar</button>
      </td>
    `;
    tablaBody.appendChild(tr);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const opt = selectPais.selectedOptions[0];
  const c = countryFromSelectValue(opt.value);
  const payload = {
    code: c?.cca3 || opt.value,
    name: c?.name?.common || opt.textContent,
    region: c?.region || "",
    flag: c?.flags?.png || c?.flags?.svg || "",
    note: inputNota.value.trim() || ""
  };

  try {
    let res;
    if (editId) {
      res = await fetch(`${API_URL}/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Error HTTP MockAPI: ${res.status}`);
      setMensaje("Favorito actualizado correctamente ✅", "success");
    } else {
      res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Error HTTP MockAPI: ${res.status}`);
      setMensaje("Favorito creado correctamente ✅", "success");
    }
    await obtenerFavoritos();
    ocultarForm();
  } catch (err) {
    console.error(err);
    const hint = API_URL.includes("<") ? " Revisa que API_URL sea la URL completa de tu recurso en MockAPI." : "";
    setMensaje("No se pudo guardar." + hint, "danger");
  }
});

window.editFav = async function (id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error(`Error HTTP MockAPI: ${res.status}`);
    const fav = await res.json();

    const idx = Array.from(selectPais.options).findIndex(o => o.value === fav.code);
    if (idx >= 0) selectPais.selectedIndex = idx;

    inputNota.value = fav.note || "";
    previewFlag.src = fav.flag || "https://placehold.co/56x36?text=%E2%80%94";
    previewName.textContent = fav.name || "—";
    previewRegion.textContent = fav.region || "—";

    editId = fav.id;
    inputId.value = fav.id;
    mostrarForm("editar");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    console.error(err);
    setMensaje("No se pudo cargar el favorito para editar.", "danger");
  }
};

window.deleteFav = async function (id) {
  if (!confirm(`¿Eliminar este favorito?`)) return;
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Error HTTP MockAPI: ${res.status}`);
    setMensaje("Favorito eliminado ✅", "success");
    obtenerFavoritos();
  } catch (err) {
    console.error(err);
    setMensaje("No se pudo eliminar el favorito.", "danger");
  }
};

btnAbrirCrear.addEventListener("click", () => {
  form.reset();
  editId = null;
  actualizarPreviewDesdeSelect();
  mostrarForm("crear");
});

btnCancelar.addEventListener("click", ocultarForm);
selectPais.addEventListener("change", actualizarPreviewDesdeSelect);

/***************
 * INIT
 ***************/
document.addEventListener("DOMContentLoaded", async () => {
  await cargarPaises();     // llena el select desde RestCountries o fallback
  await obtenerFavoritos(); // carga tu lista desde MockAPI
});