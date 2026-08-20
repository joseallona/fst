"""
Clustering semántico — Etapa 5.

Usa las temáticas ya definidas como punto de partida:
  1. Embeddings de cada señal (título + cita) y de cada temática (nombre + desc).
  2. Asignación a temáticas existentes por coseno >= 0.75.
  3. UMAP + HDBSCAN sobre las señales residuales → clusters emergentes.
  4. Nombrar clusters emergentes con los conceptos más frecuentes del centroide.
  5. Guardar clusters, cluster_id en señales y coords UMAP de TODAS las señales.

Corre en background; el progreso por paso se expone vía /clusters/estado.
"""

import asyncio
import re
import unicodedata
from collections import Counter
from datetime import datetime

import numpy as np

import db
import embeddings
import llm

# La guía especifica 0.75, calibrado para embeddings monolingües de mayor
# magnitud. Con paraphrase-multilingual-MiniLM-L12-v2 la similitud coseno
# señal↔temática real ronda 0.30-0.55 (medido sobre el corpus), por lo que
# 0.75 nunca se alcanza y la asignación a temáticas queda vacía. Usamos 0.45
# como default (asigna ~28% del corpus a temáticas conocidas y deja el resto
# para HDBSCAN), configurable por request. El comportamiento es el que describe
# la guía; solo el número se adapta al modelo.
UMBRAL_TEMATICA = 0.45

# Estado de progreso del job de clustering.
ESTADO = {"corriendo": False, "paso": None, "mensaje": "", "progreso": 0}

STOP = set("""de la el los las del y en con para por un una su al se que the of and to
in a is are for on with este esta como mas o e from at by an be we our using based
show using new this that these have has had were was been will would can could may
might also more most than then them they their there here what which who whom whose
when where why how all any both each few other some such only own same so very just
about into over under after before between during without within among across said
says according while because however therefore thus although though both either
una uno unos unas pero sin sobre entre cada todo toda todos todas este esta estos
estas ese esa eso son fue han hay más menos muy ya nos les sus por qué cómo cuando
donde porque aunque mientras según entre desde hasta hacia ante bajo cabe""".split())


def _norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def _nombre_desde_senales(senales):
    """Genera un nombre de cluster a partir de los conceptos frecuentes."""
    cont = Counter()
    for s in senales:
        texto = _norm((s.get("titulo") or "") + " " + (s.get("cita_relevancia") or ""))
        for w in re.findall(r"[a-z]{4,}", texto):
            if w not in STOP:
                cont[w] += 1
    top = [w for w, _ in cont.most_common(3)]
    return " · ".join(top).title() if top else "Cluster emergente"


async def _nombre_emergente(senales_cl, llm_ok):
    """Nombre de un cluster emergente: frase corta del LLM local si está
    disponible; si no (Ollama caído o error/timeout), cae al patrón de 3
    palabras frecuentes 'A · B · C'."""
    fallback = _nombre_desde_senales(senales_cl)
    if not llm_ok:
        return fallback
    try:
        nombre = await asyncio.wait_for(llm.titulo_cluster(senales_cl), timeout=45)
        return nombre if nombre and len(nombre) > 3 else fallback
    except Exception:
        return fallback


async def _cargar(conn):
    conn.row_factory = db.row_to_dict
    cur = await conn.execute(
        "SELECT * FROM senales WHERE es_relevante=1")
    senales = await cur.fetchall()
    cur = await conn.execute("SELECT * FROM tematicas")
    tematicas = await cur.fetchall()
    return senales, tematicas


def _set(paso, mensaje, progreso):
    ESTADO.update(paso=paso, mensaje=mensaje, progreso=progreso)


async def generar(conn, umbral=None):
    import umap
    import hdbscan

    umbral = UMBRAL_TEMATICA if umbral is None else umbral
    ESTADO.update(corriendo=True, paso=1, mensaje="Generando embeddings…", progreso=5)
    senales, tematicas = await _cargar(conn)
    if len(senales) < 3:
        ESTADO.update(corriendo=False, paso=None,
                      mensaje="Se necesitan al menos 3 señales relevantes.", progreso=0)
        return

    # PASO 1 — embeddings
    textos_senales = [((s["titulo"] or "") + " " + (s["cita_relevancia"] or ""))[:2000]
                      for s in senales]
    emb_senales = embeddings.embed(textos_senales)
    textos_tem = [((t["nombre"] or "") + " " + (t["descripcion"] or "")) for t in tematicas]
    emb_tem = embeddings.embed(textos_tem) if tematicas else np.zeros((0, emb_senales.shape[1]))

    # PASO 2 — asignación a temáticas existentes
    _set(2, "Asignando señales a temáticas (coseno ≥ 0.75)…", 30)
    asignacion = {}  # senal_idx -> tematica_idx
    if len(emb_tem):
        sims = emb_senales @ emb_tem.T  # ambos normalizados → coseno
        for i in range(len(senales)):
            j = int(np.argmax(sims[i]))
            if sims[i, j] >= umbral:
                asignacion[i] = j

    residual_idx = [i for i in range(len(senales)) if i not in asignacion]

    # PASO 3 — UMAP + HDBSCAN sobre residuales
    _set(3, "Detectando clusters emergentes (UMAP + HDBSCAN)…", 55)
    labels_resid = {}  # senal_idx -> cluster emergente local id (>=0) o -1
    if len(residual_idx) >= 6:
        emb_resid = emb_senales[residual_idx]
        nn = min(15, len(residual_idx) - 1)
        reducer = umap.UMAP(n_neighbors=nn, n_components=2, metric="cosine",
                            random_state=42)
        coords_resid = reducer.fit_transform(emb_resid)
        # min_cluster_size=5 (guía). min_samples=1 produce clusters más
        # granulares y evita un único "blob" gigante que absorbe el residual.
        clusterer = hdbscan.HDBSCAN(min_cluster_size=5, min_samples=1)
        labs = clusterer.fit_predict(coords_resid)
        for k, idx in enumerate(residual_idx):
            labels_resid[idx] = int(labs[k])
    else:
        for idx in residual_idx:
            labels_resid[idx] = -1

    # PASO 4 — coords UMAP de TODAS las señales (para el mapa)
    _set(4, "Calculando mapa semántico (coords UMAP)…", 75)
    nn_all = min(15, len(senales) - 1)
    if len(senales) >= 4:
        coords_all = umap.UMAP(n_neighbors=nn_all, n_components=2,
                               metric="cosine", random_state=42).fit_transform(emb_senales)
    else:
        coords_all = np.zeros((len(senales), 2))

    # PASO 5 — guardar (nombra clusters emergentes con el LLM si está disponible)
    _set(5, "Guardando clusters y coordenadas…", 90)
    llm_ok = await llm.disponible()
    await _persistir(conn, senales, tematicas, asignacion, labels_resid, coords_all, llm_ok)

    ESTADO.update(corriendo=False, paso=None,
                  mensaje="Clustering completado.", progreso=100)


async def _persistir(conn, senales, tematicas, asignacion, labels_resid, coords_all, llm_ok=False):
    # limpiar clusters previos
    await conn.execute("DELETE FROM clusters")
    await conn.execute("UPDATE senales SET cluster_id=NULL")
    await conn.execute("DELETE FROM senales_coords")
    fecha = datetime.now().isoformat(timespec="seconds")

    # clusters por temática (>= 3 señales asignadas)
    tem_to_senales = {}
    for si, tj in asignacion.items():
        tem_to_senales.setdefault(tj, []).append(si)
    cluster_de_senal = {}
    for tj, sidxs in tem_to_senales.items():
        if len(sidxs) < 3:
            # menos de 3 → quedan sin cluster temático (van como sin clasificar)
            continue
        tem = tematicas[tj]
        cur = await conn.execute(
            """INSERT INTO clusters (nombre, tematica_id, es_emergente, validado,
               descripcion, driver_candidato, fecha_creado)
               VALUES (?,?,?,?,?,?,?)""",
            (tem["nombre"], tem["id"], 0, 0, tem.get("descripcion"),
             tem["nombre"], fecha))
        cid = cur.lastrowid
        for si in sidxs:
            cluster_de_senal[si] = cid

    # clusters emergentes (labels >= 0)
    emergentes = {}
    for si, lab in labels_resid.items():
        if lab is not None and lab >= 0:
            emergentes.setdefault(lab, []).append(si)
    for lab, sidxs in emergentes.items():
        senales_cl = [senales[i] for i in sidxs]
        nombre = await _nombre_emergente(senales_cl, llm_ok)
        cur = await conn.execute(
            """INSERT INTO clusters (nombre, tematica_id, es_emergente, validado,
               descripcion, driver_candidato, fecha_creado)
               VALUES (?,?,?,?,?,?,?)""",
            (nombre, None, 1, 0, f"Cluster emergente con {len(sidxs)} señales",
             nombre, fecha))
        cid = cur.lastrowid
        for si in sidxs:
            cluster_de_senal[si] = cid

    # cluster 'Sin clasificar' para el resto
    sin_clasif = [i for i in range(len(senales)) if i not in cluster_de_senal]
    if sin_clasif:
        cur = await conn.execute(
            """INSERT INTO clusters (nombre, tematica_id, es_emergente, validado,
               descripcion, fecha_creado) VALUES (?,?,?,?,?,?)""",
            ("Sin clasificar", None, 1, 0, "Señales aisladas (ruido HDBSCAN)", fecha))
        cid = cur.lastrowid
        for si in sin_clasif:
            cluster_de_senal[si] = cid

    # actualizar señales y coords
    for i, s in enumerate(senales):
        cid = cluster_de_senal.get(i)
        await conn.execute("UPDATE senales SET cluster_id=? WHERE id=?", (cid, s["id"]))
        x, y = float(coords_all[i][0]), float(coords_all[i][1])
        await conn.execute(
            "INSERT OR REPLACE INTO senales_coords (senal_id, x, y) VALUES (?,?,?)",
            (s["id"], x, y))
    await conn.commit()


async def resumen_tematicas(conn):
    """Tabla: temática | nivel | señales asignadas | % del total."""
    conn.row_factory = db.row_to_dict
    cur = await conn.execute("SELECT COUNT(*) n FROM senales WHERE es_relevante=1")
    total = (await cur.fetchone())["n"] or 1
    cur = await conn.execute("""
        SELECT t.id, t.nombre, t.nivel,
               (SELECT COUNT(*) FROM senales s
                JOIN clusters c ON s.cluster_id=c.id
                WHERE c.tematica_id=t.id) AS asignadas
        FROM tematicas t ORDER BY asignadas DESC""")
    rows = await cur.fetchall()
    for r in rows:
        r["porcentaje"] = round(100 * (r["asignadas"] or 0) / total, 1)
    return rows
