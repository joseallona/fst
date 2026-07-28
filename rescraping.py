"""
Re-scraping dirigido post-clusterización — Etapa 5b.

Lee el déficit de señales por cuadrante STEEP, genera fuentes nuevas dirigidas
(especialmente papers y fuentes no tecnológicas) y las scrapea hasta completar
100 señales por cuadrante o agotar max_iteraciones.
"""

import asyncio
from datetime import datetime
from urllib.parse import quote_plus

import db
import scraper

OBJETIVO_DEFAULT = 100
CUADRANTES = ["Social", "Tecnológico", "Económico", "Ecológico", "Político"]

ESTADO = {
    "corriendo": False, "iteracion_actual": 0, "max_iteraciones": 8,
    "progreso_por_cuadrante": {}, "fuentes_agregadas_esta_sesion": 0,
    "senales_nuevas_esta_sesion": 0, "log": [], "objetivo": OBJETIVO_DEFAULT,
}


def _gnews(q, hl="es"):
    return f"https://news.google.com/rss/search?q={quote_plus(q)}&hl={hl}"


def _arxiv(cat):
    return f"http://export.arxiv.org/rss/{cat}"


# Fuentes dirigidas por cuadrante (territorio: Longevity). URLs reales.
FUENTES_DIRIGIDAS = {
    "Social": [
        ("Google News · salud pública longevidad", _gnews("salud pública envejecimiento longevidad"), "api_google_news"),
        ("Google News · desigualdad longevidad", _gnews("desigualdad esperanza de vida"), "api_google_news"),
        ("Google News · cuidado adultos mayores", _gnews("cuidado adultos mayores dependencia"), "api_google_news"),
        ("medRxiv — todas", "http://connect.medrxiv.org/medrxiv_xml.php?subject=all", "rss"),
        ("The Conversation — Health", "https://theconversation.com/global/health/articles.atom", "rss"),
    ],
    "Tecnológico": [
        ("arXiv · q-bio.MN", _arxiv("q-bio.MN"), "rss"),
        ("arXiv · q-bio.CB", _arxiv("q-bio.CB"), "rss"),
        ("arXiv · cs.LG", _arxiv("cs.LG"), "rss"),
        ("bioRxiv — Cell Biology", "http://connect.biorxiv.org/biorxiv_xml.php?subject=cell_biology", "rss"),
        ("Google News · biotech longevidad", _gnews("biotech longevity aging", hl="en-US"), "api_google_news"),
    ],
    "Económico": [
        ("Google News · economía longevidad", _gnews("silver economy longevity market"), "api_google_news"),
        ("Google News · inversión longevity biotech", _gnews("longevity biotech funding investment", hl="en-US"), "api_google_news"),
        ("Nature Biotechnology", "https://www.nature.com/nbt.rss", "rss"),
        ("Endpoints News", "https://endpts.com/feed/", "rss"),
    ],
    "Ecológico": [
        ("Google News · salud planetaria envejecimiento", _gnews("planetary health aging environment", hl="en-US"), "api_google_news"),
        ("Google News · clima salud esperanza vida", _gnews("cambio climático salud esperanza de vida"), "api_google_news"),
        ("PLOS ONE", "https://journals.plos.org/plosone/feed/atom", "rss"),
        ("Guardian — Environment", "https://www.theguardian.com/environment/rss", "rss"),
    ],
    "Político": [
        ("Google News · política envejecimiento pensiones", _gnews("política envejecimiento pensiones regulación"), "api_google_news"),
        ("Google News · longevity policy regulation", _gnews("longevity policy regulation aging", hl="en-US"), "api_google_news"),
        ("Guardian — Society", "https://www.theguardian.com/society/rss", "rss"),
        ("The Conversation — Politics", "https://theconversation.com/global/politics/articles.atom", "rss"),
    ],
}


async def _conteo_por_cuadrante(conn):
    conn.row_factory = db.row_to_dict
    cur = await conn.execute(
        "SELECT cuadrante_steep q, COUNT(*) n FROM senales "
        "WHERE es_relevante=1 GROUP BY cuadrante_steep")
    rows = await cur.fetchall()
    conteo = {c: 0 for c in CUADRANTES}
    for r in rows:
        if r["q"] in conteo:
            conteo[r["q"]] = r["n"]
    return conteo


async def _agregar_fuentes_dirigidas(conn, cuadrantes_deficit):
    conn.row_factory = db.row_to_dict
    cur = await conn.execute("SELECT url FROM fuentes")
    existentes = {r["url"] for r in await cur.fetchall()}
    nuevas_ids = []
    fecha = datetime.now().isoformat(timespec="seconds")
    for q in cuadrantes_deficit:
        for nombre, url, tipo in FUENTES_DIRIGIDAS.get(q, []):
            if url in existentes:
                # reusar la fuente existente para re-scrapear
                cur = await conn.execute("SELECT id FROM fuentes WHERE url=?", (url,))
                r = await cur.fetchone()
                if r:
                    nuevas_ids.append(r["id"])
                continue
            cur = await conn.execute(
                """INSERT INTO fuentes (nombre, url, tipo_acceso, cuadrante_steep,
                   categoria, activa, calidad, senales_generadas, fecha_agregada)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (nombre, url, tipo, q, "alta_frecuencia", 1, "sin evaluar", 0, fecha))
            existentes.add(url)
            nuevas_ids.append(cur.lastrowid)
            ESTADO["fuentes_agregadas_esta_sesion"] += 1
            ESTADO["log"].append(f"[{q}] + fuente: {nombre}")
    return nuevas_ids


async def correr(objetivo=OBJETIVO_DEFAULT, max_iteraciones=8, score_fn=None):
    ESTADO.update(corriendo=True, iteracion_actual=0, max_iteraciones=max_iteraciones,
                  objetivo=objetivo, fuentes_agregadas_esta_sesion=0,
                  senales_nuevas_esta_sesion=0, log=[])
    async with db.get_conn() as conn:
        senales_antes_global = (await _total_senales(conn))
        for it in range(1, max_iteraciones + 1):
            ESTADO["iteracion_actual"] = it
            conteo = await _conteo_por_cuadrante(conn)
            ESTADO["progreso_por_cuadrante"] = {
                c: {"actual": conteo[c], "objetivo": objetivo,
                    "deficit": max(0, objetivo - conteo[c])} for c in CUADRANTES}
            deficit = [c for c in CUADRANTES if conteo[c] < objetivo]
            if not deficit:
                ESTADO["log"].append(f"Iteración {it}: todos los cuadrantes completos.")
                break
            ESTADO["log"].append(f"Iteración {it}: déficit en {', '.join(deficit)}")
            nuevas_ids = await _agregar_fuentes_dirigidas(conn, deficit)
            if not nuevas_ids:
                ESTADO["log"].append("Sin fuentes dirigidas nuevas disponibles.")
                break
            antes = await _total_senales(conn)
            # reutiliza el scraper principal sobre las fuentes dirigidas
            await scraper.correr_scraper(solo_ids=nuevas_ids, score_fn=score_fn)
            despues = await _total_senales(conn)
            ESTADO["senales_nuevas_esta_sesion"] += max(0, despues - antes)

        # estado final por cuadrante
        conteo = await _conteo_por_cuadrante(conn)
        ESTADO["progreso_por_cuadrante"] = {
            c: {"actual": conteo[c], "objetivo": objetivo,
                "deficit": max(0, objetivo - conteo[c])} for c in CUADRANTES}
        completados = sum(1 for c in CUADRANTES if conteo[c] >= objetivo)
        ESTADO["log"].append(
            f"FIN. Cuadrantes completados: {completados}/5. "
            f"Señales nuevas: {ESTADO['senales_nuevas_esta_sesion']}.")
        for c in CUADRANTES:
            if conteo[c] < objetivo:
                ESTADO["log"].append(
                    f"Cuadrante {c}: máximo alcanzado con fuentes disponibles = "
                    f"{conteo[c]}. Agregar fuentes manualmente para llegar a {objetivo}.")
    ESTADO["corriendo"] = False


async def _total_senales(conn):
    cur = await conn.execute("SELECT COUNT(*) FROM senales WHERE es_relevante=1")
    return (await cur.fetchone())[0]
