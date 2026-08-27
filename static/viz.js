// ============================================================
// Tab Visualizaciones — 14 vistas en SVG puro + helpers compartidos
// ============================================================
const SVGNS = "http://www.w3.org/2000/svg";
const PALETA = ["#1D7874","#E8743B","#19A979","#945ECF","#13A4B4","#BF399E",
  "#6F62C0","#FF6F61","#C7C732","#5C8AE6","#D45B90","#3B9C6E","#E0843B",
  "#8E6FCF","#46A6C7","#C45D5D","#7BAE3C","#B05CC7","#D9A33B","#5BA8A0"];
const STEEP_COLORS = { "Social":"#E8743B","Tecnológico":"#1D7874","Económico":"#945ECF",
  "Ecológico":"#19A979","Político":"#5C8AE6" };
const STEEP_LIST = ["Social","Tecnológico","Económico","Ecológico","Político"];

let VIZ = null;        // datos cacheados de /visualizaciones/datos
let vizSubtab = 1;

function colorCluster(id) {
  if (id == null) return "#9ca3af";
  return PALETA[Math.abs(id) % PALETA.length];
}
function svgEl(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function svgText(parent, x, y, txt, attrs = {}) {
  const t = svgEl("text", { x, y, "font-size": 11, fill: "#1A1A1A", ...attrs }, parent);
  t.textContent = txt; return t;
}
function nuevoSVG(w, h) {
  const s = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h,
    style: "background:#fff" });
  return s;
}
function exportarPNG(svg, nombre) {
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  img.onload = () => {
    const c = document.createElement("canvas");
    const vb = svg.getAttribute("viewBox").split(" ");
    c.width = +vb[2] * 2; c.height = +vb[3] * 2;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
    const a = document.createElement("a");
    a.download = nombre + ".png"; a.href = c.toDataURL("image/png"); a.click();
  };
  img.src = "data:image/svg+xml;base64," + svg64;
}
function panelSenalHTML(s) {
  return `<div class="side-content"><h3>${esc(s.titulo || "(sin título)")}</h3>
    <p class="muted">${esc(s.cuadrante_steep || "")} · score ${s.score_calidad ?? "—"}</p>
    <div class="cita-block">"${esc((s.cita_relevancia || "").slice(0, 600))}"</div>
    ${s.url_directa ? `<p><a href="${esc(s.url_directa)}" target="_blank">Ver fuente original ↗</a></p>` : ""}</div>`;
}
// Título de una señal como link a su URL de origen (para los paneles que listan
// las señales de un cluster). Si no hay URL, devuelve el título sin enlace.
function senalLink(s, max = 90) {
  const t = esc((s.titulo || "(sin título)").slice(0, max));
  return s.url_directa
    ? `<a href="${esc(s.url_directa)}" target="_blank" rel="noopener">${t}</a>`
    : t;
}
// Fila de señal en el panel lateral: título + acciones (Descartar/Admitir, Eliminar).
//   Descartar  → es_relevante=0 (reversible: la saca del gráfico para tantear).
//   Admitir    → es_relevante=1 (vuelve a entrar).
//   Eliminar   → DELETE (no es una señal, se borra para siempre).
function senalRowHTML(s) {
  const off = s.es_relevante === 0;
  return `<div class="psenal" data-sid="${s.id}" data-off="${off ? 1 : ""}"
      style="border-bottom:1px solid #eee;padding:8px 0;display:flex;gap:8px;align-items:flex-start;justify-content:space-between${off ? ";opacity:.45" : ""}">
    <div class="psenal-t" style="font-size:12px;min-width:0;flex:1${off ? ";text-decoration:line-through" : ""}">
      ${senalLink(s, 100)}${s.cuadrante_steep ? `<span class="muted"> · ${esc(s.cuadrante_steep)}</span>` : ""}
    </div>
    <div style="display:flex;gap:5px;flex:none">
      <button class="psenal-btn" data-act="toggle" title="${off ? "Admitir de nuevo" : "Descartar: ocultar del gráfico (reversible)"}"
        style="border:1px solid #e5e7eb;background:#fff;border-radius:5px;padding:2px 7px;font-size:11px;cursor:pointer;white-space:nowrap;color:#374151">${off ? "↩ Admitir" : "Descartar"}</button>
      <button class="psenal-btn" data-act="remove" title="Eliminar: no es una señal, borrar definitivamente"
        style="border:1px solid #f3c7c7;background:#fff;border-radius:5px;padding:2px 7px;font-size:11px;cursor:pointer;white-space:nowrap;color:#dc2626">Eliminar</button>
    </div>
  </div>`;
}
// Delegación en el panel: maneja Descartar/Admitir/Eliminar y refresca el gráfico.
function wireSenalPanel() {
  const host = document.getElementById("side-content");
  if (!host || host.dataset.senalWired) return;
  host.dataset.senalWired = "1";
  host.addEventListener("click", async (e) => {
    const btn = e.target.closest(".psenal-btn"); if (!btn) return;
    const row = btn.closest(".psenal"); if (!row) return;
    const sid = +row.dataset.sid, act = btn.dataset.act;
    try {
      if (act === "remove") {
        if (!confirm("¿Eliminar esta señal? No es una señal y se borra definitivamente. No se puede deshacer.")) return;
        await api("/senales/" + sid, { method: "DELETE" });
        row.remove();
        if (typeof toast === "function") toast("Señal eliminada");
      } else if (act === "toggle") {
        const off = row.dataset.off === "1", nuevo = off ? 1 : 0;
        await api("/senales/" + sid, { method: "PATCH", body: JSON.stringify({ es_relevante: nuevo }) });
        row.dataset.off = nuevo === 0 ? "1" : "";
        row.style.opacity = nuevo === 0 ? ".45" : "";
        row.querySelector(".psenal-t").style.textDecoration = nuevo === 0 ? "line-through" : "";
        btn.textContent = nuevo === 0 ? "↩ Admitir" : "Descartar";
        btn.title = nuevo === 0 ? "Admitir de nuevo" : "Descartar: ocultar del gráfico (reversible)";
        const s = (VIZ.senales || []).find(x => x.id === sid); if (s) s.es_relevante = nuevo;
        if (typeof toast === "function") toast(nuevo === 0 ? "Señal descartada" : "Señal admitida");
      }
      VIZ = await api("/visualizaciones/datos");   // el gráfico refleja el cambio en vivo
      renderViz();
    } catch (err) { if (typeof toast === "function") toast("Error: " + err.message); }
  });
}
wireSenalPanel();

// Panel lateral de un cluster: encabezado + lista de TODAS sus señales con acciones.
function panelClusterHTML(nombre, senales, meta) {
  const ss = senales || [];
  return `<h3>${esc(nombre)}</h3>
    <p class="muted">${esc(meta || (ss.length + " señales"))}</p>
    ${ss.length ? ss.map(senalRowHTML).join("")
      : '<p class="muted">Este cluster no tiene señales.</p>'}`;
}
// Devuelve las señales de un cluster por su id.
function senalesDeCluster(cid) {
  return VIZ.senales.filter(s => s.cluster_id === cid);
}

// ---------- estructura de subtabs ----------
const VIZ_DEFS = [
  [1, "1 · Balance STEEP"], [2, "2 · Sankey"], [3, "3 · Señal débil vs fuerte"],
  [4, "4 · Procedencia"], [5, "5 · Tres Horizontes"], [6, "6 · Curvas-S"],
  [7, "7 · Impacto × Incertid."], [8, "8 · Impacto cruzado"], [9, "9 · Mapa semántico"],
  [10, "10 · Matriz 2×2"], [11, "11 · Iceberg CLA"], [12, "12 · Borde · robustez"],
];

window.cargarVizImpl = async function () {
  if (!STATE.caps.clustering) return;
  $("#vista-visualizaciones .placeholder").classList.add("hidden");
  const cont = $("#viz-contenido");
  cont.classList.remove("hidden");
  VIZ = await api("/visualizaciones/datos");
  cont.innerHTML = `<div class="viz-subtabs">${VIZ_DEFS.map(([n, l]) =>
    `<button class="viz-subtab${n === vizSubtab ? " active" : ""}" data-n="${n}">${l}</button>`).join("")}</div>
    <div class="viz-card"><div class="viz-head"><h3 id="viz-titulo"></h3>
      <button class="btn" id="viz-png">Exportar PNG</button></div>
      <div id="viz-render"></div></div>`;
  $$(".viz-subtab", cont).forEach(b => b.onclick = () => {
    vizSubtab = +b.dataset.n;
    $$(".viz-subtab").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); renderViz();
  });
  renderViz();
};

function renderViz() {
  const cont = $("#viz-render"); cont.innerHTML = "";
  const fn = VIZ_RENDER[vizSubtab];
  $("#viz-titulo").textContent = VIZ_DEFS.find(d => d[0] === vizSubtab)[1];
  let svg;
  try { svg = fn ? fn(cont) : null; }
  catch (e) { cont.innerHTML = `<p class="muted">Error al renderizar: ${esc(e.message)}</p>`; }
  $("#viz-png").onclick = () => {
    const s = cont.querySelector("svg");
    if (s) exportarPNG(s, "vista_" + vizSubtab);
  };
}

// =====================================================================
// Helpers de escala
// =====================================================================
function escala(vals, a, b) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const r = max - min || 1;
  return v => a + (v - min) / r * (b - a);
}

// =====================================================================
// VISTA 1 / 10 — MAPA SEMÁNTICO (scatter de coords UMAP)
// =====================================================================
function mapaSemantico(cont, { colorPorScore = false } = {}) {
  const W = 860, H = 560, pad = 40;
  const pts = VIZ.senales.map(s => {
    const c = VIZ.senales_coords.find(c => c.senal_id === s.id);
    return c ? { ...s, x: c.x, y: c.y } : null;
  }).filter(Boolean);
  if (!pts.length) { cont.innerHTML = '<p class="muted">Clusterizá primero (tab Clusters).</p>'; return; }
  const sx = escala(pts.map(p => p.x), pad, W - pad);
  const sy = escala(pts.map(p => p.y), H - pad, pad);
  const svg = nuevoSVG(W, H);
  // zonas de densidad: círculo difuso por cluster
  const porCluster = {};
  pts.forEach(p => (porCluster[p.cluster_id] = porCluster[p.cluster_id] || []).push(p));
  for (const cid in porCluster) {
    const g = porCluster[cid];
    const cx = g.reduce((a, p) => a + sx(p.x), 0) / g.length;
    const cy = g.reduce((a, p) => a + sy(p.y), 0) / g.length;
    const r = (18 + Math.sqrt(g.length) * 9) * 1.1;   // clusters 10% más grandes
    const halo = svgEl("circle", { cx, cy, r, fill: colorCluster(+cid), opacity: 0.07,
      style: "cursor:pointer" }, svg);
    halo.onclick = () => abrirPanel(panelClusterHTML(clusterNombre(+cid), senalesDeCluster(+cid)));
  }
  // puntos
  pts.forEach(p => {
    let color = colorCluster(p.cluster_id);
    if (colorPorScore && p.score_calidad != null)
      color = p.score_calidad >= 70 ? "#16a34a" : p.score_calidad >= 40 ? "#d97706" : "#dc2626";
    const c = svgEl("circle", { cx: sx(p.x), cy: sy(p.y), r: 4,
      fill: color, opacity: 0.82, stroke: "#fff", "stroke-width": 0.5,
      style: "cursor:pointer" }, svg);
    c.addEventListener("mouseenter", () => mostrarTooltip(svg, sx(p.x), sy(p.y),
      p.titulo, clusterNombre(p.cluster_id)));
    c.addEventListener("mouseleave", () => quitarTooltip(svg));
    c.addEventListener("click", () => abrirPanel(panelSenalHTML(p)));
  });
  // labels en centroides
  for (const cid in porCluster) {
    const cl = VIZ.clusters.find(c => c.id === +cid);
    if (!cl || cl.nombre === "Sin clasificar") continue;
    const g = porCluster[cid];
    const cx = g.reduce((a, p) => a + sx(p.x), 0) / g.length;
    const cy = g.reduce((a, p) => a + sy(p.y), 0) / g.length;
    const t = svgText(svg, cx, cy, cl.nombre.slice(0, 26),
      { "text-anchor": "middle", "font-weight": 700, "font-size": 11,
        fill: colorCluster(+cid), style: "cursor:pointer" });
    const bb = { w: cl.nombre.slice(0, 26).length * 6.2, h: 14 };
    const rect = svgEl("rect", { x: cx - bb.w / 2 - 3, y: cy - 11, width: bb.w + 6,
      height: bb.h, fill: "#fff", opacity: 0.72, rx: 3, style: "cursor:pointer" }, svg);
    svg.insertBefore(rect, t);
    const verCluster = () => abrirPanel(panelClusterHTML(cl.nombre, senalesDeCluster(cl.id)));
    t.onclick = verCluster; rect.onclick = verCluster;
  }
  cont.appendChild(svg);
  cont.appendChild(leyendaClusters());
  return svg;
}
function clusterNombre(id) {
  const c = VIZ.clusters.find(c => c.id === id);
  return c ? c.nombre : "—";
}
function mostrarTooltip(svg, x, y, titulo, sub) {
  quitarTooltip(svg);
  const g = svgEl("g", { id: "viz-tt" }, svg);
  const txt = (titulo || "").slice(0, 50);
  const w = Math.max(txt.length, (sub || "").length) * 6 + 14;
  svgEl("rect", { x: Math.min(x + 8, 700), y: y - 28, width: w, height: 34,
    fill: "#1A1A1A", opacity: 0.92, rx: 4 }, g);
  svgText(g, Math.min(x + 8, 700) + 7, y - 14, txt, { fill: "#fff", "font-size": 10 });
  svgText(g, Math.min(x + 8, 700) + 7, y - 2, (sub || "").slice(0, 40),
    { fill: "#9fe5df", "font-size": 9 });
}
function quitarTooltip(svg) { const t = svg.querySelector("#viz-tt"); if (t) t.remove(); }
function leyendaClusters() {
  const d = document.createElement("div"); d.className = "leyenda";
  VIZ.clusters.filter(c => c.nombre !== "Sin clasificar").forEach(c =>
    d.innerHTML += `<span><i style="background:${colorCluster(c.id)}"></i>${esc(c.nombre.slice(0, 22))}</span>`);
  return d;
}

// =====================================================================
// VISTA 2 / 13 — BALANCE STEEP (radar + heatmap)
// =====================================================================
function balanceSTEEP(cont, soloHeatmap = false) {
  const wrap = document.createElement("div");
  const conteo = {}; STEEP_LIST.forEach(q => conteo[q] = 0);
  VIZ.senales.forEach(s => { if (conteo[s.cuadrante_steep] != null) conteo[s.cuadrante_steep]++; });

  if (!soloHeatmap) {
    // RADAR
    const W = 420, H = 380, cx = W / 2, cy = H / 2, R = 130;
    const svg = nuevoSVG(W, H);
    const maxV = Math.max(...Object.values(conteo), 1);
    const n = STEEP_LIST.length;
    const pico = (i, r) => [cx + r * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / n),
      cy + r * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / n)];
    [0.25, 0.5, 0.75, 1].forEach(f => {
      let pts = STEEP_LIST.map((_, i) => pico(i, R * f).join(",")).join(" ");
      svgEl("polygon", { points: pts, fill: "none", stroke: "#e5e7eb" }, svg);
    });
    let area = STEEP_LIST.map((q, i) => pico(i, R * conteo[q] / maxV).join(",")).join(" ");
    svgEl("polygon", { points: area, fill: "#1D7874", opacity: 0.28,
      stroke: "#1D7874", "stroke-width": 2 }, svg);
    STEEP_LIST.forEach((q, i) => {
      const [x, y] = pico(i, R + 22);
      svgText(svg, x, y, q, { "text-anchor": "middle", "font-size": 11, "font-weight": 600 });
      const [px, py] = pico(i, R + 10);
      svgText(svg, px, py + 12, String(conteo[q]), { "text-anchor": "middle",
        "font-size": 10, fill: STEEP_COLORS[q] });
    });
    wrap.appendChild(svg);
  }

  // HEATMAP STEEP × nivel
  const niveles = ["nucleo", "adyacente", "periferico"];
  const tematicaNivel = {}; VIZ.tematicas.forEach(t => tematicaNivel[t.id] = t.nivel);
  const grid = {};
  STEEP_LIST.forEach(q => niveles.forEach(nv => grid[q + "|" + nv] = 0));
  // mapear señal → nivel via cluster.tematica → nivel (aprox: usar cuadrante + nivel de su temática)
  VIZ.senales.forEach(s => {
    const cl = VIZ.clusters.find(c => c.id === s.cluster_id);
    const nv = cl && cl.tematica_id ? tematicaNivel[cl.tematica_id] : "periferico";
    const key = s.cuadrante_steep + "|" + (nv || "periferico");
    if (grid[key] != null) grid[key]++;
  });
  const cw = 130, ch = 46, x0 = 110, y0 = 40;
  const Wh = x0 + niveles.length * cw + 20, Hh = y0 + STEEP_LIST.length * ch + 20;
  const svg2 = nuevoSVG(Wh, Hh);
  const maxC = Math.max(...Object.values(grid), 1);
  niveles.forEach((nv, j) => svgText(svg2, x0 + j * cw + cw / 2, y0 - 10, nv,
    { "text-anchor": "middle", "font-weight": 600, "font-size": 11 }));
  STEEP_LIST.forEach((q, i) => {
    svgText(svg2, x0 - 8, y0 + i * ch + ch / 2 + 4, q, { "text-anchor": "end", "font-size": 11 });
    niveles.forEach((nv, j) => {
      const v = grid[q + "|" + nv];
      const r = svgEl("rect", { x: x0 + j * cw, y: y0 + i * ch, width: cw - 4,
        height: ch - 4, rx: 4, fill: "#1D7874", opacity: 0.12 + 0.8 * v / maxC,
        style: "cursor:pointer" }, svg2);
      r.onclick = () => abrirPanelCelda(q, nv);
      svgText(svg2, x0 + j * cw + (cw - 4) / 2, y0 + i * ch + ch / 2 + 4, String(v),
        { "text-anchor": "middle", fill: v / maxC > 0.5 ? "#fff" : "#1A1A1A", "font-weight": 600 });
    });
  });
  wrap.appendChild(svg2);
  cont.appendChild(wrap);
  return soloHeatmap ? svg2 : wrap.querySelector("svg");
}
function abrirPanelCelda(q, nv) {
  const ss = VIZ.senales.filter(s => s.cuadrante_steep === q).slice(0, 30);
  abrirPanel(`<h3>${q} — ${nv}</h3>
    <p class="muted">${ss.length} señales</p>` + ss.map(senalRowHTML).join(""));
}

// =====================================================================
// VISTA 3 — SANKEY (nivel → STEEP → cluster → tendencia)
// =====================================================================
function sankey(cont) {
  const W = 880, H = 560;
  const svg = nuevoSVG(W, H);
  const cols = [
    ["Nivel", ["nucleo", "adyacente", "periferico"]],
    ["STEEP", STEEP_LIST],
    ["Cluster", VIZ.clusters.filter(c => c.nombre !== "Sin clasificar").map(c => c.nombre).slice(0, 10)],
  ];
  const colX = [60, 320, 580, 820];

  // flujos nivel→steep y steep→cluster, contados por nº de señales
  const tematicaNivel = {}; VIZ.tematicas.forEach(t => tematicaNivel[t.id] = t.nivel);
  const flujoNS = {}, flujoSC = {};
  VIZ.senales.forEach(s => {
    const cl = VIZ.clusters.find(c => c.id === s.cluster_id);
    const nv = cl && cl.tematica_id ? tematicaNivel[cl.tematica_id] : "periferico";
    flujoNS[nv + "|" + s.cuadrante_steep] = (flujoNS[nv + "|" + s.cuadrante_steep] || 0) + 1;
    if (cl && cl.nombre !== "Sin clasificar")
      flujoSC[s.cuadrante_steep + "|" + cl.nombre] = (flujoSC[s.cuadrante_steep + "|" + cl.nombre] || 0) + 1;
  });

  // total de señales que pasan por cada nodo (para etiquetarlo)
  const nodeTot = [{}, {}, {}];
  for (const k in flujoNS) { const [nv, q] = k.split("|"); nodeTot[0][nv] = (nodeTot[0][nv] || 0) + flujoNS[k]; nodeTot[1][q] = (nodeTot[1][q] || 0) + flujoNS[k]; }
  for (const k in flujoSC) { const [q, cn] = k.split("|"); nodeTot[2][cn] = (nodeTot[2][cn] || 0) + flujoSC[k]; }
  const maxF = Math.max(...Object.values(flujoNS), ...Object.values(flujoSC), 1);

  // posición y dibujo de nodos (con su total de señales)
  const nodePos = {};
  cols.forEach(([titulo, items], ci) => {
    svgText(svg, colX[ci], 24, titulo, { "font-weight": 700, "font-size": 12 });
    const h = (H - 60) / items.length;
    items.forEach((it, i) => {
      const y = 50 + i * h + h / 2;
      nodePos[ci + "|" + it] = { x: colX[ci], y };
      const tot = nodeTot[ci][it] || 0;
      svgEl("rect", { x: colX[ci], y: y - 12, width: 12, height: 24,
        fill: ci === 1 ? STEEP_COLORS[it] : "#1D7874", rx: 2 }, svg);
      svgText(svg, colX[ci] + 18, y + 4, `${(it || "").slice(0, 20)} (${tot})`, { "font-size": 10 });
    });
  });

  // conectores: grosor proporcional al nº de señales del flujo (más señales → más grueso)
  const flujo = (a, b, count, label) => {
    if (!a || !b) return;
    const sw = 2 + 22 * (count / maxF);
    const p = svgEl("path", { d: `M${a.x + 12},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`,
      fill: "none", stroke: "#1D7874", "stroke-width": sw.toFixed(1), opacity: 0.22,
      "stroke-linecap": "round", style: "cursor:pointer" }, svg);
    const t = svgEl("title", {}, p);
    t.textContent = `${label}: ${count} ${count === 1 ? "señal" : "señales"}`;
    p.onmouseenter = () => p.setAttribute("opacity", 0.65);
    p.onmouseleave = () => p.setAttribute("opacity", 0.22);
  };
  for (const k in flujoNS) { const [nv, q] = k.split("|"); flujo(nodePos["0|" + nv], nodePos["1|" + q], flujoNS[k], `${nv} → ${q}`); }
  for (const k in flujoSC) { const [q, cn] = k.split("|"); flujo(nodePos["1|" + q], nodePos["2|" + cn], flujoSC[k], `${q} → ${cn}`); }
  cont.appendChild(svg); return svg;
}

// =====================================================================
// VISTA 4 / 14 — SEÑAL DÉBIL vs FUERTE (Novedad × Volumen)
// =====================================================================
function senalDebil(cont, colorPorScore = false) {
  const W = 820, H = 560, pad = 70;
  const svg = nuevoSVG(W, H);
  const clusters = VIZ.clusters.filter(c => c.nombre !== "Sin clasificar");
  // volumen = n_senales; novedad = % señales recientes (fecha 2025-2026) + tamaño inverso
  const datos = clusters.map(c => {
    const ss = VIZ.senales.filter(s => s.cluster_id === c.id);
    const recientes = ss.filter(s => /202[4-6]/.test(s.fecha_origen || "")).length;
    const novedad = ss.length ? recientes / ss.length : 0;
    const score = ss.reduce((a, s) => a + (s.score_calidad || 0), 0) / (ss.length || 1);
    return { c, vol: c.n_senales, novedad, score, ss };
  });
  const sx = escala([0, ...datos.map(d => d.vol)], pad, W - pad);
  const sy = escala([0, 1], H - pad, pad);
  // ejes + cuadrantes
  svgEl("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#999" }, svg);
  svgEl("line", { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: "#999" }, svg);
  svgText(svg, W / 2, H - 24, "Volumen de señales →", { "text-anchor": "middle", "font-size": 11 });
  svgText(svg, 20, H / 2, "Novedad →", { "font-size": 11, transform: `rotate(-90 20 ${H / 2})` });
  svgText(svg, pad + 10, pad + 14, "★ señales débiles valiosas", { "font-size": 10, fill: "#16a34a" });
  svgText(svg, W - pad - 10, H - pad - 8, "hype", { "font-size": 10, fill: "#dc2626", "text-anchor": "end" });
  datos.forEach(d => {
    const r = (8 + Math.sqrt(d.vol) * 3) * 1.1;   // clusters 10% más grandes
    let color = colorPorScore ? (d.score >= 70 ? "#16a34a" : d.score >= 40 ? "#d97706" : "#dc2626") : colorCluster(d.c.id);
    const circ = svgEl("circle", { cx: sx(d.vol), cy: sy(d.novedad), r, fill: color,
      opacity: 0.55, stroke: color, "stroke-width": 1.5, style: "cursor:pointer" }, svg);
    circ.onclick = () => abrirPanel(panelClusterHTML(d.c.nombre, d.ss,
      `${d.vol} señales · novedad ${(d.novedad * 100).toFixed(0)}% · score ${d.score.toFixed(0)}`));
    svgText(svg, sx(d.vol), sy(d.novedad) - r - 3, d.c.nombre.slice(0, 18),
      { "text-anchor": "middle", "font-size": 9, "font-weight": 600 });
  });
  cont.appendChild(svg); return svg;
}

// =====================================================================
// VISTA 5 — PROCEDENCIA DE FUENTES (tabla SVG fuente × STEEP)
// =====================================================================
function procedencia(cont) {
  const fuenteName = {}; VIZ.fuentes.forEach(f => fuenteName[f.id] = f.nombre);
  const grid = {}, totales = {};
  VIZ.senales.forEach(s => {
    const k = s.fuente_id + "|" + s.cuadrante_steep;
    grid[k] = (grid[k] || 0) + 1;
    totales[s.fuente_id] = (totales[s.fuente_id] || 0) + 1;
  });
  const fuentes = Object.keys(totales).map(Number).sort((a, b) => totales[b] - totales[a]).slice(0, 20);
  const x0 = 230, y0 = 50, cw = 95, ch = 24;
  const W = x0 + STEEP_LIST.length * cw + 40, H = y0 + fuentes.length * ch + 20;
  const svg = nuevoSVG(W, H);
  STEEP_LIST.forEach((q, j) => svgText(svg, x0 + j * cw + cw / 2, y0 - 12, q,
    { "text-anchor": "middle", "font-size": 10, "font-weight": 600, fill: STEEP_COLORS[q] }));
  const maxC = Math.max(...Object.values(grid), 1);
  fuentes.forEach((fid, i) => {
    svgText(svg, x0 - 8, y0 + i * ch + ch / 2 + 3, (fuenteName[fid] || ("#" + fid)).slice(0, 32),
      { "text-anchor": "end", "font-size": 10 });
    STEEP_LIST.forEach((q, j) => {
      const v = grid[fid + "|" + q] || 0;
      const r = svgEl("rect", { x: x0 + j * cw, y: y0 + i * ch, width: cw - 3, height: ch - 3,
        rx: 3, fill: "#1D7874", opacity: v ? 0.15 + 0.8 * v / maxC : 0.04, style: "cursor:pointer" }, svg);
      r.onclick = () => abrirPanelCelda(q, fuenteName[fid] || "");
      if (v) svgText(svg, x0 + j * cw + (cw - 3) / 2, y0 + i * ch + ch / 2 + 3, String(v),
        { "text-anchor": "middle", "font-size": 10, fill: v / maxC > 0.5 ? "#fff" : "#1A1A1A" });
    });
  });
  cont.appendChild(svg); return svg;
}

// =====================================================================
// VISTA 6 — TRES HORIZONTES
// =====================================================================
function tresHorizontes(cont) {
  const items = VIZ.tendencias.length ? VIZ.tendencias :
    VIZ.clusters.filter(c => c.nombre !== "Sin clasificar").map(c => ({ nombre: c.nombre,
      horizonte: c.es_emergente ? "H3" : "H2", estado: c.es_emergente ? "emergente" : "consolidada",
      cuadrante_steep: null, fuerza: c.n_senales, descripcion: c.descripcion, cluster_id: c.id }));
  if (!items.length) { cont.innerHTML = '<p class="muted">Creá tendencias o clusters primero.</p>'; return; }

  const W = 900, H = 540, L = 64, R = 40, T = 36, B = 80;
  const plotW = W - L - R, plotH = H - T - B;
  const sx = x => L + x * plotW;             // x normalizado 0..1 → tiempo
  const sy = y => T + (1 - y) * plotH;       // y normalizado 0..1 → vigencia
  const svg = nuevoSVG(W, H);

  // bandas temporales de fondo
  const tramos = [[0, 0.33, "Corto · 1-3 años"], [0.33, 0.66, "Mediano · 3-10 años"],
    [0.66, 1, "Largo · 10+ años"]];
  tramos.forEach(([a, b, lbl], i) => {
    if (i % 2) svgEl("rect", { x: sx(a), y: T, width: sx(b) - sx(a), height: plotH,
      fill: "#1D7874", opacity: 0.03 }, svg);
    svgText(svg, sx((a + b) / 2), H - B + 36, lbl, { "text-anchor": "middle",
      "font-size": 10, fill: "#6b7280" });
  });
  // ejes
  svgEl("line", { x1: L, y1: T, x2: L, y2: T + plotH, stroke: "#ccc" }, svg);
  svgEl("line", { x1: L, y1: T + plotH, x2: L + plotW, y2: T + plotH, stroke: "#ccc" }, svg);
  svgText(svg, L + plotW / 2, H - 14, "Tiempo →", { "text-anchor": "middle",
    "font-size": 11, "font-weight": 600 });
  svgText(svg, 18, T + plotH / 2, "Vigencia en el sistema →", { "font-size": 11,
    "font-weight": 600, transform: `rotate(-90 18 ${T + plotH / 2})` });

  // tres curvas-S características del marco Three Horizons
  const logistic = (x, x0, k) => 1 / (1 + Math.exp(-k * (x - x0)));
  const curvas = [
    { id: "H1", col: "#E8743B", label: "H1 · lo establecido (declina)",
      f: x => 0.93 * (1 - logistic(x, 0.45, 9)) + 0.04, rango: [0.06, 0.40], pico: 0.10 },
    { id: "H2", col: "#D9A33B", label: "H2 · transición / disrupción",
      f: x => 0.90 * Math.exp(-Math.pow((x - 0.5) / 0.22, 2) / 2) + 0.03, rango: [0.34, 0.70], pico: 0.50 },
    { id: "H3", col: "#19A979", label: "H3 · futuro emergente (crece)",
      f: x => 0.93 * logistic(x, 0.62, 8) + 0.04, rango: [0.60, 0.93], pico: 0.92 },
  ];
  const N = 80;
  curvas.forEach(cv => {
    const pts = [];
    for (let i = 0; i <= N; i++) { const x = i / N; pts.push([sx(x), sy(cv.f(x))]); }
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    svgEl("path", { d: d + ` L${sx(1)},${sy(0)} L${sx(0)},${sy(0)} Z`, fill: cv.col, opacity: 0.06 }, svg);
    svgEl("path", { d, fill: "none", stroke: cv.col, "stroke-width": 2.5, opacity: 0.92 }, svg);
    svgText(svg, sx(cv.pico), sy(cv.f(cv.pico)) - 10, cv.id, { "text-anchor": "middle",
      "font-size": 14, "font-weight": 800, fill: cv.col });
  });

  // ubicar cada tendencia/cluster sobre la curva de su horizonte
  const bandaDe = t => t.estado === "en declive" || t.horizonte === "H1" ? 0 :
    (t.horizonte === "H3" || t.estado === "emergente") ? 2 : 1;
  const porBanda = [[], [], []];
  items.forEach(t => porBanda[bandaDe(t)].push(t));
  const MAX_LBL = 7;
  porBanda.forEach((arr, b) => {
    arr.sort((u, v) => (v.fuerza || 0) - (u.fuerza || 0));
    const cv = curvas[b];
    arr.forEach((t, i) => {
      const frac = arr.length > 1 ? i / (arr.length - 1) : 0.5;
      const x = cv.rango[0] + frac * (cv.rango[1] - cv.rango[0]);
      const px = sx(x), py = sy(cv.f(x));
      const col = STEEP_COLORS[t.cuadrante_steep] || cv.col;
      const dot = svgEl("circle", { cx: px, cy: py, r: 5, fill: col, stroke: "#fff",
        "stroke-width": 1.2, opacity: 0.95, style: "cursor:pointer" }, svg);
      dot.addEventListener("mouseenter", () => mostrarTooltip(svg, px, py, t.nombre,
        (t.estado || "") + " · " + (t.horizonte || cv.id)));
      dot.addEventListener("mouseleave", () => quitarTooltip(svg));
      dot.onclick = () => {
        const ss = t.cluster_id ? senalesDeCluster(t.cluster_id) : [];
        const meta = `${t.estado || ""} · ${t.horizonte || cv.id} · fuerza ${t.fuerza ?? "—"}`;
        if (ss.length) abrirPanel(panelClusterHTML(t.nombre, ss, meta));
        else abrirPanel(`<h3>${esc(t.nombre)}</h3><p class="muted">${esc(meta)}</p>
          <p>${esc(t.descripcion || t.driver || "Esta tendencia no tiene señales vinculadas a un cluster.")}</p>`);
      };
      if (i < MAX_LBL) {
        const up = i % 2 === 0, ly = py + (up ? -13 : 19);
        svgEl("line", { x1: px, y1: py, x2: px, y2: ly + (up ? 4 : -6), stroke: col, opacity: 0.35 }, svg);
        svgText(svg, px, ly, (t.nombre || "").slice(0, 15), { "text-anchor": "middle",
          "font-size": 9, fill: "#374151" });
      }
    });
    if (arr.length > MAX_LBL)
      svgText(svg, sx((cv.rango[0] + cv.rango[1]) / 2), T + plotH - 6,
        `+${arr.length - MAX_LBL} más (hover)`, { "text-anchor": "middle", "font-size": 9, fill: "#9ca3af" });
  });

  cont.appendChild(svg);
  // leyenda
  const leg = document.createElement("div"); leg.className = "leyenda";
  curvas.forEach(cv => leg.innerHTML += `<span><i style="background:${cv.col}"></i>${cv.label}</span>`);
  cont.appendChild(leg);
  // explicación de cómo leer el gráfico
  const exp = document.createElement("p");
  exp.className = "muted"; exp.style.cssText = "margin-top:10px;line-height:1.5";
  exp.innerHTML = `<b>Cómo leer este gráfico.</b> El eje X es el <b>tiempo</b> (de hoy
    al largo plazo) y el eje Y es la <b>vigencia</b> de cada sistema (cuán dominante es).
    Las tres curvas se cruzan: <span style="color:#E8743B"><b>H1</b></span> es lo
    establecido hoy y declina; <span style="color:#D9A33B"><b>H2</b></span> es la zona de
    transición que sube y luego cede; <span style="color:#19A979"><b>H3</b></span> es el
    futuro emergente que arranca casi en cero y crece.
    Cada punto es una <b>tendencia</b> (o cluster) ubicada sobre la curva de su horizonte
    —asignado por su <i>estado</i>/<i>horizonte</i>—, ordenada de mayor a menor
    <b>fuerza</b> de izquierda a derecha; el <b>color</b> es su cuadrante STEEP.
    Pasá el mouse para ver el nombre y hacé click para el detalle.
    <b>Dónde mirar:</b> las apuestas de futuro viven en <b>H2-H3</b> (lo que nace),
    no en H1 (lo que se está apagando).`;
  cont.appendChild(exp);
  return svg;
}

// =====================================================================
// VISTA 7 — CURVAS DE EMERGENCIA (S-curves)
// =====================================================================
function sCurves(cont) {
  const W = 860, H = 500, pad = 50;
  const clusters = VIZ.clusters.filter(c => c.nombre !== "Sin clasificar").slice(0, 10);
  // acumulado por mes
  const series = clusters.map(c => {
    const ss = VIZ.senales.filter(s => s.cluster_id === c.id && s.fecha_origen)
      .map(s => (s.fecha_origen || "").slice(0, 7)).filter(m => /^\d{4}-\d{2}/.test(m)).sort();
    const cum = {}; let acc = 0;
    ss.forEach(m => { acc++; cum[m] = acc; });
    return { c, puntos: Object.entries(cum) };
  }).filter(s => s.puntos.length > 1);
  if (!series.length) { cont.innerHTML = '<p class="muted">Faltan fechas de origen en las señales.</p>'; return; }
  const meses = [...new Set(series.flatMap(s => s.puntos.map(p => p[0])))].sort();
  const maxY = Math.max(...series.flatMap(s => s.puntos.map(p => p[1])));
  const sx = m => pad + meses.indexOf(m) / (meses.length - 1 || 1) * (W - 2 * pad);
  const sy = v => H - pad - v / maxY * (H - 2 * pad);
  const svg = nuevoSVG(W, H);
  svgEl("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#999" }, svg);
  svgEl("line", { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: "#999" }, svg);
  svgText(svg, W / 2, H - 14, "Tiempo (mes) →", { "text-anchor": "middle", "font-size": 11 });
  svgText(svg, 16, H / 2, "Señales acumuladas →", { "font-size": 11, transform: `rotate(-90 16 ${H / 2})` });
  series.forEach(s => {
    const d = s.puntos.map((p, i) => (i ? "L" : "M") + sx(p[0]) + "," + sy(p[1])).join(" ");
    svgEl("path", { d, fill: "none", stroke: colorCluster(s.c.id), "stroke-width": 2, opacity: 0.85 }, svg);
    const last = s.puntos[s.puntos.length - 1];
    svgText(svg, sx(last[0]) + 4, sy(last[1]), s.c.nombre.slice(0, 18),
      { "font-size": 9, fill: colorCluster(s.c.id) });
  });
  cont.appendChild(svg); return svg;
}

// =====================================================================
// VISTA 8 — MATRIZ IMPACTO × INCERTIDUMBRE
// =====================================================================
function impactoIncert(cont) {
  if (!VIZ.tendencias.length) {
    cont.innerHTML = '<p class="muted">Creá tendencias en la tab Tendencias (botón "Generar desde clusters").</p>';
    return;
  }
  const W = 780, H = 620, pad = 58, MAX = 20;   // ≥20 intervalos por eje
  const svg = nuevoSVG(W, H);
  const x0 = pad, x1 = W - pad, y0 = H - pad, y1 = pad;
  const sx = v => x0 + (v - 1) / (MAX - 1) * (x1 - x0);
  const sy = v => y0 - (v - 1) / (MAX - 1) * (y0 - y1);
  const mid = sx((MAX + 1) / 2), midY = sy((MAX + 1) / 2);

  // zonas (mitad superior): certezas (izq) / incertidumbres críticas (der)
  svgEl("rect", { x: x0, y: y1, width: mid - x0, height: midY - y1, fill: "#1D7874", opacity: 0.06 }, svg);
  svgEl("rect", { x: mid, y: y1, width: x1 - mid, height: midY - y1, fill: "#E8743B", opacity: 0.09 }, svg);

  // grilla de 20 intervalos (menores tenues, mayores cada 5 con número)
  for (let v = 1; v <= MAX; v++) {
    const major = v % 5 === 0 || v === 1;
    svgEl("line", { x1: sx(v), y1, x2: sx(v), y2: y0, stroke: major ? "#d1d5db" : "#eef1f4" }, svg);
    svgEl("line", { x1: x0, y1: sy(v), x2: x1, y2: sy(v), stroke: major ? "#d1d5db" : "#eef1f4" }, svg);
    if (major) {
      svgText(svg, sx(v), y0 + 14, String(v), { "text-anchor": "middle", "font-size": 9, fill: "#9ca3af" });
      svgText(svg, x0 - 9, sy(v) + 3, String(v), { "text-anchor": "end", "font-size": 9, fill: "#9ca3af" });
    }
  }
  // divisores medios + marco
  svgEl("line", { x1: mid, y1, x2: mid, y2: y0, stroke: "#9ca3af", "stroke-dasharray": "3 3" }, svg);
  svgEl("line", { x1: x0, y1: midY, x2: x1, y2: midY, stroke: "#9ca3af", "stroke-dasharray": "3 3" }, svg);
  svgEl("rect", { x: x0, y: y1, width: x1 - x0, height: y0 - y1, fill: "none", stroke: "#9ca3af" }, svg);

  svgText(svg, x0 + 8, y1 + 15, "Certezas (planificar)", { "font-size": 10, fill: "#1D7874", "font-weight": 600 });
  svgText(svg, x1 - 8, y1 + 15, "Incertidumbres críticas → ejes 2×2", { "font-size": 10, fill: "#E8743B", "text-anchor": "end", "font-weight": 600 });
  svgText(svg, (x0 + x1) / 2, H - 16, "Incertidumbre →", { "text-anchor": "middle", "font-size": 11 });
  svgText(svg, 16, (y0 + y1) / 2, "Impacto →", { "font-size": 11, transform: `rotate(-90 16 ${(y0 + y1) / 2})`, "text-anchor": "middle" });

  // rótulo flotante único (solo en hover) — evita saturar el plano con 30+ etiquetas
  const hoverLbl = svgEl("text", { "text-anchor": "middle", "font-size": 11.5,
    "font-weight": 700, fill: "#111827", stroke: "#fff", "stroke-width": 3.5,
    "paint-order": "stroke", "pointer-events": "none", opacity: 0 }, svg);
  VIZ.tendencias.forEach(t => {
    const inc = t.incertidumbre || 10, imp = t.impacto || 10;
    const r = 6 + Math.sqrt(t.fuerza || 1) * 2.6, cx = sx(inc), cy = sy(imp);
    const col = STEEP_COLORS[t.cuadrante_steep] || "#1D7874";
    const c = svgEl("circle", { cx, cy, r, fill: col, opacity: 0.55, stroke: col,
      "stroke-width": 1, style: "cursor:pointer" }, svg);
    svgEl("title", {}, c).textContent =
      `${t.nombre}\nimpacto ${imp} · incertidumbre ${inc} · fuerza ${t.fuerza || 0}`;
    c.onmouseenter = () => {
      c.setAttribute("opacity", 0.85); c.setAttribute("stroke-width", 2);
      hoverLbl.textContent = t.nombre || "";
      hoverLbl.setAttribute("x", cx); hoverLbl.setAttribute("y", Math.max(cy - r - 5, y1 + 10));
      hoverLbl.setAttribute("opacity", 1);
      svg.appendChild(hoverLbl);   // traer al frente
    };
    c.onmouseleave = () => {
      c.setAttribute("opacity", 0.55); c.setAttribute("stroke-width", 1);
      hoverLbl.setAttribute("opacity", 0);
    };
    c.onclick = () => abrirPanelEditarTendencia(t);
  });
  cont.appendChild(svg);
  const exp = document.createElement("div");
  exp.style.cssText = "margin-top:12px;padding:12px 14px;border:1px solid #eee;" +
    "border-radius:8px;background:#fafafa;font-size:12px;line-height:1.5;max-width:840px";
  exp.innerHTML = `
    <b style="font-size:12.5px">¿De dónde salen los ejes?</b>
    <ul style="margin:6px 0 0;padding-left:18px;color:#374151">
      <li><b>Impacto (eje Y)</b> — cuánto podría moldear el futuro de la longevidad si se
        desarrolla. Es un <b>juicio del analista</b>, no un cálculo automático.</li>
      <li><b>Incertidumbre (eje X)</b> — qué tan impredecible o disputado es su desenlace:
        ¿sabemos cómo se va a resolver, o está genuinamente abierto? También es un juicio.</li>
      <li>Ambos se <b>asignan y editan a mano</b>: al hacer click en una burbuja se abren
        los sliders (escala 1–20).</li>
      <li>En cambio, el <b>tamaño = fuerza</b> (nº de señales) y el <b>color = STEEP dominante</b>
        salen directo de las señales del cluster.</li>
      <li><b>Cuadrantes:</b> arriba-izquierda = <span style="color:#1D7874;font-weight:600">Certezas</span>
        (alto impacto, baja incertidumbre → planificar); arriba-derecha =
        <span style="color:#E8743B;font-weight:600">Incertidumbres críticas</span>
        (alto impacto, alta incertidumbre → candidatas a ejes de la matriz 2×2 de escenarios).</li>
    </ul>
    <p class="muted" style="margin:8px 0 0">Pasá el mouse por una burbuja para ver el detalle; click para editar.</p>`;
  cont.appendChild(exp);
  return svg;
}
function abrirPanelEditarTendencia(t) {
  const ss = t.cluster_id ? senalesDeCluster(t.cluster_id) : [];
  const listaSenales = `<div style="margin-top:14px;border-top:1px solid #eee;padding-top:10px">
    <p class="muted" style="margin-bottom:4px"><b>Señales</b> (${ss.length})</p>
    ${ss.length ? ss.map(senalRowHTML).join("")
      : '<p class="muted">Sin señales vinculadas.</p>'}</div>`;
  abrirPanel(`<h3>${esc(t.nombre)}</h3>
    <label>Impacto: <b id="imp-v">${t.impacto || 10}</b>
      <input type="range" min="1" max="20" value="${t.impacto || 10}" id="imp-s"></label>
    <label>Incertidumbre: <b id="inc-v">${t.incertidumbre || 10}</b>
      <input type="range" min="1" max="20" value="${t.incertidumbre || 10}" id="inc-s"></label>
    <button class="btn primary" id="guardar-ti">Guardar</button>
    ${listaSenales}`);
  $("#imp-s").oninput = () => $("#imp-v").textContent = $("#imp-s").value;
  $("#inc-s").oninput = () => $("#inc-v").textContent = $("#inc-s").value;
  $("#guardar-ti").onclick = async () => {
    await api("/tendencias/" + t.id, { method: "PATCH",
      body: JSON.stringify({ impacto: +$("#imp-s").value, incertidumbre: +$("#inc-s").value }) });
    toast("Guardado"); VIZ = await api("/visualizaciones/datos"); renderViz();
    $("#side-panel").classList.remove("open");
  };
}

// =====================================================================
// VISTA 9 — MATRIZ DE IMPACTO CRUZADO (drivers × drivers)
// =====================================================================
function impactoCruzado(cont) {
  const drivers = (VIZ.tendencias.length ? VIZ.tendencias :
    VIZ.clusters.filter(c => c.nombre !== "Sin clasificar")).slice(0, 12);
  if (drivers.length < 2) { cont.innerHTML = '<p class="muted">Faltan drivers/tendencias.</p>'; return; }
  // co-ocurrencia: señales que comparten cuadrante STEEP (proxy)
  const señalesDe = d => VIZ.senales.filter(s =>
    s.cluster_id === (d.cluster_id || d.id) || s.cluster_id === d.id);
  const N = drivers.length, cell = 38, x0 = 180, y0 = 180;
  const W = x0 + N * cell + 20, H = y0 + N * cell + 20;
  const svg = nuevoSVG(W, H);
  // matriz de co-ocurrencia por cuadrante compartido
  const quadOf = d => { const ss = señalesDe(d); const c = {}; ss.forEach(s => c[s.cuadrante_steep] = (c[s.cuadrante_steep] || 0) + 1); return c; };
  const quads = drivers.map(quadOf);
  let maxco = 1;
  const M = drivers.map((_, i) => drivers.map((_, j) => {
    if (i === j) return 0;
    let co = 0; STEEP_LIST.forEach(q => co += Math.min(quads[i][q] || 0, quads[j][q] || 0));
    maxco = Math.max(maxco, co); return co;
  }));
  drivers.forEach((d, i) => {
    svgText(svg, x0 - 6, y0 + i * cell + cell / 2 + 3, (d.nombre || "").slice(0, 24),
      { "text-anchor": "end", "font-size": 9 });
    const t = svgText(svg, x0 + i * cell + cell / 2, y0 - 6, (d.nombre || "").slice(0, 24),
      { "font-size": 9, transform: `rotate(-55 ${x0 + i * cell + cell / 2} ${y0 - 6})` });
  });
  M.forEach((row, i) => row.forEach((co, j) => {
    const r = svgEl("rect", { x: x0 + j * cell, y: y0 + i * cell, width: cell - 2, height: cell - 2,
      rx: 2, fill: i === j ? "#f1f5f9" : "#1D7874", opacity: i === j ? 1 : 0.12 + 0.85 * co / maxco,
      style: "cursor:pointer" }, svg);
    if (co) svgText(svg, x0 + j * cell + cell / 2, y0 + i * cell + cell / 2 + 3, String(co),
      { "text-anchor": "middle", "font-size": 9, fill: co / maxco > 0.5 ? "#fff" : "#1A1A1A" });
  }));
  cont.appendChild(svg); return svg;
}

// =====================================================================
// VISTA 11 — MATRIZ 2×2 DE ESCENARIOS
// =====================================================================
function matriz2x2(cont) {
  const drivers = VIZ.tendencias.length ? VIZ.tendencias :
    VIZ.clusters.filter(c => c.nombre !== "Sin clasificar");
  if (drivers.length < 2) { cont.innerHTML = '<p class="muted">Necesitás al menos 2 drivers/tendencias.</p>'; return; }
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div style="display:flex;gap:12px;margin-bottom:12px">
    <label>Eje X <select id="ejeX">${drivers.map(d => `<option value="${d.cluster_id || d.id}">${esc((d.nombre || "").slice(0, 30))}</option>`).join("")}</select></label>
    <label>Eje Y <select id="ejeY">${drivers.map((d, i) => `<option value="${d.cluster_id || d.id}" ${i === 1 ? "selected" : ""}>${esc((d.nombre || "").slice(0, 30))}</option>`).join("")}</select></label>
    <button class="btn" id="guardar2x2">Guardar nombres</button></div>
    <div id="render2x2"></div>`;
  cont.appendChild(wrap);
  const draw = () => {
    const cont2 = $("#render2x2"); cont2.innerHTML = "";
    const dx = drivers.find(d => (d.cluster_id || d.id) == $("#ejeX").value);
    const dy = drivers.find(d => (d.cluster_id || d.id) == $("#ejeY").value);
    const W = 640, H = 520, pad = 50;
    const svg = nuevoSVG(W, H);
    svgEl("line", { x1: W / 2, y1: pad, x2: W / 2, y2: H - pad, stroke: "#999" }, svg);
    svgEl("line", { x1: pad, y1: H / 2, x2: W - pad, y2: H / 2, stroke: "#999" }, svg);
    svgText(svg, W - pad, H / 2 - 6, "+ " + (dx.nombre || "").slice(0, 18), { "text-anchor": "end", "font-size": 10, "font-weight": 600 });
    svgText(svg, pad, H / 2 - 6, "− " + (dx.nombre || "").slice(0, 18), { "font-size": 10, "font-weight": 600 });
    svgText(svg, W / 2 + 6, pad, "+ " + (dy.nombre || "").slice(0, 18), { "font-size": 10, "font-weight": 600 });
    svgText(svg, W / 2 + 6, H - pad, "− " + (dy.nombre || "").slice(0, 18), { "font-size": 10, "font-weight": 600 });
    const quad = [[W * 0.27, H * 0.27, "q2"], [W * 0.73, H * 0.27, "q1"],
      [W * 0.27, H * 0.73, "q3"], [W * 0.73, H * 0.73, "q4"]];
    quad.forEach(([x, y, id]) => {
      const fo = svgEl("foreignObject", { x: x - 90, y: y - 18, width: 180, height: 40 }, svg);
      const inp = document.createElement("input");
      inp.id = "nombre_" + id; inp.placeholder = "Nombre del mundo…";
      inp.style.cssText = "width:100%;text-align:center;font-size:12px;border:1px dashed #1D7874;background:rgba(255,255,255,.7)";
      fo.appendChild(inp);
    });
    cont2.appendChild(svg);
  };
  $("#ejeX").onchange = draw; $("#ejeY").onchange = draw; draw();
  $("#guardar2x2").onclick = async () => {
    await api("/escenarios", { method: "POST", body: JSON.stringify({
      driver_x_id: +$("#ejeX").value, driver_y_id: +$("#ejeY").value,
      nombre_q1: $("#nombre_q1").value, nombre_q2: $("#nombre_q2").value,
      nombre_q3: $("#nombre_q3").value, nombre_q4: $("#nombre_q4").value }) });
    toast("Escenario guardado");
  };
  return wrap.querySelector("svg");
}

// =====================================================================
// VISTA 12 — ICEBERG / CLA POR DRIVER
// =====================================================================
function iceberg(cont) {
  const clusters = VIZ.clusters.filter(c => c.nombre !== "Sin clasificar");
  if (!clusters.length) { cont.innerHTML = '<p class="muted">Clusterizá primero.</p>'; return; }
  const wrap = document.createElement("div");
  wrap.innerHTML = `<label>Cluster/driver <select id="claCluster">${clusters.map(c =>
    `<option value="${c.id}">${esc(c.nombre)}</option>`).join("")}</select></label><div id="claRender"></div>`;
  cont.appendChild(wrap);
  const draw = async () => {
    const cid = +$("#claCluster").value;
    const ss = VIZ.senales.filter(s => s.cluster_id === cid);
    const cla = await api("/cla/" + cid);
    const drivers = [...new Set(ss.map(s => s.driver_hipotesis).filter(Boolean))];
    const r = $("#claRender");
    r.innerHTML = `
      <div style="background:#cfeae8;padding:12px;border-radius:8px 8px 0 0">
        <b>Litania (visible)</b><ul style="margin:6px 0">${ss.slice(0, 6).map(s => `<li style="font-size:12px">${senalLink(s, 80)}</li>`).join("")}</ul></div>
      <div style="background:#a9d6d2;padding:12px">
        <b>Causas sistémicas (drivers)</b><ul style="margin:6px 0">${(drivers.length ? drivers : ["(sin drivers asignados)"]).map(d => `<li style="font-size:12px">${esc(d)}</li>`).join("")}</ul></div>
      <div style="background:#7fbfb9;padding:12px">
        <b>Visión de mundo</b><br><textarea id="cla-vision" rows="2" style="width:100%;margin-top:4px">${esc(cla.vision_mundo || "")}</textarea></div>
      <div style="background:#1D7874;color:#fff;padding:12px;border-radius:0 0 8px 8px">
        <b>Mito / metáfora</b><br><textarea id="cla-mito" rows="2" style="width:100%;margin-top:4px">${esc(cla.mito_metafora || "")}</textarea>
        <button class="btn" id="cla-guardar" style="margin-top:8px">Guardar CLA</button></div>`;
    $("#cla-guardar").onclick = async () => {
      await api("/cla/" + cid, { method: "POST", body: JSON.stringify({
        vision_mundo: $("#cla-vision").value, mito_metafora: $("#cla-mito").value }) });
      toast("Análisis CLA guardado");
    };
  };
  $("#claCluster").onchange = draw; draw();
  return null;
}

// =====================================================================
// Registro de renderers
// =====================================================================
// =====================================================================
// VISTA 12 — BORDE · Volumen × Novedad × Robustez
//   X = volumen (nº de señales del cluster)
//   Y = novedad (fecha de PUBLICACIÓN de las señales, no de relevamiento)
//   Tamaño = robustez (fuentes distintas; fallback: cuadrantes STEEP distintos)
//   Color = STEEP dominante del cluster
//   Cuadrantes: Futuro oficial · Ola · Residuo · Borde
// =====================================================================
function bordeRobustez(cont) {
  const W = 900, H = 640;
  const padL = 66, padR = 210, padT = 66, padB = 66;
  const svg = nuevoSVG(W, H);
  const clusters = VIZ.clusters.filter(c => c.nombre !== "Sin clasificar");

  const median = arr => {
    if (!arr.length) return null;
    const a = [...arr].sort((x, y) => x - y), m = a.length >> 1;
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };

  let datos = clusters.map(c => {
    const ss = VIZ.senales.filter(s => s.cluster_id === c.id);
    const times = ss.map(s => Date.parse(s.fecha_origen)).filter(t => !isNaN(t));
    const steepCount = {};
    ss.forEach(s => { if (s.cuadrante_steep) steepCount[s.cuadrante_steep] = (steepCount[s.cuadrante_steep] || 0) + 1; });
    const dom = Object.entries(steepCount).sort((a, b) => b[1] - a[1])[0];
    return {
      c, ss, vol: ss.length, tMed: median(times),
      fuentes: new Set(ss.map(s => s.fuente_id).filter(x => x != null)).size,
      steepDistintos: Object.keys(steepCount).length, steepDom: dom ? dom[0] : null,
      steepCount,
    };
  }).filter(d => d.vol > 0);

  if (datos.length < 2) {
    svgText(svg, W / 2, H / 2, "Se necesitan al menos 2 clusters con señales.",
      { "text-anchor": "middle", "font-size": 13, fill: "#6b7280" });
    cont.appendChild(svg); return svg;
  }

  // novedad: rango (percentil) de la fecha mediana de publicación. Se usa el
  // rango y no el min–max porque el corpus es casi todo reciente y un único
  // cluster viejo comprimiría al resto contra el tope. El rango reparte el eje.
  const fmtMes = t => t == null ? "—" : new Date(t).toISOString().slice(0, 7);
  const conF = datos.filter(d => d.tMed != null).sort((a, b) => a.tMed - b.tMed);
  conF.forEach((d, i) => d.novedad = conF.length > 1 ? i / (conF.length - 1) : 0.5);
  datos.filter(d => d.tMed == null).forEach(d => d.novedad = 0);

  // robustez: fuentes distintas; si el corpus tiene muy pocas, usar STEEP distintos
  const usarSteep = Math.max(...datos.map(d => d.fuentes)) <= 2;
  datos.forEach(d => d.rob = usarSteep ? d.steepDistintos : d.fuentes);
  const robMax = Math.max(...datos.map(d => d.rob), 1), robMin = Math.min(...datos.map(d => d.rob), 1);
  const radio = rob => {                         // área ∝ robustez, radio 7..26
    if (robMax === robMin) return 13;
    const t = (Math.sqrt(rob) - Math.sqrt(robMin)) / (Math.sqrt(robMax) - Math.sqrt(robMin));
    return 7 + t * 19;
  };

  // escalas
  const x0 = padL, x1 = W - padR, y0 = H - padB, y1 = padT;
  const sx = escala([0, Math.max(...datos.map(d => d.vol))], x0, x1);
  const sy = v => y0 + v * (y1 - y0);
  const xDiv = sx(median(datos.map(d => d.vol))), yDiv = sy(median(datos.map(d => d.novedad)));

  // resaltar cuadrante BORDE (arriba-izquierda) + divisores + ejes
  svgEl("rect", { x: x0, y: y1, width: xDiv - x0, height: yDiv - y1, fill: "#16a34a", opacity: 0.05 }, svg);
  svgEl("line", { x1: xDiv, y1, x2: xDiv, y2: y0, stroke: "#d1d5db", "stroke-dasharray": "4 4" }, svg);
  svgEl("line", { x1: x0, y1: yDiv, x2: x1, y2: yDiv, stroke: "#d1d5db", "stroke-dasharray": "4 4" }, svg);
  svgEl("line", { x1: x0, y1: y0, x2: x1, y2: y0, stroke: "#9ca3af" }, svg);
  svgEl("line", { x1: x0, y1, x2: x0, y2: y0, stroke: "#9ca3af" }, svg);

  const ql = (x, y, t, sub, anchor) => {
    svgText(svg, x, y, t, { "font-size": 12, "font-weight": 700, fill: "#374151", "text-anchor": anchor });
    svgText(svg, x, y + 13, sub, { "font-size": 9, fill: "#9ca3af", "text-anchor": anchor });
  };
  ql(x0 + 8, y1 + 16, "Borde", "señal débil · mirá el tamaño", "start");
  ql(x1 - 8, y1 + 16, "Ola", "grande y ahora", "end");
  ql(x0 + 8, y0 - 20, "Residuo", "viejo y marginal", "start");
  ql(x1 - 8, y0 - 20, "Futuro oficial", "lo ya dado por hecho", "end");

  svgText(svg, (x0 + x1) / 2, H - 22, "Volumen de señales →", { "text-anchor": "middle", "font-size": 11 });
  svgText(svg, 18, (y0 + y1) / 2, "Novedad (fecha de publicación) →",
    { "font-size": 11, transform: `rotate(-90 18 ${(y0 + y1) / 2})`, "text-anchor": "middle" });

  // burbujas
  datos.forEach(d => {
    const r = radio(d.rob), cx = sx(d.vol), cy = sy(d.novedad);
    const color = STEEP_COLORS[d.steepDom] || "#9ca3af";
    // desglose STEEP (dominante primero) y "pureza": si ningún cuadrante llega a
    // 2/3, la burbuja es mixta y le ponemos un aro del 2º STEEP para verlo de una.
    const steepSorted = Object.entries(d.steepCount).sort((a, b) => b[1] - a[1]);
    const totSteep = steepSorted.reduce((a, kv) => a + kv[1], 0) || 1;
    const mixed = steepSorted.length > 1 && steepSorted[0][1] / totSteep < 0.66;
    const rimColor = mixed ? (STEEP_COLORS[steepSorted[1][0]] || color) : color;
    const circ = svgEl("circle", { cx, cy, r, fill: color, opacity: 0.5, stroke: rimColor,
      "stroke-width": mixed ? 2.5 : 1.5, style: "cursor:pointer" }, svg);
    const rob = `robustez ${d.rob} ${usarSteep ? "cuadrantes STEEP" : "fuentes distintas"}`;
    const steepMix = steepSorted.map(([q, n]) => `${q} ${n}`).join(" · ") || "—";
    svgEl("title", {}, circ).textContent =
      `${d.c.nombre}\n${d.vol} señales · novedad ${(d.novedad * 100).toFixed(0)}% (mediana ${fmtMes(d.tMed)})\n${rob}\nSTEEP: ${steepMix}`;
    circ.onclick = () => abrirPanel(panelClusterHTML(d.c.nombre, d.ss,
      `${d.vol} señales · novedad ${(d.novedad * 100).toFixed(0)}% (mediana ${fmtMes(d.tMed)}) · ${rob} · STEEP: ${steepMix}`));
    if (r >= 12)
      svgText(svg, cx, cy + 3, String(d.rob),
        { "text-anchor": "middle", "font-size": 9, "font-weight": 700, fill: "#fff", style: "pointer-events:none" });
  });

  // leyenda (derecha)
  let lx = x1 + 24, ly = padT;
  svgText(svg, lx, ly, "Color = STEEP dominante", { "font-size": 11, "font-weight": 700 }); ly += 17;
  STEEP_LIST.forEach(q => {
    svgEl("circle", { cx: lx + 6, cy: ly - 4, r: 6, fill: STEEP_COLORS[q], opacity: 0.8 }, svg);
    svgText(svg, lx + 18, ly, q, { "font-size": 10 }); ly += 17;
  });
  // muestra del aro de mezcla
  svgEl("circle", { cx: lx + 6, cy: ly - 4, r: 6, fill: STEEP_COLORS.Social, opacity: 0.5,
    stroke: STEEP_COLORS.Tecnológico, "stroke-width": 2.5 }, svg);
  svgText(svg, lx + 18, ly, "borde = 2º STEEP (mixto)", { "font-size": 9, fill: "#6b7280" }); ly += 17;
  ly += 12;
  svgText(svg, lx, ly, "Tamaño = robustez", { "font-size": 11, "font-weight": 700 }); ly += 13;
  svgText(svg, lx, ly, usarSteep ? "(cuadrantes STEEP distintos)" : "(fuentes distintas)",
    { "font-size": 9, fill: "#6b7280" }); ly += 16;
  [[robMin, "poca"], [robMax, "mucha"]].forEach(([rv, lab]) => {
    const rr = radio(rv);
    svgEl("circle", { cx: lx + 18, cy: ly + rr, r: rr, fill: "#9ca3af", opacity: 0.4, stroke: "#6b7280" }, svg);
    svgText(svg, lx + 40, ly + rr + 3, `${lab} (${rv})`, { "font-size": 10 }); ly += rr * 2 + 10;
  });
  ly += 10;
  ["Regla: en el borde,", "mirá el tamaño antes", "que la posición.",
   "Burbuja grande = varias", "fuentes que coinciden", "= patrón, no una voz."]
    .forEach((t, i) => svgText(svg, lx, ly + i * 13, t, { "font-size": 9.5, fill: "#16a34a" }));

  cont.appendChild(svg); return svg;
}

const VIZ_RENDER = {
  1: c => balanceSTEEP(c),       // radar + heatmap STEEP (la 13 vivía acá)
  2: c => sankey(c),
  3: c => senalDebil(c),
  4: c => procedencia(c),
  5: c => tresHorizontes(c),
  6: c => sCurves(c),
  7: c => impactoIncert(c),
  8: c => impactoCruzado(c),
  9: c => mapaSemantico(c),      // único mapa semántico (antes 1 y 10)
  10: c => matriz2x2(c),
  11: c => iceberg(c),
  12: c => bordeRobustez(c),
};
