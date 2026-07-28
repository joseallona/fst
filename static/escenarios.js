// ============================================================
// Tab Escenarios — construcción de escenarios especulativos (matriz 2×2)
// ============================================================
let ESC = null;              // escenario en edición (null = vista listado)
let ESC_CLUSTERS = [];       // cache de clusters
let ESC_PLACEMENT = null;    // último placement {cuadrantes:{q1..q4}, total}

const HORIZ = { 5: "prospectivo", 10: "exploratorio", 15: "especulativo", 30: "visionario" };
// cuadrante → [ladoX, ladoY] y posición en la grilla (fila-mayor: q2,q1,q3,q4)
const QUAD = {
  q1: { x: "pos", y: "pos", etiqueta: "X+ · Y+" },
  q2: { x: "neg", y: "pos", etiqueta: "X− · Y+" },
  q3: { x: "neg", y: "neg", etiqueta: "X− · Y−" },
  q4: { x: "pos", y: "neg", etiqueta: "X+ · Y−" },
};

window.cargarEscenariosImpl = async function () {
  if (!STATE.caps.clustering) return;
  $("#escenarios-placeholder").classList.add("hidden");
  $("#escenarios-contenido").classList.remove("hidden");
  if (ESC) renderEditor(); else renderLista();
};

// ---------------------------------------------------------------- LISTADO
async function renderLista() {
  const escs = await api("/esc");
  const cont = $("#escenarios-contenido");
  cont.innerHTML = `
    <div class="vista-head"><h2>Escenarios</h2>
      <button class="btn primary" id="esc-crear">+ Crear escenario</button></div>
    <p class="hint">Cada escenario cruza dos incertidumbres críticas en una matriz 2×2.
      Elegís clusters/señales y un horizonte temporal; el corpus puebla los 4 cuadrantes
      y redactás un futuro por cuadrante.</p>
    <div id="esc-lista">${escs.length ? "" : '<p class="muted">Todavía no hay escenarios. Creá el primero.</p>'}</div>`;
  $("#esc-crear").onclick = crearEscenario;
  const lista = $("#esc-lista");
  escs.forEach(e => {
    const div = document.createElement("div");
    div.className = "esc-card";
    div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <b>${esc(e.nombre || "(sin título)")}</b>
      <span class="horizonte-pill">${e.horizonte} años · ${HORIZ[e.horizonte] || ""}</span></div>
      <p class="muted">${e.cluster_ids.length} clusters · ${e.senal_ids.length} señales sueltas ·
        ejes: ${esc(e.eje_x_label || "—")} × ${esc(e.eje_y_label || "—")}</p>`;
    div.onclick = () => abrirEscenario(e.id);
    lista.appendChild(div);
  });
}

async function crearEscenario() {
  ESC = await api("/esc", { method: "POST", body: JSON.stringify({
    nombre: "Escenario sin título", horizonte: 10,
    eje_x_label: "Incertidumbre A", eje_y_label: "Incertidumbre B" }) });
  renderEditor();
}
async function abrirEscenario(id) { ESC = await api("/esc/" + id); renderEditor(); }

// ---------------------------------------------------------------- EDITOR
async function renderEditor() {
  if (!ESC_CLUSTERS.length) ESC_CLUSTERS = await api("/clusters");
  const cont = $("#escenarios-contenido");
  cont.innerHTML = `
    <div class="vista-head">
      <button class="btn" id="esc-volver">← Volver al listado</button>
      <div class="actions">
        <button class="btn danger" id="esc-borrar">Borrar escenario</button>
      </div>
    </div>
    <div class="esc-editor">
      <div class="grid-2">
        <label>Nombre del escenario<input id="esc-nombre" value="${esc(ESC.nombre || "")}"></label>
        <label>Horizonte temporal
          <select id="esc-horizonte">${[5, 10, 15, 30].map(h =>
            `<option value="${h}" ${h === ESC.horizonte ? "selected" : ""}>${h} años · ${HORIZ[h]}</option>`).join("")}</select></label>
      </div>
      <p class="hint">Cuanto más lejano el horizonte, más especulativo el ejercicio.</p>

      <h3 style="margin-top:14px">1 · Elegí clusters y/o señales</h3>
      <div class="esc-sel-clusters" id="esc-clusters"></div>

      <div style="background:#eef6f5;border:1px solid #d3e8e6;border-radius:10px;padding:14px;margin-top:14px">
        <button class="btn primary" id="esc-auto">✨ Generar automáticamente (ejes + escenarios)</button>
        <p class="muted" style="margin:8px 0 0">${STATE.caps.llm
          ? `La IA local (<b>${esc(STATE.caps.llm_modelo || "Ollama")}</b>) define los dos ejes y redacta los 4 escenarios a partir de tu selección. Tarda ~30-60s. Todo queda editable.`
          : "⚠️ Ollama no está corriendo. Iniciá <code>ollama serve</code> y recargá para habilitar la generación automática."}</p>
        <p class="muted" id="esc-auto-info" style="margin:6px 0 0"></p>
      </div>

      <h3 style="margin-top:16px">2 · Ejes de incertidumbre (o editalos a mano — puntas opuestas)</h3>
      <div class="esc-axes">
        <div class="esc-axis">
          <h4>Eje horizontal (X)</h4>
          <label>Nombre del eje<input id="ejx" value="${esc(ESC.eje_x_label || "")}" placeholder="p. ej. Acceso a la terapia"></label>
          <label>Punta derecha (X+)<input id="ejxp" value="${esc(ESC.eje_x_pos || "")}" placeholder="p. ej. Democratizado y masivo"></label>
          <label>Punta izquierda (X−)<input id="ejxn" value="${esc(ESC.eje_x_neg || "")}" placeholder="opuesto: p. ej. Elitista y restringido"></label>
        </div>
        <div class="esc-axis">
          <h4>Eje vertical (Y)</h4>
          <label>Nombre del eje<input id="ejy" value="${esc(ESC.eje_y_label || "")}" placeholder="p. ej. Rol del Estado"></label>
          <label>Punta superior (Y+)<input id="ejyp" value="${esc(ESC.eje_y_pos || "")}" placeholder="p. ej. Regulación fuerte"></label>
          <label>Punta inferior (Y−)<input id="ejyn" value="${esc(ESC.eje_y_neg || "")}" placeholder="opuesto: p. ej. Mercado libre"></label>
        </div>
      </div>
      <button class="btn primary" id="esc-actualizar">Actualizar cuadrantes ↻</button>
      <span class="muted" id="esc-placement-info"></span>

      <h3 style="margin-top:16px">3 · Matriz de incertidumbre · 4 escenarios</h3>
      <p class="hint" id="esc-ejes-leyenda"></p>
      <div class="esc-matriz" id="esc-matriz"></div>
    </div>`;

  $("#esc-volver").onclick = () => { ESC = null; ESC_PLACEMENT = null; renderLista(); };
  $("#esc-borrar").onclick = async () => {
    if (confirm("¿Borrar este escenario?")) {
      await api("/esc/" + ESC.id, { method: "DELETE" });
      ESC = null; renderLista();
    }
  };
  $("#esc-nombre").onchange = e => guardar({ nombre: e.target.value });
  $("#esc-horizonte").onchange = e => { ESC.horizonte = +e.target.value; guardar({ horizonte: ESC.horizonte }); pintarMatriz(); };
  // ejes: guardar en blur; recalcular al pulsar "Actualizar"
  const ejeMap = { ejx: "eje_x_label", ejxp: "eje_x_pos", ejxn: "eje_x_neg",
    ejy: "eje_y_label", ejyp: "eje_y_pos", ejyn: "eje_y_neg" };
  Object.entries(ejeMap).forEach(([id, campo]) => {
    $("#" + id).onchange = e => { ESC[campo] = e.target.value; guardar({ [campo]: e.target.value }); };
  });
  $("#esc-actualizar").onclick = actualizarPlacement;
  const btnAuto = $("#esc-auto");
  if (STATE.caps.llm) btnAuto.onclick = generarAuto; else btnAuto.disabled = true;

  renderSelectorClusters();
  pintarMatriz();
  if (tieneEjes()) actualizarPlacement();
}

async function generarAuto() {
  if (!ESC.cluster_ids.length && !ESC.senal_ids.length) {
    toast("Elegí al menos un cluster o señal primero"); return;
  }
  const btn = $("#esc-auto"), info = $("#esc-auto-info");
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = "Generando… (~30-60s)";
  info.textContent = "La IA local está pensando los ejes y redactando los 4 escenarios…";
  try {
    const r = await api("/esc/" + ESC.id + "/auto", { method: "POST", body: "{}" });
    ESC = r.escenario;
    ESC_PLACEMENT = { cuadrantes: r.cuadrantes, total: r.total };
    toast("Escenarios generados con " + r.modelo, 4000);
    renderEditor();
  } catch (e) {
    info.textContent = "Error: " + e.message;
    toast("Error: " + e.message, 6000);
    btn.disabled = false; btn.textContent = orig;
  }
}

function tieneEjes() {
  return (ESC.eje_x_pos || ESC.eje_x_neg) && (ESC.eje_y_pos || ESC.eje_y_neg);
}

async function guardar(campos) {
  try { await api("/esc/" + ESC.id, { method: "PATCH", body: JSON.stringify(campos) }); }
  catch (e) { toast("Error al guardar: " + e.message); }
}

// -------- selección de clusters / señales --------
function renderSelectorClusters() {
  const cont = $("#esc-clusters");
  const sel = new Set(ESC.cluster_ids);
  cont.innerHTML = ESC_CLUSTERS.filter(c => c.nombre !== "Sin clasificar").map(c => `
    <div class="esc-cl-row">
      <input type="checkbox" class="esc-cl" data-id="${c.id}" ${sel.has(c.id) ? "checked" : ""}>
      <span style="flex:1"><b>${esc(c.nombre)}</b> <span class="muted">${c.n_senales} señ.</span></span>
      <button class="btn-link esc-cl-expand" data-id="${c.id}">ver señales</button>
    </div>
    <div class="esc-cl-senales hidden" id="esc-cl-sen-${c.id}"></div>`).join("");
  $$(".esc-cl", cont).forEach(cb => cb.onchange = () => {
    const id = +cb.dataset.id;
    ESC.cluster_ids = cb.checked ? [...new Set([...ESC.cluster_ids, id])]
      : ESC.cluster_ids.filter(x => x !== id);
    guardar({ cluster_ids: ESC.cluster_ids });
    actualizarPlacement();
  });
  $$(".esc-cl-expand", cont).forEach(b => b.onclick = async () => {
    const box = $("#esc-cl-sen-" + b.dataset.id);
    box.classList.toggle("hidden");
    if (box.innerHTML) return;
    const ss = await api("/clusters/" + b.dataset.id + "/senales");
    const selS = new Set(ESC.senal_ids);
    box.innerHTML = ss.map(s => `<label><input type="checkbox" class="esc-sen" data-id="${s.id}"
      ${selS.has(s.id) ? "checked" : ""}> ${esc((s.titulo || "").slice(0, 70))}</label>`).join("");
    $$(".esc-sen", box).forEach(cb => cb.onchange = () => {
      const id = +cb.dataset.id;
      ESC.senal_ids = cb.checked ? [...new Set([...ESC.senal_ids, id])]
        : ESC.senal_ids.filter(x => x !== id);
      guardar({ senal_ids: ESC.senal_ids });
      actualizarPlacement();
    });
  });
}

// -------- placement (ubicar señales en cuadrantes) --------
async function actualizarPlacement() {
  if (!tieneEjes()) {
    $("#esc-placement-info").textContent = "Definí al menos una punta por eje para poblar los cuadrantes.";
    return;
  }
  if (!ESC.cluster_ids.length && !ESC.senal_ids.length) {
    $("#esc-placement-info").textContent = "Elegí al menos un cluster o señal.";
    return;
  }
  $("#esc-placement-info").textContent = "Calculando…";
  try {
    ESC_PLACEMENT = await api("/esc/placement", { method: "POST", body: JSON.stringify({
      eje_x_pos: ESC.eje_x_pos, eje_x_neg: ESC.eje_x_neg,
      eje_y_pos: ESC.eje_y_pos, eje_y_neg: ESC.eje_y_neg,
      cluster_ids: ESC.cluster_ids, senal_ids: ESC.senal_ids }) });
    $("#esc-placement-info").textContent =
      `${ESC_PLACEMENT.total} señales ubicadas en los 4 cuadrantes.`;
    pintarEvidencia();
  } catch (e) { $("#esc-placement-info").textContent = "Error: " + e.message; }
}

// -------- matriz 2×2 --------
function pintarMatriz() {
  $("#esc-ejes-leyenda").innerHTML =
    `Horizontal <b>${esc(ESC.eje_x_label || "X")}</b>: izq «${esc(ESC.eje_x_neg || "—")}» ↔ der «${esc(ESC.eje_x_pos || "—")}». ` +
    `Vertical <b>${esc(ESC.eje_y_label || "Y")}</b>: abajo «${esc(ESC.eje_y_neg || "—")}» ↔ arriba «${esc(ESC.eje_y_pos || "—")}».`;
  const orden = ["q2", "q1", "q3", "q4"];  // grilla fila-mayor
  $("#esc-matriz").innerHTML = orden.map(q => {
    const n = q[1];
    return `<div class="esc-quad">
      <span class="badge rss">Escenario ${q.toUpperCase()} · ${QUAD[q].etiqueta}</span>
      <input class="esc-quad-nombre" id="qn-${q}" value="${esc(ESC["q" + n + "_nombre"] || "")}" placeholder="Nombre del mundo…">
      <div class="esc-ev" id="ev-${q}"></div>
      <button class="btn-link" id="red-${q}">✎ Redactar borrador</button>
      <textarea id="qt-${q}" rows="4" placeholder="Narrativa del escenario…">${esc(ESC["q" + n + "_texto"] || "")}</textarea>
    </div>`;
  }).join("");
  orden.forEach(q => {
    const n = q[1];
    $("#qn-" + q).onchange = e => { ESC["q" + n + "_nombre"] = e.target.value; guardar({ ["q" + n + "_nombre"]: e.target.value }); };
    $("#qt-" + q).onchange = e => { ESC["q" + n + "_texto"] = e.target.value; guardar({ ["q" + n + "_texto"]: e.target.value }); };
    $("#red-" + q).onclick = () => {
      const txt = scaffold(q);
      $("#qt-" + q).value = txt; ESC["q" + n + "_texto"] = txt;
      guardar({ ["q" + n + "_texto"]: txt });
    };
  });
  pintarEvidencia();
}

function pintarEvidencia() {
  ["q1", "q2", "q3", "q4"].forEach(q => {
    const box = $("#ev-" + q); if (!box) return;
    const items = (ESC_PLACEMENT && ESC_PLACEMENT.cuadrantes[q]) || [];
    box.innerHTML = items.length
      ? `<b class="muted">${items.length} señales</b>` + items.slice(0, 12).map(s => senalLink(s, 60)).join("")
      : '<span class="muted">—</span>';
  });
}

function scaffold(q) {
  const d = QUAD[q];
  const xtxt = ESC["eje_x_" + d.x] || (d.x === "pos" ? "X+" : "X−");
  const ytxt = ESC["eje_y_" + d.y] || (d.y === "pos" ? "Y+" : "Y−");
  const ev = ((ESC_PLACEMENT && ESC_PLACEMENT.cuadrantes[q]) || []).slice(0, 5).map(s => "· " + s.titulo);
  return `Horizonte: ${ESC.horizonte} años (${HORIZ[ESC.horizonte] || ""}).\n` +
    `En este futuro, «${ESC.eje_x_label || "X"}» se inclina hacia "${xtxt}" y «${ESC.eje_y_label || "Y"}» hacia "${ytxt}".\n\n` +
    `Señales que lo anticipan:\n${ev.join("\n") || "(elegí clusters/señales y definí los ejes)"}\n\n` +
    `Narrativa: [¿cómo es el mundo en este cuadrante? actores, tensiones, qué haría el proyecto…]`;
}
