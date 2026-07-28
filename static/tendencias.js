// ============================================================
// Tab Tendencias
// ============================================================
window.cargarTendenciasImpl = async function () {
  if (!STATE.caps.clustering) return;
  $("#vista-tendencias .placeholder").classList.add("hidden");
  const cont = $("#tendencias-contenido");
  cont.classList.remove("hidden");
  cont.innerHTML = `
    <div class="vista-head"><h2>Tendencias</h2>
      <div class="actions">
        <button class="btn" id="btn-tend-desde-clusters">Generar desde clusters validados</button>
        <button class="btn primary" id="btn-tend-nueva">+ Nueva tendencia</button>
      </div></div>
    <p class="hint">Una tendencia agrupa clusters/señales bajo un driver, con estado
      (emergente/consolidada/en declive), horizonte (H1/H2/H3) y temas internos.</p>
    <div class="lote-toolbar hidden" id="tend-profundizar-bar">
      <span><b id="tend-sel-count">0</b> seleccionadas</span>
      <label class="switch"><input type="checkbox" id="tend-scrapear" checked> y scrapear ahora</label>
      <button class="btn primary" id="btn-profundizar">Profundizar: nuevo mapa + fuentes</button>
      <span class="muted">Genera sub-temáticas y fuentes dirigidas a esa(s) tendencia(s).</span>
    </div>
    <div id="tend-lista"></div>`;
  $("#btn-tend-desde-clusters").onclick = async () => {
    const r = await api("/tendencias/desde-clusters", { method: "POST" });
    toast(`${r.creadas} tendencias creadas`); pintarTendencias();
  };
  $("#btn-tend-nueva").onclick = () => editarTendenciaPanel(null);
  $("#btn-profundizar").onclick = profundizarTendencias;
  await pintarTendencias();
};

const ESTADOS = ["emergente", "consolidada", "en declive"];
const HORIZONTES = ["H1", "H2", "H3"];

async function pintarTendencias() {
  const tends = await api("/tendencias");
  const cont = $("#tend-lista");
  if (!tends.length) { cont.innerHTML = '<p class="muted">Sin tendencias. Creá una o generá desde clusters.</p>'; return; }
  cont.innerHTML = `<div class="cluster-grid">${tends.map(t => {
    let bullets = []; try { bullets = JSON.parse(t.bullets || "[]"); } catch (e) {}
    return `<div class="cluster-card">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <input type="checkbox" class="tend-sel" data-id="${t.id}" ${selTend.has(t.id) ? "checked" : ""}>
        <b style="flex:1">${esc(t.nombre)}</b>
        <span class="badge ${t.estado === "emergente" ? "cal-media" : t.estado === "en declive" ? "cal-baja" : "cal-alta"}">${esc(t.estado)}</span>
        <span class="badge rss">${esc(t.horizonte || "")}</span>
      </div>
      <p class="muted">${esc(t.cuadrante_steep || "")} · driver: ${esc(t.driver || "—")} · fuerza ${t.fuerza}</p>
      <p class="muted">impacto ${t.impacto} · incertidumbre ${t.incertidumbre}</p>
      ${bullets.length ? `<ul style="font-size:12px;margin:6px 0">${bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="btn tend-edit" data-id="${t.id}">Editar</button>
        <button class="btn danger tend-del" data-id="${t.id}">Borrar</button>
      </div></div>`;
  }).join("")}</div>`;
  $$(".tend-edit").forEach(b => b.onclick = () => editarTendenciaPanel(tends.find(t => t.id === +b.dataset.id)));
  $$(".tend-del").forEach(b => b.onclick = async () => {
    if (confirm("¿Borrar tendencia?")) { await api("/tendencias/" + b.dataset.id, { method: "DELETE" }); pintarTendencias(); }
  });
  $$(".tend-sel").forEach(cb => cb.onclick = () => {
    const id = +cb.dataset.id;
    cb.checked ? selTend.add(id) : selTend.delete(id);
    $("#tend-sel-count").textContent = selTend.size;
    $("#tend-profundizar-bar").classList.toggle("hidden", selTend.size === 0);
  });
}

const selTend = new Set();

async function profundizarTendencias() {
  const ids = [...selTend];
  if (!ids.length) return;
  const scrapear = $("#tend-scrapear").checked;
  const btn = $("#btn-profundizar");
  btn.disabled = true; btn.textContent = "Generando…";
  try {
    const r = await api("/tendencias/profundizar", { method: "POST",
      body: JSON.stringify({ tendencia_ids: ids, scrapear }) });
    const tem = r.resumen.reduce((a, x) => a + x.tematicas_creadas, 0);
    const conceptos = r.resumen.flatMap(x => x.conceptos).slice(0, 6).join(", ");
    let msg = `${tem} sub-temáticas y ${r.total_fuentes} fuentes creadas`;
    msg += r.scrape_iniciado ? " · scraping iniciado (mirá la tab Señales)" : "";
    toast(msg, 5000);
    abrirPanel(`<h3>Profundización generada</h3>
      ${r.resumen.map(x => `<div style="border-bottom:1px solid #eee;padding:8px 0">
        <b>${esc(x.tendencia)}</b>
        <p class="muted">${x.tematicas_creadas} sub-temáticas · ${x.fuentes_creadas} fuentes</p>
        <p style="font-size:12px">Conceptos: ${x.conceptos.map(esc).join(" · ") || "(sin señales para extraer)"}</p>
      </div>`).join("")}
      ${r.scrape_iniciado ? '<p class="muted">Scraping en curso. Seguí el progreso en la tab <b>Señales</b>; al terminar, re-clusterizá para incorporarlas.</p>'
        : '<p class="muted">Fuentes creadas (sin scrapear). Podés iniciarlas desde la tab Señales o el mapa de Fuentes.</p>'}`);
    selTend.clear();
    $("#tend-profundizar-bar").classList.add("hidden");
  } catch (e) { toast("Error: " + e.message); }
  btn.disabled = false; btn.textContent = "Profundizar: nuevo mapa + fuentes";
}

function editarTendenciaPanel(t) {
  t = t || {};
  let bullets = []; try { bullets = JSON.parse(t.bullets || "[]"); } catch (e) {}
  abrirPanel(`<h3>${t.id ? "Editar" : "Nueva"} tendencia</h3>
    <label>Nombre<input id="t-nombre" value="${esc(t.nombre || "")}"></label>
    <label>Driver<input id="t-driver" value="${esc(t.driver || "")}"></label>
    <label>Estado<select id="t-estado">${ESTADOS.map(e => `<option ${e === t.estado ? "selected" : ""}>${e}</option>`).join("")}</select></label>
    <label>Horizonte<select id="t-horizonte">${HORIZONTES.map(h => `<option ${h === t.horizonte ? "selected" : ""}>${h}</option>`).join("")}</select></label>
    <label>Cuadrante STEEP<select id="t-steep"><option value="">—</option>${["Social","Tecnológico","Económico","Ecológico","Político"].map(s => `<option ${s === t.cuadrante_steep ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <label>Fuerza (1-10)<input type="number" id="t-fuerza" min="1" max="10" value="${t.fuerza || 1}"></label>
    <label>Impacto (1-5)<input type="number" id="t-impacto" min="1" max="5" value="${t.impacto || 3}"></label>
    <label>Incertidumbre (1-5)<input type="number" id="t-incert" min="1" max="5" value="${t.incertidumbre || 3}"></label>
    <label>Temas internos (uno por línea)<textarea id="t-bullets" rows="4">${esc(bullets.join("\n"))}</textarea></label>
    <button class="btn primary" id="t-guardar">Guardar</button>`);
  $("#t-guardar").onclick = async () => {
    const body = {
      nombre: $("#t-nombre").value, driver: $("#t-driver").value,
      estado: $("#t-estado").value, horizonte: $("#t-horizonte").value,
      cuadrante_steep: $("#t-steep").value, fuerza: +$("#t-fuerza").value,
      impacto: +$("#t-impacto").value, incertidumbre: +$("#t-incert").value,
      bullets: $("#t-bullets").value.split("\n").map(x => x.trim()).filter(Boolean),
    };
    if (t.id) await api("/tendencias/" + t.id, { method: "PATCH", body: JSON.stringify(body) });
    else await api("/tendencias", { method: "POST", body: JSON.stringify(body) });
    toast("Tendencia guardada"); $("#side-panel").classList.remove("open"); pintarTendencias();
  };
}
