// ============================================================
// Tab Clusters
// ============================================================
let clustersPoll = null;

window.cargarClustersImpl = async function () {
  if (!STATE.caps.clustering) return;
  $("#clusters-placeholder").classList.add("hidden");
  const cont = $("#clusters-contenido");
  cont.classList.remove("hidden");
  cont.innerHTML = `
    <div class="vista-head"><h2>Clustering semántico</h2>
      <div class="actions">
        <label class="muted">umbral temática <input type="range" id="cl-umbral" min="0.30" max="0.75" step="0.01" value="0.45"> <span id="cl-umbral-v">0.45</span></label>
        <button class="btn primary" id="btn-clusterizar">Clusterizar señales</button>
        <button class="btn" id="btn-tend-clusters">Crear tendencias desde clusters</button>
      </div></div>
    <div class="progress" id="cl-progress-wrap" style="display:none"><div class="progress-bar" id="cl-progress"></div></div>
    <p class="muted" id="cl-mensaje"></p>
    <h3 style="margin-top:16px">Resumen de temáticas</h3>
    <div id="cl-resumen"></div>
    <h3 style="margin-top:20px">Vista espacial</h3>
    <div class="viz-card" id="cl-scatter"></div>
    <h3 style="margin-top:20px">Clusters</h3>
    <div id="cl-cards"></div>`;
  $("#cl-umbral").oninput = () => $("#cl-umbral-v").textContent = (+$("#cl-umbral").value).toFixed(2);
  $("#btn-clusterizar").onclick = clusterizar;
  $("#btn-tend-clusters").onclick = async () => {
    const r = await api("/tendencias/desde-clusters", { method: "POST" });
    toast(`${r.creadas} tendencias creadas`);
  };
  await pintarClusters();
};

async function clusterizar() {
  try {
    await api("/clusters/generar", { method: "POST",
      body: JSON.stringify({ umbral: +$("#cl-umbral").value }) });
  } catch (e) { toast("Error: " + e.message); return; }
  $("#cl-progress-wrap").style.display = "block";
  $("#btn-clusterizar").disabled = true;
  if (clustersPoll) clearInterval(clustersPoll);
  clustersPoll = setInterval(async () => {
    const e = await api("/clusters/estado");
    $("#cl-progress").style.width = (e.progreso || 0) + "%";
    $("#cl-mensaje").textContent = e.mensaje || "";
    if (!e.corriendo) {
      clearInterval(clustersPoll); clustersPoll = null;
      $("#btn-clusterizar").disabled = false;
      $("#cl-progress-wrap").style.display = "none";
      toast("Clustering completado"); pintarClusters();
    }
  }, 1200);
}

async function pintarClusters() {
  const [resumen, clusters, mapa] = await Promise.all([
    api("/clusters/resumen-tematicas"), api("/clusters"), api("/clusters/mapa")]);
  // resumen temáticas
  const conEvidencia = resumen.filter(r => r.asignadas > 0);
  $("#cl-resumen").innerHTML = conEvidencia.length ? `<table class="tabla-tematicas">
    <tr><th>Temática</th><th>Nivel</th><th>Señales</th><th>% del total</th></tr>
    ${conEvidencia.map(r => `<tr><td>${esc(r.nombre)}</td><td>${r.nivel}</td>
      <td>${r.asignadas}</td><td>${r.porcentaje}%</td></tr>`).join("")}</table>`
    : '<p class="muted">Sin clustering todavía. Hacé clic en "Clusterizar señales".</p>';
  // scatter
  pintarScatter(clusters, mapa);
  // cards
  pintarCards(clusters);
}

function pintarScatter(clusters, mapa) {
  const cont = $("#cl-scatter"); cont.innerHTML = "";
  if (!mapa.length) { cont.innerHTML = '<p class="muted">Sin coordenadas todavía.</p>'; return; }
  const W = 840, H = 540, pad = 40;
  const xs = mapa.map(p => p.x), ys = mapa.map(p => p.y);
  const sx = clScale(xs, pad, W - pad), sy = clScale(ys, H - pad, pad);
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
  const nombreCl = {}; clusters.forEach(c => nombreCl[c.id] = c.nombre);
  // puntos
  mapa.forEach(p => {
    const color = p.cluster_id == null ? "#9ca3af" : colorCluster(p.cluster_id);
    const c = clSvg(svg, "circle", { cx: sx(p.x), cy: sy(p.y), r: 4, fill: color,
      opacity: 0.82, stroke: "#fff", "stroke-width": 0.5, style: "cursor:pointer" });
    c.onclick = () => abrirPanel(`<h3>${esc(p.titulo || "")}</h3>
      <p class="muted">${esc(p.cuadrante_steep || "")} · ${esc(nombreCl[p.cluster_id] || "")} · score ${p.score_calidad ?? "—"}</p>
      ${p.url_directa ? `<p><a href="${esc(p.url_directa)}" target="_blank" rel="noopener">Ver fuente original ↗</a></p>` : ""}`);
  });
  // labels centroides
  const grp = {}; mapa.forEach(p => (grp[p.cluster_id] = grp[p.cluster_id] || []).push(p));
  for (const cid in grp) {
    const nom = nombreCl[+cid]; if (!nom || nom === "Sin clasificar") continue;
    const g = grp[cid];
    const cx = g.reduce((a, p) => a + sx(p.x), 0) / g.length;
    const cy = g.reduce((a, p) => a + sy(p.y), 0) / g.length;
    const w = Math.min(nom.length, 24) * 6.2;
    clSvg(svg, "rect", { x: cx - w / 2 - 3, y: cy - 11, width: w + 6, height: 15, fill: "#fff", opacity: 0.72, rx: 3 });
    const t = clSvg(svg, "text", { x: cx, y: cy, "text-anchor": "middle", "font-size": 11,
      "font-weight": 700, fill: colorCluster(+cid) }); t.textContent = nom.slice(0, 24);
  }
  cont.appendChild(svg);
}
function clScale(vals, a, b) { const mn = Math.min(...vals), mx = Math.max(...vals), r = (mx - mn) || 1; return v => a + (v - mn) / r * (b - a); }
function clSvg(p, tag, attrs) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); p.appendChild(e); return e; }

function pintarCards(clusters) {
  const tem = clusters.filter(c => !c.es_emergente);
  const eme = clusters.filter(c => c.es_emergente);
  const card = c => `<div class="cluster-card" data-id="${c.id}">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <input class="inline-edit cl-nombre" data-id="${c.id}" value="${esc(c.nombre)}" style="font-weight:700;flex:1">
      ${c.es_emergente ? '<span class="badge cal-media">emergente</span>' : '<span class="badge cal-alta">temática</span>'}
      ${c.validado ? '<span class="badge cal-alta">✓ validado</span>' : ""}
    </div>
    <label class="muted">driver candidato
      <input class="inline-edit cl-driver" data-id="${c.id}" value="${esc(c.driver_candidato || "")}"></label>
    <p class="muted">${c.n_senales} señales</p>
    <div style="display:flex;gap:6px;margin-top:6px">
      <button class="btn cl-ver" data-id="${c.id}">Ver señales</button>
      <button class="btn cl-validar" data-id="${c.id}">${c.validado ? "Quitar validación" : "Validar"}</button>
    </div>
    <div class="cl-senales" id="cl-sen-${c.id}"></div></div>`;
  $("#cl-cards").innerHTML = `
    <h4 class="muted">Temáticas conocidas (${tem.length})</h4>
    <div class="cluster-grid">${tem.map(card).join("") || '<p class="muted">—</p>'}</div>
    <h4 class="muted" style="margin-top:14px">Emergentes (${eme.length})
      <button class="btn-link" id="cl-nuevo">+ Crear cluster manual</button></h4>
    <div class="cluster-grid">${eme.map(card).join("")}</div>`;
  $("#cl-nuevo").onclick = async () => {
    const nombre = prompt("Nombre del cluster manual:"); if (!nombre) return;
    await api("/clusters", { method: "POST", body: JSON.stringify({ nombre }) });
    pintarClusters();
  };
  $$(".cl-nombre").forEach(el => el.onchange = () => api("/clusters/" + el.dataset.id,
    { method: "PATCH", body: JSON.stringify({ nombre: el.value }) }).then(() => toast("Guardado")));
  $$(".cl-driver").forEach(el => el.onchange = () => api("/clusters/" + el.dataset.id,
    { method: "PATCH", body: JSON.stringify({ driver_candidato: el.value }) }).then(() => toast("Guardado")));
  $$(".cl-validar").forEach(b => b.onclick = async () => {
    const c = clusters.find(x => x.id === +b.dataset.id);
    await api("/clusters/" + b.dataset.id, { method: "PATCH", body: JSON.stringify({ validado: c.validado ? 0 : 1 }) });
    pintarClusters();
  });
  $$(".cl-ver").forEach(b => b.onclick = async () => {
    const box = $("#cl-sen-" + b.dataset.id);
    if (box.innerHTML) { box.innerHTML = ""; return; }
    const ss = await api("/clusters/" + b.dataset.id + "/senales");
    box.innerHTML = ss.slice(0, 12).map(s => `<div style="border-top:1px solid #eee;padding:6px 0;font-size:12px">
      <b>${senalLink(s, 70)}</b>
      <div class="cita-block" style="font-size:11px">"${esc((s.cita_relevancia || "").slice(0, 200))}"</div>
      <select class="mover-sen" data-sen="${s.id}" style="font-size:11px">
        <option value="">mover a cluster…</option>
        ${clusters.map(c => `<option value="${c.id}">${esc(c.nombre.slice(0, 24))}</option>`).join("")}
      </select></div>`).join("");
    $$(".mover-sen", box).forEach(sel => sel.onchange = async () => {
      if (!sel.value) return;
      await api("/senales/" + sel.dataset.sen + "/cluster", { method: "PATCH",
        body: JSON.stringify({ cluster_id: +sel.value }) });
      toast("Señal movida"); pintarClusters();
    });
  });
}
