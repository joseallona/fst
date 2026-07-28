// ============================================================
// Diseñar Futuros — frontend (vanilla JS, sin frameworks)
// ============================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const api = async (url, opts = {}) => {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" }, ...opts,
  });
  if (!r.ok) {
    let msg = r.statusText;
    try { msg = (await r.json()).detail || msg; } catch (e) {}
    throw new Error(msg);
  }
  return r.status === 204 ? null : r.json();
};
const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"]/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));

let toastTimer;
function toast(msg, ms = 2600) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

// estado global
const STATE = { tematicas: [], fuentes: [], senales: [], caps: {} };

// ---------- side panel ----------
function abrirPanel(html) {
  $("#side-content").innerHTML = html;
  $("#side-panel").classList.add("open");
}
$("#side-close").onclick = () => $("#side-panel").classList.remove("open");

// ---------- tabs ----------
$$(".tab").forEach(t => t.onclick = () => {
  if (t.disabled) return;
  $$(".tab").forEach(x => x.classList.remove("active"));
  $$(".vista").forEach(x => x.classList.remove("active"));
  t.classList.add("active");
  $("#vista-" + t.dataset.tab).classList.add("active");
  const fn = { fuentes: cargarFuentes, senales: cargarSenales,
    clusters: cargarClusters, tendencias: cargarTendencias,
    visualizaciones: cargarViz, escenarios: cargarEscenarios }[t.dataset.tab];
  if (fn) fn();
});

// =====================================================================
// TAB FUENTES
// =====================================================================
const NIVELES = ["nucleo", "adyacente", "periferico"];

async function cargarTematicas() {
  STATE.tematicas = await api("/tematicas");
  NIVELES.forEach(n => {
    const cont = $("#chips-" + n);
    const items = STATE.tematicas.filter(t => t.nivel === n);
    $("#c-" + n).textContent = items.length;
    cont.innerHTML = items.map(t => `
      <div class="chip" data-id="${t.id}">
        <span class="chip-text">${esc(t.nombre)}
          <span class="chip-desc">${esc(t.descripcion || "")}</span></span>
        <span class="x" data-del="${t.id}">×</span>
      </div>`).join("");
  });
  // poblar select de temáticas del form de fuente
  $("#form-fuente-tematica").innerHTML = '<option value="">—</option>' +
    STATE.tematicas.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join("");
  // editar / borrar chips
  $$(".chip").forEach(ch => {
    ch.querySelector(".chip-text").onclick = () => editarTematica(+ch.dataset.id);
    ch.querySelector(".x").onclick = async (e) => {
      e.stopPropagation();
      if (confirm("¿Eliminar esta temática?")) {
        await api("/tematicas/" + ch.dataset.id, { method: "DELETE" });
        cargarTematicas();
      }
    };
  });
}

async function editarTematica(id) {
  const t = STATE.tematicas.find(x => x.id === id);
  const nombre = prompt("Nombre de la temática:", t.nombre);
  if (nombre == null) return;
  const descripcion = prompt("Descripción:", t.descripcion || "");
  await api("/tematicas/" + id, { method: "PATCH",
    body: JSON.stringify({ nombre, descripcion }) });
  cargarTematicas();
}

$$(".add-tematica").forEach(b => b.onclick = async () => {
  const nombre = prompt("Nombre de la nueva temática:");
  if (!nombre) return;
  const descripcion = prompt("Descripción (opcional):") || "";
  await api("/tematicas", { method: "POST",
    body: JSON.stringify({ nombre, nivel: b.dataset.nivel, descripcion }) });
  cargarTematicas();
});

$("#btn-generar-mapa").onclick = async () => {
  const r = await api("/tematicas/generar", { method: "POST" });
  toast(`Mapa generado: ${r.creadas} temáticas nuevas (${r.total} total)`);
  cargarTematicas();
};

const STEEP = ["Social", "Tecnológico", "Económico", "Ecológico", "Político", "(sin)"];
const CAPAS = [["alta_frecuencia", "Alta frecuencia"],
  ["media_frecuencia", "Media frecuencia"], ["baja_frecuencia", "Baja frecuencia"]];

async function cargarFuentes() {
  await cargarTematicas();
  STATE.fuentes = await api("/fuentes");
  const cont = $("#fuentes-lista");
  const activasPorCapa = {};
  let html = "";
  for (const [capa, label] of CAPAS) {
    const fs = STATE.fuentes.filter(f => f.categoria === capa);
    activasPorCapa[capa] = fs.filter(f => f.activa).length;
    if (!fs.length) continue;
    html += `<div class="capa-group"><div class="capa-titulo">${label}
      <span class="pill">${fs.length} fuentes · ${activasPorCapa[capa]} activas</span></div>`;
    for (const q of STEEP) {
      const grupo = fs.filter(f => (f.cuadrante_steep || "(sin)") === q);
      if (!grupo.length) continue;
      html += `<details class="steep-acc"${capa === "alta_frecuencia" ? " open" : ""}>
        <summary><span>${q}</span><span class="muted">${grupo.length}</span></summary>`;
      for (const f of grupo) html += fuenteRow(f);
      html += `</details>`;
    }
    html += `</div>`;
  }
  cont.innerHTML = html || '<p class="hint">Sin fuentes todavía. Generá el mapa y hacé clic en "Sugerir 500 fuentes".</p>';
  $("#resumen-capas").textContent = CAPAS.map(([c, l]) =>
    `${l}: ${activasPorCapa[c] || 0} activas`).join(" · ");
  $$(".toggle-activa", cont).forEach(el => el.onclick = async () => {
    await api("/fuentes/" + el.dataset.id, { method: "PATCH",
      body: JSON.stringify({ activa: el.dataset.activa === "1" ? 0 : 1 }) });
    cargarFuentes();
  });
  $$(".fuente-del", cont).forEach(el => el.onclick = async () => {
    if (confirm("¿Eliminar fuente?")) {
      await api("/fuentes/" + el.dataset.id, { method: "DELETE" });
      cargarFuentes();
    }
  });
}

function calClass(c) {
  const k = (c || "sin").split(" ")[0];
  return "cal-" + k;
}
function fuenteRow(f) {
  const tmt = STATE.tematicas.find(t => t.id === f.tematica_id);
  return `<div class="fuente-row">
    <input type="checkbox" class="toggle-activa" data-id="${f.id}" data-activa="${f.activa}" ${f.activa ? "checked" : ""}>
    <div class="fuente-nombre"><div>${esc(f.nombre)}</div>
      <a href="${esc(f.url)}" target="_blank">${esc(f.url)}</a></div>
    <span class="badge ${f.tipo_acceso}">${f.tipo_acceso === "api_google_news" ? "GNEWS" : f.tipo_acceso.toUpperCase()}</span>
    <span class="badge ${calClass(f.calidad)}">${esc(f.calidad)}</span>
    <span class="muted">${f.senales_generadas} señ.</span>
    <span class="muted" title="temática">${tmt ? esc(tmt.nombre.slice(0, 22)) : "—"}</span>
    <span class="x fuente-del" data-id="${f.id}" style="cursor:pointer;color:#9ca3af">🗑</span>
  </div>`;
}

$("#btn-sugerir").onclick = async () => {
  $("#btn-sugerir").disabled = true;
  $("#btn-sugerir").textContent = "Generando…";
  try {
    const r = await api("/fuentes/sugerir", { method: "POST" });
    toast(`${r.creadas} fuentes nuevas generadas (${r.total} total)`);
    await cargarFuentes();
  } catch (e) { toast("Error: " + e.message); }
  $("#btn-sugerir").disabled = false;
  $("#btn-sugerir").textContent = "Sugerir 500 fuentes desde el mapa";
};

$("#btn-toggle-form-fuente").onclick = () => $("#form-fuente").classList.toggle("hidden");
$("#form-fuente").onsubmit = async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  if (fd.tematica_id === "") delete fd.tematica_id;
  await api("/fuentes", { method: "POST", body: JSON.stringify(fd) });
  e.target.reset(); $("#form-fuente").classList.add("hidden");
  toast("Fuente agregada"); cargarFuentes();
};

// =====================================================================
// TAB SEÑALES
// =====================================================================
let scraperPoll = null;
const seleccion = new Set();

async function cargarSenales() {
  const params = new URLSearchParams();
  if (!$("#toggle-no-relevantes").checked) params.set("relevante", "1");
  const q = $("#senal-buscar").value.trim();
  if (q) params.set("q", q);
  const smin = +$("#score-slider").value;
  if (smin > 0) params.set("score_min", smin);
  const data = await api("/senales?" + params.toString());
  STATE.senales = data.senales;
  renderSenales(data);
  actualizarEstadoScraper();
  if (STATE.caps.scoring) $("#panel-rescraping").classList.remove("hidden");
}

function scoreBadge(s) {
  if (s.score_calidad == null) return '<span class="muted">—</span>';
  const cls = s.score_calidad >= 70 ? "score-hi" : s.score_calidad >= 40 ? "score-mid" : "score-lo";
  return `<span class="score-badge ${cls}">${s.score_calidad}</span>`;
}

function renderSenales(data) {
  const c = data.contadores || {};
  $("#contador-senales").textContent =
    `${c.r || 0} relevantes · ${c.nr || 0} no relevantes · ${c.t || 0} total`;
  const cols = `<tr><th></th><th>Score</th><th>Título</th><th>Cuadrante</th>
    <th>Driver</th><th>Calidad</th><th>Fecha origen</th></tr>`;
  let rows = "";
  for (const s of STATE.senales) {
    const fuente = STATE.fuentes.find(f => f.id === s.fuente_id);
    rows += `<tr class="senal-tr" data-id="${s.id}">
      <td><input type="checkbox" class="sel" data-id="${s.id}" ${seleccion.has(s.id) ? "checked" : ""}></td>
      <td>${scoreBadge(s)}</td>
      <td><b>${esc(s.titulo)}</b>${s.es_relevante ? "" : ' <span class="badge cal-baja">no rel.</span>'}</td>
      <td>${esc(s.cuadrante_steep || "—")}</td>
      <td>${esc((s.driver_hipotesis || "—").slice(0, 40))}</td>
      <td><span class="badge ${calClass(s.calidad_senal)}">${esc(s.calidad_senal || "—")}</span></td>
      <td class="muted">${esc((s.fecha_origen || "—").slice(0, 16))}</td></tr>`;
  }
  $("#senales-tabla").innerHTML =
    `<table class="senales"><thead>${cols}</thead><tbody>${rows || '<tr><td colspan="7" class="muted" style="padding:20px;text-align:center">Sin señales todavía. Iniciá el scraper o cargá una manual.</td></tr>'}</tbody></table>`;
  $$(".senal-tr").forEach(tr => tr.onclick = (e) => {
    if (e.target.classList.contains("sel")) return;
    expandirSenal(+tr.dataset.id, tr);
  });
  $$(".sel").forEach(cb => cb.onclick = (e) => {
    e.stopPropagation();
    const id = +cb.dataset.id;
    cb.checked ? seleccion.add(id) : seleccion.delete(id);
    actualizarLote();
  });
}

function expandirSenal(id, tr) {
  const ex = tr.nextElementSibling;
  if (ex && ex.classList.contains("senal-detalle")) { ex.remove(); return; }
  const s = STATE.senales.find(x => x.id === id);
  const fuente = STATE.fuentes.find(f => f.id === s.fuente_id);
  let scoreHtml = "";
  if (s.score_calidad != null) {
    scoreHtml = `<p class="muted" style="white-space:pre-line">${esc(s.razon_score || "")}</p>`;
  }
  const det = document.createElement("tr");
  det.className = "senal-detalle";
  det.innerHTML = `<td colspan="7">
    <div class="cita-block">"${esc(s.cita_relevancia)}"</div>
    <p><a href="${esc(s.url_directa)}" target="_blank">${esc(s.url_directa)}</a>
       ${fuente ? " · fuente: " + esc(fuente.nombre) : ""}</p>
    ${scoreHtml}
    <div class="grid-2">
      <label>Cuadrante STEEP
        <select class="inline-edit" data-campo="cuadrante_steep" data-id="${id}">
          ${["", "Social", "Tecnológico", "Económico", "Ecológico", "Político"].map(o =>
            `<option ${o === (s.cuadrante_steep || "") ? "selected" : ""}>${o}</option>`).join("")}
        </select></label>
      <label>Calidad
        <select class="inline-edit" data-campo="calidad_senal" data-id="${id}">
          ${["sin evaluar", "alta", "media", "baja", "útil"].map(o =>
            `<option ${o === (s.calidad_senal || "") ? "selected" : ""}>${o}</option>`).join("")}
        </select></label>
    </div>
    <label>Driver-hipótesis
      <input class="inline-edit" data-campo="driver_hipotesis" data-id="${id}" value="${esc(s.driver_hipotesis || "")}"></label>
    <label>Por qué es señal (interpretación del grupo)
      <textarea class="inline-edit" data-campo="por_que_es_senal" data-id="${id}" rows="2">${esc(s.por_que_es_senal || "")}</textarea></label>
    <button class="btn danger" data-borrar="${id}">Borrar señal</button>
  </td>`;
  tr.after(det);
  $$(".inline-edit", det).forEach(el => el.onchange = async () => {
    await api("/senales/" + el.dataset.id, { method: "PATCH",
      body: JSON.stringify({ [el.dataset.campo]: el.value }) });
    toast("Guardado");
    const sg = STATE.senales.find(x => x.id === +el.dataset.id);
    if (sg) sg[el.dataset.campo] = el.value;
  });
  $("[data-borrar]", det).onclick = async () => {
    if (confirm("¿Borrar señal?")) {
      await api("/senales/" + id, { method: "DELETE" });
      cargarSenales();
    }
  };
}

// --- lote ---
function actualizarLote() {
  $("#lote-count").textContent = seleccion.size;
  $("#lote-toolbar").classList.toggle("hidden", seleccion.size === 0);
}
$("#lote-aplicar").onclick = async () => {
  const body = { ids: [...seleccion] };
  if ($("#lote-cuadrante").value) body.cuadrante_steep = $("#lote-cuadrante").value;
  if ($("#lote-calidad").value) body.calidad_senal = $("#lote-calidad").value;
  await api("/senales/lote", { method: "PATCH", body: JSON.stringify(body) });
  toast(`${seleccion.size} señales actualizadas`);
  seleccion.clear(); actualizarLote(); cargarSenales();
};
$("#lote-borrar").onclick = async () => {
  if (!confirm(`¿Borrar ${seleccion.size} señales?`)) return;
  await api("/senales/lote", { method: "DELETE", body: JSON.stringify({ ids: [...seleccion] }) });
  toast("Señales borradas"); seleccion.clear(); actualizarLote(); cargarSenales();
};

// --- scraper control ---
$("#btn-scraper-iniciar").onclick = async () => {
  try {
    await api("/scraper/iniciar", { method: "POST", body: "{}" });
    toast("Scraper iniciado"); iniciarPoll();
  } catch (e) { toast("Error: " + e.message); }
};
$("#btn-scraper-detener").onclick = async () => {
  await api("/scraper/detener", { method: "POST" });
  toast("Deteniendo scraper…");
};

function iniciarPoll() {
  if (scraperPoll) clearInterval(scraperPoll);
  scraperPoll = setInterval(actualizarEstadoScraper, 1500);
  actualizarEstadoScraper();
}

let ultimoEstadoCorriendo = false;
async function actualizarEstadoScraper() {
  let est;
  try { est = await api("/scraper/estado"); } catch (e) { return; }
  const job = est.job || {};
  $("#kpi-encontrados").textContent = job.items_encontrados || 0;
  $("#kpi-relevantes").textContent = job.items_relevantes || 0;
  $("#kpi-descartados").textContent = job.items_descartados || 0;
  $("#kpi-duplicados").textContent = job.duplicados || 0;
  $("#kpi-fuentes").textContent = `${job.fuentes_procesadas || 0}/${job.fuentes_total || 0}`;
  const pct = job.fuentes_total ? (100 * (job.fuentes_procesadas || 0) / job.fuentes_total) : 0;
  $("#progress-bar").style.width = pct + "%";
  $("#capa-actual").textContent = est.corriendo
    ? `corriendo — ${(est.capa_actual || "").replace("_", " ")}` : "";
  $("#btn-scraper-iniciar").disabled = est.corriendo;
  $("#btn-scraper-detener").disabled = !est.corriendo;
  // errores
  let errs = [];
  try { errs = JSON.parse(job.errores || "[]"); } catch (e) {}
  $("#errores-count").textContent = errs.length;
  $("#errores-lista").innerHTML = errs.map(e => `<li>${esc(e)}</li>`).join("");
  // al terminar, refrescar tabla una vez
  if (ultimoEstadoCorriendo && !est.corriendo) {
    clearInterval(scraperPoll); scraperPoll = null;
    cargarSenales(); cargarFuentes();
    toast("Scraping finalizado");
  }
  ultimoEstadoCorriendo = est.corriendo;
}

$("#senal-buscar").oninput = debounce(cargarSenales, 350);
$("#toggle-no-relevantes").onchange = cargarSenales;
$("#score-slider").oninput = () => { $("#score-val").textContent = $("#score-slider").value; };
$("#score-slider").onchange = cargarSenales;
$("#btn-toggle-form-senal").onclick = () => $("#form-senal").classList.toggle("hidden");
$("#form-senal").onsubmit = async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  try {
    await api("/senales", { method: "POST", body: JSON.stringify(fd) });
    e.target.reset(); $("#form-senal").classList.add("hidden");
    toast("Señal agregada"); cargarSenales();
  } catch (e) { toast("Error: " + e.message); }
};

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// =====================================================================
// TABS ML (placeholder hasta instalar embeddings) — se completan luego
// =====================================================================
async function cargarClusters() { if (window.cargarClustersImpl) return window.cargarClustersImpl(); }
async function cargarTendencias() { if (window.cargarTendenciasImpl) return window.cargarTendenciasImpl(); }
async function cargarViz() { if (window.cargarVizImpl) return window.cargarVizImpl(); }
async function cargarEscenarios() { if (window.cargarEscenariosImpl) return window.cargarEscenariosImpl(); }

// =====================================================================
// INIT
// =====================================================================
async function init() {
  try { STATE.caps = await api("/capacidades"); } catch (e) { STATE.caps = {}; }
  if (STATE.caps.territorio) $("#territorio").textContent = STATE.caps.territorio;
  // habilitar tabs ML si el backend lo soporta
  ["clusters", "tendencias", "visualizaciones", "escenarios"].forEach(t =>
    $(`[data-tab="${t}"]`).disabled = !STATE.caps.clustering);
  cargarFuentes();
  // si hay un scraping corriendo al cargar, retomar el poll
  actualizarEstadoScraper().then(() => { if (ultimoEstadoCorriendo) iniciarPoll(); });
}
init();
