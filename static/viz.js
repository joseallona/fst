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
// Panel lateral de un cluster: encabezado + lista de TODAS sus señales con link.
function panelClusterHTML(nombre, senales, meta) {
  const ss = senales || [];
  return `<h3>${esc(nombre)}</h3>
    <p class="muted">${esc(meta || (ss.length + " señales"))}</p>
    ${ss.length ? ss.map(s => `<p style="border-bottom:1px solid #eee;padding:7px 0;font-size:12px">
        ${senalLink(s, 100)}
        ${s.cuadrante_steep ? `<span class="muted"> · ${esc(s.cuadrante_steep)}</span>` : ""}</p>`).join("")
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
  [10, "10 · Matriz 2×2"], [11, "11 · Iceberg CLA"],
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
  abrirPanel(`<h3>${q} — ${nv}</h3>` + ss.map(s =>
    `<p style="border-bottom:1px solid #eee;padding:6px 0">${senalLink(s, 80)}</p>`).join(""));
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
  // posición de nodos
  const nodePos = {};
  cols.forEach(([titulo, items], ci) => {
    svgText(svg, colX[ci], 24, titulo, { "font-weight": 700, "font-size": 12 });
    const h = (H - 60) / items.length;
    items.forEach((it, i) => {
      const y = 50 + i * h + h / 2;
      nodePos[ci + "|" + it] = { x: colX[ci], y };
      svgEl("rect", { x: colX[ci], y: y - 12, width: 12, height: 24,
        fill: ci === 1 ? STEEP_COLORS[it] : "#1D7874", rx: 2 }, svg);
      svgText(svg, colX[ci] + 18, y + 4, (it || "").slice(0, 22), { "font-size": 10 });
    });
  });
  // flujos nivel→steep y steep→cluster
  const tematicaNivel = {}; VIZ.tematicas.forEach(t => tematicaNivel[t.id] = t.nivel);
  const flujoNS = {}, flujoSC = {};
  VIZ.senales.forEach(s => {
    const cl = VIZ.clusters.find(c => c.id === s.cluster_id);
    const nv = cl && cl.tematica_id ? tematicaNivel[cl.tematica_id] : "periferico";
    flujoNS[nv + "|" + s.cuadrante_steep] = (flujoNS[nv + "|" + s.cuadrante_steep] || 0) + 1;
    if (cl && cl.nombre !== "Sin clasificar")
      flujoSC[s.cuadrante_steep + "|" + cl.nombre] = (flujoSC[s.cuadrante_steep + "|" + cl.nombre] || 0) + 1;
  });
  const maxF = Math.max(...Object.values(flujoNS), ...Object.values(flujoSC), 1);
  const flujo = (a, b, key, max) => {
    if (!a || !b) return;
    const sw = 1 + 8 * (max / maxF);
    const p = svgEl("path", { d: `M${a.x + 12},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`,
      fill: "none", stroke: "#1D7874", "stroke-width": sw, opacity: 0.22,
      style: "cursor:pointer" }, svg);
    p.onmouseenter = () => p.setAttribute("opacity", 0.6);
    p.onmouseleave = () => p.setAttribute("opacity", 0.22);
  };
  for (const k in flujoNS) { const [nv, q] = k.split("|"); flujo(nodePos["0|" + nv], nodePos["1|" + q], k, flujoNS[k]); }
  for (const k in flujoSC) { const [q, cn] = k.split("|"); flujo(nodePos["1|" + q], nodePos["2|" + cn], k, flujoSC[k]); }
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
  const W = 720, H = 560, pad = 60;
  const svg = nuevoSVG(W, H);
  const sx = v => pad + (v - 1) / 4 * (W - 2 * pad);
  const sy = v => H - pad - (v - 1) / 4 * (H - 2 * pad);
  // zonas
  svgEl("rect", { x: pad, y: pad, width: (W - 2 * pad) / 2, height: (H - 2 * pad) / 2, fill: "#1D7874", opacity: 0.06 }, svg);
  svgEl("rect", { x: W / 2, y: pad, width: (W - 2 * pad) / 2, height: (H - 2 * pad) / 2, fill: "#E8743B", opacity: 0.09 }, svg);
  svgText(svg, pad + 8, pad + 16, "Certezas (planificar)", { "font-size": 10, fill: "#1D7874" });
  svgText(svg, W - pad - 8, pad + 16, "Incertidumbres críticas → ejes 2×2", { "font-size": 10, fill: "#E8743B", "text-anchor": "end" });
  svgText(svg, W / 2, H - 18, "Incertidumbre →", { "text-anchor": "middle", "font-size": 11 });
  svgText(svg, 18, H / 2, "Impacto →", { "font-size": 11, transform: `rotate(-90 18 ${H / 2})` });
  VIZ.tendencias.forEach(t => {
    const r = 8 + Math.sqrt(t.fuerza || 1) * 3;
    const c = svgEl("circle", { cx: sx(t.incertidumbre || 3), cy: sy(t.impacto || 3), r,
      fill: STEEP_COLORS[t.cuadrante_steep] || "#1D7874", opacity: 0.6, style: "cursor:pointer" }, svg);
    svgText(svg, sx(t.incertidumbre || 3), sy(t.impacto || 3) - r - 2, (t.nombre || "").slice(0, 18),
      { "text-anchor": "middle", "font-size": 9, "font-weight": 600 });
    c.onclick = () => abrirPanelEditarTendencia(t);
  });
  cont.appendChild(svg);
  const help = document.createElement("p"); help.className = "muted";
  help.style.marginTop = "10px";
  help.textContent = "Click en una burbuja para editar impacto/incertidumbre (1-5).";
  cont.appendChild(help);
  return svg;
}
function abrirPanelEditarTendencia(t) {
  abrirPanel(`<h3>${esc(t.nombre)}</h3>
    <label>Impacto: <b id="imp-v">${t.impacto || 3}</b>
      <input type="range" min="1" max="5" value="${t.impacto || 3}" id="imp-s"></label>
    <label>Incertidumbre: <b id="inc-v">${t.incertidumbre || 3}</b>
      <input type="range" min="1" max="5" value="${t.incertidumbre || 3}" id="inc-s"></label>
    <button class="btn primary" id="guardar-ti">Guardar</button>`);
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
};
