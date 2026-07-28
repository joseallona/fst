"""
Diseñar Futuros — servidor principal (FastAPI + SQLite).

Territorio: Longevity. Construye el corpus de señales de futuros:
  Fuentes → Señales (scraper) → Clusters → Tendencias → Visualizaciones.

Levantar con:  uvicorn main:app --reload
Abrir:         http://127.0.0.1:8000
"""

import asyncio
import json
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

import db
import fuentes_gen
import scraper
import rescraping
import profundizar as profundizar_mod
import escenarios as esc_mod
import llm

app = FastAPI(title="Diseñar Futuros · Longevity")

# Módulos ML opcionales (se cargan recién en las etapas de Clusters/Scoring).
try:
    import scoring  # noqa
    SCORING_OK = True
except Exception:
    scoring = None
    SCORING_OK = False

try:
    import clustering  # noqa
    CLUSTERING_OK = True
except Exception:
    clustering = None
    CLUSTERING_OK = False


@app.on_event("startup")
async def startup():
    await db.init_db()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def fetch_all(conn, q, params=()):
    conn.row_factory = db.row_to_dict
    cur = await conn.execute(q, params)
    return await cur.fetchall()


async def fetch_one(conn, q, params=()):
    conn.row_factory = db.row_to_dict
    cur = await conn.execute(q, params)
    return await cur.fetchone()


def _now():
    return datetime.now().isoformat(timespec="seconds")


# ===========================================================================
# TEMÁTICAS
# ===========================================================================
@app.get("/tematicas")
async def listar_tematicas():
    async with db.get_conn() as conn:
        rows = await fetch_all(conn, "SELECT * FROM tematicas ORDER BY "
                               "CASE nivel WHEN 'nucleo' THEN 0 "
                               "WHEN 'adyacente' THEN 1 ELSE 2 END, id")
    return rows


@app.post("/tematicas")
async def crear_tematica(req: Request):
    body = await req.json()
    async with db.get_conn() as conn:
        cur = await conn.execute(
            "INSERT INTO tematicas (nombre, nivel, descripcion) VALUES (?,?,?)",
            (body.get("nombre"), body.get("nivel", "adyacente"),
             body.get("descripcion", "")))
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM tematicas WHERE id = ?",
                              (cur.lastrowid,))
    return row


@app.patch("/tematicas/{tid}")
async def editar_tematica(tid: int, req: Request):
    body = await req.json()
    campos = {k: body[k] for k in ("nombre", "nivel", "descripcion") if k in body}
    if not campos:
        raise HTTPException(400, "nada para actualizar")
    async with db.get_conn() as conn:
        sets = ", ".join(f"{k}=?" for k in campos)
        await conn.execute(f"UPDATE tematicas SET {sets} WHERE id=?",
                           list(campos.values()) + [tid])
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM tematicas WHERE id=?", (tid,))
    return row


@app.delete("/tematicas/{tid}")
async def borrar_tematica(tid: int):
    async with db.get_conn() as conn:
        await conn.execute("DELETE FROM tematicas WHERE id=?", (tid,))
        await conn.commit()
    return {"ok": True}


@app.post("/tematicas/generar")
async def generar_tematicas():
    """Genera el mapa de temáticas del territorio (idempotente: no duplica)."""
    async with db.get_conn() as conn:
        existentes = await fetch_all(conn, "SELECT nombre FROM tematicas")
        nombres = {e["nombre"] for e in existentes}
        creadas = 0
        for nivel, items in fuentes_gen.MAPA_TEMATICAS.items():
            for nombre, desc in items:
                if nombre in nombres:
                    continue
                await conn.execute(
                    "INSERT INTO tematicas (nombre, nivel, descripcion) VALUES (?,?,?)",
                    (nombre, nivel, desc))
                creadas += 1
        await conn.commit()
        rows = await fetch_all(conn, "SELECT * FROM tematicas")
    return {"creadas": creadas, "total": len(rows), "tematicas": rows,
            "territorio": fuentes_gen.TERRITORIO}


# ===========================================================================
# FUENTES
# ===========================================================================
@app.get("/fuentes")
async def listar_fuentes():
    async with db.get_conn() as conn:
        rows = await fetch_all(conn, "SELECT * FROM fuentes ORDER BY "
                               "CASE categoria WHEN 'alta_frecuencia' THEN 0 "
                               "WHEN 'media_frecuencia' THEN 1 ELSE 2 END, id")
    return rows


@app.post("/fuentes")
async def crear_fuente(req: Request):
    b = await req.json()
    async with db.get_conn() as conn:
        cur = await conn.execute(
            """INSERT INTO fuentes
               (nombre, url, tipo_acceso, cuadrante_steep, categoria,
                tematica_id, activa, calidad, senales_generadas, fecha_agregada)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (b.get("nombre"), b.get("url"), b.get("tipo_acceso", "html"),
             b.get("cuadrante_steep"), b.get("categoria", "baja_frecuencia"),
             b.get("tematica_id"), 1, "sin evaluar", 0, _now()))
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM fuentes WHERE id=?",
                              (cur.lastrowid,))
    return row


@app.patch("/fuentes/{fid}")
async def editar_fuente(fid: int, req: Request):
    b = await req.json()
    permitidos = ("nombre", "url", "tipo_acceso", "cuadrante_steep",
                  "categoria", "tematica_id", "activa", "calidad")
    campos = {k: b[k] for k in permitidos if k in b}
    if not campos:
        raise HTTPException(400, "nada para actualizar")
    async with db.get_conn() as conn:
        sets = ", ".join(f"{k}=?" for k in campos)
        await conn.execute(f"UPDATE fuentes SET {sets} WHERE id=?",
                           list(campos.values()) + [fid])
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM fuentes WHERE id=?", (fid,))
    return row


@app.delete("/fuentes/{fid}")
async def borrar_fuente(fid: int):
    async with db.get_conn() as conn:
        await conn.execute("DELETE FROM fuentes WHERE id=?", (fid,))
        await conn.commit()
    return {"ok": True}


@app.post("/fuentes/sugerir")
async def sugerir_fuentes():
    """Genera la pirámide de fuentes a partir del mapa de temáticas."""
    async with db.get_conn() as conn:
        tematicas = await fetch_all(conn, "SELECT * FROM tematicas")
        if not tematicas:
            # autogenerar el mapa si está vacío
            await generar_tematicas()
            tematicas = await fetch_all(conn, "SELECT * FROM tematicas")
        nuevas = fuentes_gen.construir_fuentes(tematicas)
        existentes = await fetch_all(conn, "SELECT url FROM fuentes")
        urls = {e["url"] for e in existentes}
        creadas = 0
        for f in nuevas:
            if f["url"] in urls:
                continue
            await conn.execute(
                """INSERT INTO fuentes
                   (nombre, url, tipo_acceso, cuadrante_steep, categoria,
                    tematica_id, activa, calidad, senales_generadas, fecha_agregada)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (f["nombre"], f["url"], f["tipo_acceso"], f["cuadrante_steep"],
                 f["categoria"], f["tematica_id"], f["activa"], f["calidad"],
                 f["senales_generadas"], f["fecha_agregada"]))
            urls.add(f["url"])
            creadas += 1
        await conn.commit()
        total = await fetch_all(conn, "SELECT id FROM fuentes")
    return {"creadas": creadas, "total": len(total)}


# ===========================================================================
# SCRAPER
# ===========================================================================
@app.post("/scraper/iniciar")
async def iniciar_scraper(req: Request):
    if scraper.ESTADO.corriendo:
        raise HTTPException(409, "El scraper ya está corriendo")
    body = {}
    try:
        body = await req.json()
    except Exception:
        pass
    solo_ids = body.get("fuente_ids")
    score_fn = scoring.score_senal_en_conn if SCORING_OK else None
    scraper.ESTADO.task = asyncio.create_task(
        scraper.correr_scraper(solo_ids=solo_ids, score_fn=score_fn))
    return {"ok": True, "estado": "iniciado"}


@app.post("/scraper/detener")
async def detener_scraper():
    scraper.ESTADO.detener = True
    return {"ok": True, "estado": "deteniendo"}


@app.get("/scraper/estado")
async def estado_scraper():
    return await scraper.estado_actual()


# ===========================================================================
# SEÑALES
# ===========================================================================
@app.get("/senales")
async def listar_senales(cuadrante: str = None, calidad: str = None,
                         relevante: str = None, q: str = None,
                         score_min: int = None, score_max: int = None,
                         fuente_id: int = None, cluster_id: int = None):
    where, params = [], []
    if cuadrante:
        where.append("cuadrante_steep = ?"); params.append(cuadrante)
    if calidad:
        where.append("calidad_senal = ?"); params.append(calidad)
    if relevante is not None:
        where.append("es_relevante = ?"); params.append(1 if relevante in ("1", "true", "True") else 0)
    if fuente_id:
        where.append("fuente_id = ?"); params.append(fuente_id)
    if cluster_id:
        where.append("cluster_id = ?"); params.append(cluster_id)
    if q:
        where.append("(titulo LIKE ? OR cita_relevancia LIKE ?)")
        params += [f"%{q}%", f"%{q}%"]
    if score_min is not None:
        where.append("COALESCE(score_calidad,0) >= ?"); params.append(score_min)
    if score_max is not None:
        where.append("COALESCE(score_calidad,100) <= ?"); params.append(score_max)
    sql = "SELECT * FROM senales"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC"
    async with db.get_conn() as conn:
        rows = await fetch_all(conn, sql, params)
        # contadores
        tot = await fetch_one(conn, "SELECT "
                              "SUM(es_relevante=1) r, SUM(es_relevante=0) nr, COUNT(*) t "
                              "FROM senales")
    return {"senales": rows, "contadores": tot}


@app.post("/senales")
async def crear_senal(req: Request):
    b = await req.json()
    if not b.get("url_directa") or not b.get("cita_relevancia"):
        raise HTTPException(400, "url_directa y cita_relevancia son obligatorios")
    async with db.get_conn() as conn:
        cur = await conn.execute(
            """INSERT INTO senales
               (fuente_id, titulo, url_directa, fecha_origen, cita_relevancia,
                por_que_es_senal, cuadrante_steep, driver_hipotesis,
                calidad_senal, es_relevante, fecha_scrapeada)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (b.get("fuente_id"), b.get("titulo", "(sin título)"),
             b.get("url_directa"), b.get("fecha_origen"), b.get("cita_relevancia"),
             b.get("por_que_es_senal"), b.get("cuadrante_steep"),
             b.get("driver_hipotesis"), b.get("calidad_senal", "sin evaluar"),
             1, _now()))
        await conn.commit()
        sid = cur.lastrowid
        if SCORING_OK:
            try:
                await scoring.score_senal_en_conn(conn, sid)
            except Exception:
                pass
        row = await fetch_one(conn, "SELECT * FROM senales WHERE id=?", (sid,))
    return row


@app.patch("/senales/lote")
async def patch_lote(req: Request):
    b = await req.json()
    ids = b.get("ids", [])
    campos = {k: b[k] for k in ("cuadrante_steep", "driver_hipotesis",
                                "calidad_senal", "es_relevante", "cluster_id")
              if k in b}
    if not ids or not campos:
        raise HTTPException(400, "ids y al menos un campo requeridos")
    async with db.get_conn() as conn:
        sets = ", ".join(f"{k}=?" for k in campos)
        ph = ",".join("?" * len(ids))
        await conn.execute(f"UPDATE senales SET {sets} WHERE id IN ({ph})",
                           list(campos.values()) + ids)
        await conn.commit()
    return {"ok": True, "actualizadas": len(ids)}


@app.delete("/senales/lote")
async def delete_lote(req: Request):
    b = await req.json()
    ids = b.get("ids", [])
    if not ids:
        raise HTTPException(400, "ids requeridos")
    async with db.get_conn() as conn:
        ph = ",".join("?" * len(ids))
        await conn.execute(f"DELETE FROM senales WHERE id IN ({ph})", ids)
        await conn.commit()
    return {"ok": True, "borradas": len(ids)}


@app.patch("/senales/{sid}")
async def editar_senal(sid: int, req: Request):
    b = await req.json()
    permitidos = ("titulo", "url_directa", "fecha_origen", "cita_relevancia",
                  "por_que_es_senal", "cuadrante_steep", "driver_hipotesis",
                  "calidad_senal", "es_relevante", "cluster_id", "tendencia_id")
    campos = {k: b[k] for k in permitidos if k in b}
    if not campos:
        raise HTTPException(400, "nada para actualizar")
    async with db.get_conn() as conn:
        sets = ", ".join(f"{k}=?" for k in campos)
        await conn.execute(f"UPDATE senales SET {sets} WHERE id=?",
                           list(campos.values()) + [sid])
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM senales WHERE id=?", (sid,))
    return row


@app.delete("/senales/{sid}")
async def borrar_senal(sid: int):
    async with db.get_conn() as conn:
        await conn.execute("DELETE FROM senales WHERE id=?", (sid,))
        await conn.commit()
    return {"ok": True}


# ===========================================================================
# SCORING (Etapa 6)
# ===========================================================================
@app.post("/senales/recalcular-scores")
async def recalcular_scores():
    if not SCORING_OK:
        raise HTTPException(503, "Scoring no disponible (falta stack ML)")
    async with db.get_conn() as conn:
        n = await scoring.recalcular_todas(conn)
    return {"ok": True, "recalculadas": n}


@app.post("/senales/{sid}/score")
async def score_una(sid: int):
    if not SCORING_OK:
        raise HTTPException(503, "Scoring no disponible")
    async with db.get_conn() as conn:
        r = await scoring.score_senal_en_conn(conn, sid)
    return r or {}


@app.get("/senales/stats-calidad")
async def stats_calidad():
    async with db.get_conn() as conn:
        rows = await fetch_all(conn,
            "SELECT score_calidad FROM senales WHERE score_calidad IS NOT NULL")
    bins = {f"{i}-{i+9}": 0 for i in range(0, 100, 10)}
    for r in rows:
        b = min(90, (r["score_calidad"] // 10) * 10)
        bins[f"{b}-{b+9}"] += 1
    return {"histograma": bins, "total_con_score": len(rows)}


# ===========================================================================
# CLUSTERS (Etapa 5)
# ===========================================================================
@app.post("/clusters/generar")
async def clusters_generar(req: Request):
    if not CLUSTERING_OK:
        raise HTTPException(503, "Clustering no disponible (falta stack ML)")
    if clustering.ESTADO["corriendo"]:
        raise HTTPException(409, "Ya está corriendo")
    umbral = None
    try:
        body = await req.json()
        umbral = body.get("umbral")
    except Exception:
        pass

    async def _run():
        async with db.get_conn() as conn:
            await clustering.generar(conn, umbral=umbral)
    asyncio.create_task(_run())
    return {"ok": True, "estado": "iniciado"}


@app.get("/clusters/estado")
async def clusters_estado():
    if not CLUSTERING_OK:
        return {"corriendo": False, "disponible": False}
    return {**clustering.ESTADO, "disponible": True}


@app.get("/clusters/resumen-tematicas")
async def clusters_resumen_tematicas():
    async with db.get_conn() as conn:
        rows = await clustering.resumen_tematicas(conn) if CLUSTERING_OK else []
    return rows


@app.get("/clusters/mapa")
async def clusters_mapa():
    async with db.get_conn() as conn:
        rows = await fetch_all(conn, """
            SELECT s.id senal_id, c.x, c.y, s.cluster_id, s.titulo,
                   s.cuadrante_steep, s.score_calidad, s.url_directa
            FROM senales s JOIN senales_coords c ON s.id=c.senal_id""")
    return rows


@app.get("/clusters")
async def listar_clusters():
    async with db.get_conn() as conn:
        rows = await fetch_all(conn, """
            SELECT c.*, (SELECT COUNT(*) FROM senales s WHERE s.cluster_id=c.id) n_senales
            FROM clusters c ORDER BY c.es_emergente, n_senales DESC""")
    return rows


@app.get("/clusters/{cid}/senales")
async def cluster_senales(cid: int):
    async with db.get_conn() as conn:
        rows = await fetch_all(conn,
            "SELECT * FROM senales WHERE cluster_id=? ORDER BY score_calidad DESC", (cid,))
    return rows


@app.post("/clusters")
async def crear_cluster(req: Request):
    b = await req.json()
    async with db.get_conn() as conn:
        cur = await conn.execute(
            """INSERT INTO clusters (nombre, driver_candidato, descripcion,
               es_emergente, validado, fecha_creado) VALUES (?,?,?,?,?,?)""",
            (b.get("nombre", "Cluster manual"), b.get("driver_candidato"),
             b.get("descripcion"), 1, 0, _now()))
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM clusters WHERE id=?", (cur.lastrowid,))
    return row


@app.patch("/clusters/{cid}")
async def editar_cluster(cid: int, req: Request):
    b = await req.json()
    campos = {k: b[k] for k in ("nombre", "driver_candidato", "descripcion",
                                "validado") if k in b}
    if not campos:
        raise HTTPException(400, "nada para actualizar")
    async with db.get_conn() as conn:
        sets = ", ".join(f"{k}=?" for k in campos)
        await conn.execute(f"UPDATE clusters SET {sets} WHERE id=?",
                           list(campos.values()) + [cid])
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM clusters WHERE id=?", (cid,))
    return row


@app.patch("/senales/{sid}/cluster")
async def mover_senal_cluster(sid: int, req: Request):
    b = await req.json()
    async with db.get_conn() as conn:
        await conn.execute("UPDATE senales SET cluster_id=? WHERE id=?",
                           (b.get("cluster_id"), sid))
        await conn.commit()
    return {"ok": True}


# ===========================================================================
# RE-SCRAPING DIRIGIDO (Etapa 5b)
# ===========================================================================
@app.post("/scraper/re-scraping")
async def iniciar_rescraping(req: Request):
    if rescraping.ESTADO["corriendo"] or scraper.ESTADO.corriendo:
        raise HTTPException(409, "Ya hay un proceso de scraping corriendo")
    body = {}
    try:
        body = await req.json()
    except Exception:
        pass
    objetivo = body.get("objetivo_por_cuadrante", 100)
    max_it = body.get("max_iteraciones", 8)
    score_fn = scoring.score_senal_en_conn if SCORING_OK else None
    asyncio.create_task(rescraping.correr(objetivo, max_it, score_fn))
    return {"ok": True, "estado": "iniciado"}


@app.get("/scraper/re-scraping/estado")
async def estado_rescraping():
    return rescraping.ESTADO


# ===========================================================================
# TENDENCIAS
# ===========================================================================
@app.get("/tendencias")
async def listar_tendencias():
    async with db.get_conn() as conn:
        rows = await fetch_all(conn, "SELECT * FROM tendencias ORDER BY id DESC")
    return rows


@app.post("/tendencias")
async def crear_tendencia(req: Request):
    b = await req.json()
    async with db.get_conn() as conn:
        cur = await conn.execute(
            """INSERT INTO tendencias (nombre, driver, estado, horizonte, fuerza,
               cuadrante_steep, descripcion, bullets, cluster_id, impacto,
               incertidumbre, fecha_creada) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (b.get("nombre"), b.get("driver"), b.get("estado", "emergente"),
             b.get("horizonte", "H2"), b.get("fuerza", 1), b.get("cuadrante_steep"),
             b.get("descripcion"), json.dumps(b.get("bullets", [])),
             b.get("cluster_id"), b.get("impacto", 3), b.get("incertidumbre", 3), _now()))
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM tendencias WHERE id=?", (cur.lastrowid,))
    return row


@app.patch("/tendencias/{tid}")
async def editar_tendencia(tid: int, req: Request):
    b = await req.json()
    if "bullets" in b and isinstance(b["bullets"], list):
        b["bullets"] = json.dumps(b["bullets"])
    permitidos = ("nombre", "driver", "estado", "horizonte", "fuerza",
                  "cuadrante_steep", "descripcion", "bullets", "cluster_id",
                  "impacto", "incertidumbre")
    campos = {k: b[k] for k in permitidos if k in b}
    if not campos:
        raise HTTPException(400, "nada para actualizar")
    async with db.get_conn() as conn:
        sets = ", ".join(f"{k}=?" for k in campos)
        await conn.execute(f"UPDATE tendencias SET {sets} WHERE id=?",
                           list(campos.values()) + [tid])
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM tendencias WHERE id=?", (tid,))
    return row


@app.delete("/tendencias/{tid}")
async def borrar_tendencia(tid: int):
    async with db.get_conn() as conn:
        await conn.execute("DELETE FROM tendencias WHERE id=?", (tid,))
        await conn.commit()
    return {"ok": True}


@app.post("/tendencias/profundizar")
async def tendencias_profundizar(req: Request):
    """
    Genera un sub-mapa temático + fuentes dirigidas para las tendencias elegidas,
    y opcionalmente lanza el scraper sobre esas fuentes nuevas.
    Body: { tendencia_ids: [...], scrapear: bool }
    """
    body = await req.json()
    ids = body.get("tendencia_ids", [])
    if not ids:
        raise HTTPException(400, "tendencia_ids requerido")
    async with db.get_conn() as conn:
        resultado = await profundizar_mod.profundizar(conn, ids)
    scrape_iniciado = False
    fuente_ids = resultado["fuente_ids"]
    if body.get("scrapear") and fuente_ids:
        if scraper.ESTADO.corriendo:
            raise HTTPException(409, "El scraper ya está corriendo; esperá a que termine")
        score_fn = scoring.score_senal_en_conn if SCORING_OK else None
        scraper.ESTADO.task = asyncio.create_task(
            scraper.correr_scraper(solo_ids=fuente_ids, score_fn=score_fn))
        scrape_iniciado = True
    return {**resultado, "scrape_iniciado": scrape_iniciado,
            "total_fuentes": len(fuente_ids)}


@app.post("/tendencias/desde-clusters")
async def tendencias_desde_clusters():
    """Bootstrap: crea una tendencia por cada cluster validado que no tenga una."""
    creadas = 0
    async with db.get_conn() as conn:
        # limpiar tendencias huérfanas (cluster borrado al re-clusterizar)
        await conn.execute("""DELETE FROM tendencias WHERE cluster_id IS NOT NULL
            AND cluster_id NOT IN (SELECT id FROM clusters)""")
        await conn.commit()
        clusters = await fetch_all(conn,
            "SELECT * FROM clusters WHERE nombre != 'Sin clasificar'")
        existentes = await fetch_all(conn, "SELECT cluster_id FROM tendencias WHERE cluster_id IS NOT NULL")
        ya = {e["cluster_id"] for e in existentes}
        for c in clusters:
            if c["id"] in ya:
                continue
            # cuadrante predominante del cluster
            q = await fetch_one(conn, """SELECT cuadrante_steep, COUNT(*) n FROM senales
                WHERE cluster_id=? GROUP BY cuadrante_steep ORDER BY n DESC LIMIT 1""",
                (c["id"],))
            n = await fetch_one(conn, "SELECT COUNT(*) n FROM senales WHERE cluster_id=?", (c["id"],))
            estado = "emergente" if c["es_emergente"] else "consolidada"
            horizonte = "H3" if c["es_emergente"] else "H2"
            await conn.execute(
                """INSERT INTO tendencias (nombre, driver, estado, horizonte, fuerza,
                   cuadrante_steep, descripcion, bullets, cluster_id, impacto,
                   incertidumbre, fecha_creada) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (c["nombre"], c.get("driver_candidato"), estado, horizonte,
                 (n["n"] or 1), q["cuadrante_steep"] if q else None,
                 c.get("descripcion"), json.dumps([]), c["id"], 3, 3, _now()))
            creadas += 1
        await conn.commit()
    return {"creadas": creadas}


# ===========================================================================
# CLA y ESCENARIOS 2x2 (Visualizaciones 11 y 12)
# ===========================================================================
@app.get("/cla/{cid}")
async def get_cla(cid: int):
    async with db.get_conn() as conn:
        row = await fetch_one(conn, "SELECT * FROM cla_analisis WHERE cluster_id=?", (cid,))
    return row or {"cluster_id": cid, "vision_mundo": "", "mito_metafora": ""}


@app.post("/cla/{cid}")
async def set_cla(cid: int, req: Request):
    b = await req.json()
    async with db.get_conn() as conn:
        await conn.execute(
            """INSERT INTO cla_analisis (cluster_id, vision_mundo, mito_metafora)
               VALUES (?,?,?) ON CONFLICT(cluster_id) DO UPDATE SET
               vision_mundo=excluded.vision_mundo, mito_metafora=excluded.mito_metafora""",
            (cid, b.get("vision_mundo", ""), b.get("mito_metafora", "")))
        await conn.commit()
    return {"ok": True}


@app.get("/escenarios")
async def get_escenarios():
    async with db.get_conn() as conn:
        rows = await fetch_all(conn, "SELECT * FROM escenarios_2x2 ORDER BY id DESC")
    return rows


@app.post("/escenarios")
async def set_escenario(req: Request):
    b = await req.json()
    async with db.get_conn() as conn:
        cur = await conn.execute(
            """INSERT INTO escenarios_2x2 (driver_x_id, driver_y_id, nombre_q1,
               nombre_q2, nombre_q3, nombre_q4) VALUES (?,?,?,?,?,?)""",
            (b.get("driver_x_id"), b.get("driver_y_id"), b.get("nombre_q1", ""),
             b.get("nombre_q2", ""), b.get("nombre_q3", ""), b.get("nombre_q4", "")))
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM escenarios_2x2 WHERE id=?", (cur.lastrowid,))
    return row


# ===========================================================================
# ESCENARIOS ESPECULATIVOS (tab Escenarios)
# ===========================================================================
_ESC_CAMPOS = ("nombre", "horizonte", "eje_x_label", "eje_x_pos", "eje_x_neg",
               "eje_y_label", "eje_y_pos", "eje_y_neg", "q1_nombre", "q1_texto",
               "q2_nombre", "q2_texto", "q3_nombre", "q3_texto", "q4_nombre", "q4_texto")


def _esc_parse(row):
    if not row:
        return row
    row["cluster_ids"] = json.loads(row.get("cluster_ids") or "[]")
    row["senal_ids"] = json.loads(row.get("senal_ids") or "[]")
    return row


@app.get("/esc")
async def esc_list():
    async with db.get_conn() as conn:
        rows = await fetch_all(conn, "SELECT * FROM escenarios ORDER BY id DESC")
    return [_esc_parse(r) for r in rows]


@app.post("/esc")
async def esc_create(req: Request):
    b = await req.json()
    async with db.get_conn() as conn:
        cur = await conn.execute(
            """INSERT INTO escenarios (nombre, horizonte, eje_x_label, eje_x_pos,
               eje_x_neg, eje_y_label, eje_y_pos, eje_y_neg, cluster_ids, senal_ids,
               fecha_creada) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (b.get("nombre", "Escenario sin título"), b.get("horizonte", 10),
             b.get("eje_x_label", "Eje X"), b.get("eje_x_pos", ""), b.get("eje_x_neg", ""),
             b.get("eje_y_label", "Eje Y"), b.get("eje_y_pos", ""), b.get("eje_y_neg", ""),
             json.dumps(b.get("cluster_ids", [])), json.dumps(b.get("senal_ids", [])), _now()))
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM escenarios WHERE id=?", (cur.lastrowid,))
    return _esc_parse(row)


@app.post("/esc/placement")
async def esc_placement(req: Request):
    if not CLUSTERING_OK:
        raise HTTPException(503, "Placement no disponible (falta stack ML)")
    b = await req.json()
    axes = {"x_pos": b.get("eje_x_pos"), "x_neg": b.get("eje_x_neg"),
            "y_pos": b.get("eje_y_pos"), "y_neg": b.get("eje_y_neg")}
    async with db.get_conn() as conn:
        senales = await esc_mod.senales_de_seleccion(
            conn, b.get("cluster_ids", []), b.get("senal_ids", []))
    cuadrantes = esc_mod.placement(axes, senales)
    return {"cuadrantes": cuadrantes, "total": len(senales)}


@app.get("/esc/{eid}")
async def esc_get(eid: int):
    async with db.get_conn() as conn:
        row = await fetch_one(conn, "SELECT * FROM escenarios WHERE id=?", (eid,))
    if not row:
        raise HTTPException(404, "escenario no encontrado")
    return _esc_parse(row)


@app.patch("/esc/{eid}")
async def esc_patch(eid: int, req: Request):
    b = await req.json()
    campos = {k: b[k] for k in _ESC_CAMPOS if k in b}
    for k in ("cluster_ids", "senal_ids"):
        if k in b:
            campos[k] = json.dumps(b[k])
    if not campos:
        raise HTTPException(400, "nada para actualizar")
    async with db.get_conn() as conn:
        sets = ", ".join(f"{k}=?" for k in campos)
        await conn.execute(f"UPDATE escenarios SET {sets} WHERE id=?",
                           list(campos.values()) + [eid])
        await conn.commit()
        row = await fetch_one(conn, "SELECT * FROM escenarios WHERE id=?", (eid,))
    return _esc_parse(row)


@app.delete("/esc/{eid}")
async def esc_delete(eid: int):
    async with db.get_conn() as conn:
        await conn.execute("DELETE FROM escenarios WHERE id=?", (eid,))
        await conn.commit()
    return {"ok": True}


@app.post("/esc/{eid}/auto")
async def esc_auto(eid: int, req: Request):
    """
    Generación automática con LLM local: deriva los ejes desde las señales
    elegidas, ubica las señales en cuadrantes (embeddings) y redacta los 4
    escenarios. Guarda todo (editable después). Body opcional: {solo_ejes: bool}.
    """
    if not CLUSTERING_OK:
        raise HTTPException(503, "Placement no disponible (falta stack ML)")
    body = {}
    try:
        body = await req.json()
    except Exception:
        pass
    async with db.get_conn() as conn:
        esc = await fetch_one(conn, "SELECT * FROM escenarios WHERE id=?", (eid,))
        if not esc:
            raise HTTPException(404, "escenario no encontrado")
        cluster_ids = json.loads(esc.get("cluster_ids") or "[]")
        senal_ids = json.loads(esc.get("senal_ids") or "[]")
        senales = await esc_mod.senales_de_seleccion(conn, cluster_ids, senal_ids)
    if not senales:
        raise HTTPException(400, "Elegí al menos un cluster o señal antes de generar")

    horizonte = esc.get("horizonte") or 10
    try:
        ejes = await llm.sugerir_ejes(senales, fuentes_gen.TERRITORIO, horizonte)
    except llm.LLMError as e:
        raise HTTPException(502, str(e))
    except Exception as e:
        raise HTTPException(500, f"El modelo no devolvió ejes válidos: {e}")

    cuadrantes = esc_mod.placement(
        {"x_pos": ejes["eje_x_pos"], "x_neg": ejes["eje_x_neg"],
         "y_pos": ejes["eje_y_pos"], "y_neg": ejes["eje_y_neg"]}, senales)

    campos = dict(ejes)
    narrativas = {}
    if not body.get("solo_ejes"):
        try:
            narrativas = await llm.redactar_escenarios(
                ejes, cuadrantes, horizonte, fuentes_gen.TERRITORIO)
        except llm.LLMError as e:
            raise HTTPException(502, str(e))
        except Exception as e:
            raise HTTPException(500, f"El modelo no devolvió escenarios válidos: {e}")
        for q in ("q1", "q2", "q3", "q4"):
            campos[f"{q}_nombre"] = narrativas[q]["nombre"]
            campos[f"{q}_texto"] = narrativas[q]["texto"]

    async with db.get_conn() as conn:
        sets = ", ".join(f"{k}=?" for k in campos)
        await conn.execute(f"UPDATE escenarios SET {sets} WHERE id=?",
                           list(campos.values()) + [eid])
        await conn.commit()
        row = _esc_parse(await fetch_one(conn, "SELECT * FROM escenarios WHERE id=?", (eid,)))
    return {"escenario": row, "cuadrantes": cuadrantes, "total": len(senales),
            "modelo": llm.OLLAMA_MODEL}


# ===========================================================================
# VISUALIZACIONES — datos base
# ===========================================================================
@app.get("/visualizaciones/datos")
async def viz_datos():
    async with db.get_conn() as conn:
        senales = await fetch_all(conn, "SELECT * FROM senales WHERE es_relevante=1")
        clusters = await fetch_all(conn, """
            SELECT c.*, (SELECT COUNT(*) FROM senales s WHERE s.cluster_id=c.id) n_senales
            FROM clusters c""")
        tendencias = await fetch_all(conn, "SELECT * FROM tendencias")
        tematicas = await fetch_all(conn, "SELECT * FROM tematicas")
        coords = await fetch_all(conn, "SELECT * FROM senales_coords")
        fuentes = await fetch_all(conn, "SELECT id, nombre FROM fuentes")
    return {"senales": senales, "clusters": clusters, "tendencias": tendencias,
            "tematicas": tematicas, "senales_coords": coords, "fuentes": fuentes}


# ===========================================================================
# CAPACIDADES (qué tabs habilitar en el frontend)
# ===========================================================================
@app.get("/capacidades")
async def capacidades():
    return {"scoring": SCORING_OK, "clustering": CLUSTERING_OK,
            "territorio": fuentes_gen.TERRITORIO,
            "llm": await llm.disponible(), "llm_modelo": llm.OLLAMA_MODEL}


# ===========================================================================
# Static frontend
# ===========================================================================
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index():
    return FileResponse("static/index.html")
