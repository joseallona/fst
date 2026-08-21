"""
Scraper de señales — Etapa 2 de la guía.

Lógica en dos fases:
  FASE 1 — recolección de URLs individuales de contenido (no la URL de la fuente).
  FASE 2 — entrar a cada URL, leer el contenido real, evaluar relevancia para el
           territorio y extraer una cita textual literal (mínimo 80 palabras).

La evaluación de relevancia NO usa ML: cuenta cuántos conceptos del mapa de
temáticas aparecen en el texto. >= 2 conceptos → es_relevante = 1.

El job corre en background; se puede detener en cualquier momento. El estado se
persiste en la tabla scraper_jobs y se refleja por capa (alta/media/baja).
"""

import asyncio
import json
import re
import unicodedata
from datetime import datetime

import feedparser
import httpx
from bs4 import BeautifulSoup

import db
import llm

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

TITULOS_GENERICOS = {
    "news", "search", "results", "home", "publications", "research",
    "noticias", "publicaciones", "inicio", "buscar", "resultados",
}

# Palabras de URL que indican una página individual de contenido (fuentes html).
PATRONES_URL_CONTENIDO = [
    "/articulo/", "/article/", "/noticia/", "/news/", "/post/",
    "/publicacion/", "/publication/", "/report/", "/documento/", "/paper/",
    "/release/", "/evento/", "/comunicado/", "/resolucion/", "/decreto/",
    "/story/", "/stories/", "/blog/", "/p/", "/2023/", "/2024/", "/2025/", "/2026/",
]

# ---------------------------------------------------------------------------
# Estado de control en memoria (para poder detener el job).
# ---------------------------------------------------------------------------
class EstadoScraper:
    def __init__(self):
        self.corriendo = False
        self.detener = False
        self.job_id = None
        self.capa_actual = None
        self.task = None


ESTADO = EstadoScraper()


def _norm(texto):
    """minúsculas sin acentos."""
    if not texto:
        return ""
    t = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def construir_conceptos(tematicas):
    """
    A partir de las temáticas del mapa, construye un set de conceptos (tokens
    significativos) para medir relevancia. Devuelve lista de (concepto_norm).
    """
    STOP = {
        "de", "la", "el", "los", "las", "del", "y", "en", "con", "para", "por",
        "un", "una", "su", "al", "se", "que", "the", "of", "and", "to", "in",
        "a", "su", "como", "mas", "o", "e",
    }
    conceptos = set()
    for t in tematicas:
        texto = _norm((t.get("nombre") or "") + " " + (t.get("descripcion") or ""))
        for palabra in re.findall(r"[a-z]{4,}", texto):
            if palabra not in STOP:
                conceptos.add(palabra)
    return conceptos


def _es_titulo_generico(titulo):
    if not titulo:
        return True
    limpio = _norm(titulo).strip()
    palabras = limpio.split()
    if len(palabras) < 4:
        return True
    if limpio in TITULOS_GENERICOS:
        return True
    if all(p in TITULOS_GENERICOS for p in palabras):
        return True
    return False


def _es_homepage(url):
    if not url:
        return True
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        path = p.path.strip("/")
        return path == "" or path in ("index.html", "home")
    except Exception:
        return False


def _fecha_de_entry(entry):
    for key in ("published", "updated", "pubDate"):
        val = entry.get(key)
        if val:
            return val
    if entry.get("published_parsed"):
        try:
            return datetime(*entry.published_parsed[:6]).isoformat()
        except Exception:
            pass
    return None


# ---------------------------------------------------------------------------
# FASE 1 — recolección de URLs individuales por fuente.
# ---------------------------------------------------------------------------
async def recolectar_urls(cliente, fuente):
    """Devuelve lista de dicts {url, titulo, fecha} de items individuales."""
    tipo = fuente["tipo_acceso"]
    items = []
    feed_url = fuente["url"]

    if tipo in ("rss", "api_google_news"):
        try:
            r = await cliente.get(feed_url, timeout=20.0,
                                  headers={"User-Agent": USER_AGENT})
            parsed = feedparser.parse(r.content)
        except Exception:
            try:
                parsed = feedparser.parse(feed_url)
            except Exception:
                return items
        for entry in parsed.entries:
            link = entry.get("link")
            if not link:
                continue
            # link == url del feed → feed mal formado, descartar
            if link.rstrip("/") == feed_url.rstrip("/"):
                continue
            titulo = (entry.get("title") or "").strip()
            if tipo == "api_google_news" and _es_titulo_generico(titulo):
                continue
            items.append({"url": link, "titulo": titulo, "fecha": _fecha_de_entry(entry)})

    elif tipo == "html":
        try:
            r = await cliente.get(feed_url, timeout=20.0,
                                  headers={"User-Agent": USER_AGENT})
            soup = BeautifulSoup(r.text, "html.parser")
        except Exception:
            return items
        from urllib.parse import urljoin
        base = feed_url
        vistos = set()
        for a in soup.find_all("a", href=True):
            href = urljoin(base, a["href"])
            if href == feed_url or href in vistos:
                continue
            low = href.lower()
            if any(pat in low for pat in PATRONES_URL_CONTENIDO):
                vistos.add(href)
                items.append({"url": href, "titulo": (a.get_text() or "").strip(),
                              "fecha": None})
            if len(items) >= 40:
                break

    return items


# ---------------------------------------------------------------------------
# FASE 2 — lectura y evaluación de cada URL individual.
# ---------------------------------------------------------------------------
def _extraer_contenido(soup):
    """Devuelve (titulo, lista_de_parrafos) del contenido principal."""
    contenedor = None
    for selector in ["article", "main", "[role='main']", ".content", "#content"]:
        contenedor = soup.select_one(selector)
        if contenedor:
            break
    if contenedor is None:
        contenedor = soup.body or soup

    # quitar ruido
    for tag in contenedor.select("nav, footer, aside, .sidebar, .nav, script, style"):
        tag.decompose()

    parrafos = [p.get_text(" ", strip=True) for p in contenedor.find_all("p")]
    parrafos = [p for p in parrafos if len(p.split()) >= 5]

    # título: h1 del contenido, si no <title>
    h1 = contenedor.find("h1") or soup.find("h1")
    titulo = h1.get_text(" ", strip=True) if h1 else None
    if not titulo and soup.title:
        titulo = soup.title.get_text(strip=True)
    return titulo, parrafos


def _extraer_fecha(soup):
    meta = soup.find("meta", attrs={"property": "article:published_time"})
    if meta and meta.get("content"):
        return meta["content"]
    t = soup.find("time")
    if t and t.get("datetime"):
        return t["datetime"]
    for sel in [".date", ".fecha", ".published"]:
        el = soup.select_one(sel)
        if el:
            return el.get_text(strip=True)
    return None


def _contar_conceptos(texto, conceptos):
    tn = _norm(texto)
    encontrados = {c for c in conceptos if c in tn}
    return encontrados


def _elegir_cita(parrafos, conceptos, minimo=80):
    """
    Elige el fragmento literal más denso en conceptos relevantes, con >= 80
    palabras. Si un párrafo solo no llega, concatena consecutivos.
    """
    if not parrafos:
        return None
    # puntaje de cada párrafo = nº de conceptos distintos
    mejor_idx, mejor_score = 0, -1
    for i, p in enumerate(parrafos):
        score = len(_contar_conceptos(p, conceptos))
        if score > mejor_score:
            mejor_idx, mejor_score = i, score
    # construir desde mejor_idx acumulando hasta >= minimo palabras
    acum = []
    palabras = 0
    j = mejor_idx
    while j < len(parrafos) and palabras < minimo:
        acum.append(parrafos[j])
        palabras += len(parrafos[j].split())
        j += 1
    cita = " ".join(acum).strip()
    # si todavía corto, completar hacia adelante desde el principio
    if len(cita.split()) < minimo:
        cita = " ".join(parrafos).strip()
    return cita if cita else None


async def evaluar_url(cliente, item, conceptos):
    """
    Entra a la URL, extrae contenido, evalúa relevancia y arma el registro señal.
    Devuelve (registro|None, motivo_descarte|None). El juez de calidad (LLM) se
    aplica luego, en lote por fuente, dentro de correr_scraper.
    """
    url = item["url"]
    try:
        r = await cliente.get(url, timeout=15.0, headers={"User-Agent": USER_AGENT},
                              follow_redirects=True)
        if r.status_code in (403, 404) or r.status_code >= 500:
            return None, "sin acceso"
        html = r.text
    except Exception:
        return None, "sin acceso"

    if "paywall" in html.lower()[:5000] and len(html) < 2000:
        return None, "sin acceso"

    soup = BeautifulSoup(html, "html.parser")
    titulo, parrafos = _extraer_contenido(soup)

    total_palabras = sum(len(p.split()) for p in parrafos)
    if total_palabras < 100:
        return None, "contenido insuficiente"

    titulo = titulo or item.get("titulo")
    if _es_titulo_generico(titulo):
        return None, "titulo generico"

    fecha = _extraer_fecha(soup) or item.get("fecha")

    texto_completo = " ".join(parrafos)
    encontrados = _contar_conceptos((titulo or "") + " " + texto_completo, conceptos)
    es_relevante = 1 if len(encontrados) >= 2 else 0

    cita = _elegir_cita(parrafos, conceptos)
    if not cita or len(cita.split()) < 40:
        return None, "contenido insuficiente"

    registro = {
        "titulo": titulo.strip(),
        "url_directa": url,
        "fecha_origen": fecha,
        "cita_relevancia": cita,
        "es_relevante": es_relevante,
        "conceptos": sorted(encontrados),
    }
    return registro, None


async def _juzgar_lote(registros, steep, batch=6):
    """Juez de calidad en lote. Devuelve una lista de códigos alineada a
    `registros` ('' cuando el juez no opinó → se conserva el filtro por conceptos).
    Si un lote falla (el LLM devuelve JSON inválido), reintenta ítem por ítem."""
    codigos = [""] * len(registros)

    async def _run(chunk, base):
        """Juzga chunk y escribe en codigos[base:]; devuelve cuántos resolvió."""
        items = [{"n": k + 1, "titulo": r["titulo"], "cita": r["cita_relevancia"],
                  "steep": steep, "fecha": r.get("fecha_origen"), "tiene_url": True}
                 for k, r in enumerate(chunk)]
        res = await asyncio.wait_for(llm.juzgar_senales(items), timeout=90)
        by_n = {int(x["n"]): x for x in res
                if isinstance(x, dict) and str(x.get("n", "")).isdigit()}
        got = 0
        for k in range(len(chunk)):
            v = by_n.get(k + 1)
            if isinstance(v, dict):
                codigos[base + k] = (v.get("codigo") or "").upper().strip()
                got += 1
        return got

    for bi in range(0, len(registros), batch):
        chunk = registros[bi:bi + batch]
        try:
            got = await _run(chunk, bi)
        except Exception:
            got = 0
        if got == 0 and len(chunk) > 1:      # lote falló → reintento ítem por ítem
            for k, r in enumerate(chunk):
                try:
                    await _run([r], bi + k)
                except Exception:
                    pass
    return codigos


# ---------------------------------------------------------------------------
# Orquestación del job.
# ---------------------------------------------------------------------------
async def _cargar_fuentes_activas(conn, solo_ids=None):
    q = "SELECT * FROM fuentes WHERE activa = 1"
    params = []
    if solo_ids:
        q += f" AND id IN ({','.join('?' * len(solo_ids))})"
        params = solo_ids
    # orden: alta → media → baja
    q += (" ORDER BY CASE categoria WHEN 'alta_frecuencia' THEN 0 "
          "WHEN 'media_frecuencia' THEN 1 ELSE 2 END")
    conn.row_factory = db.row_to_dict
    cur = await conn.execute(q, params)
    return await cur.fetchall()


async def _cargar_conceptos(conn):
    conn.row_factory = db.row_to_dict
    cur = await conn.execute("SELECT * FROM tematicas")
    tematicas = await cur.fetchall()
    return construir_conceptos(tematicas)


async def _actualizar_job(conn, job_id, **campos):
    if not campos:
        return
    sets = ", ".join(f"{k} = ?" for k in campos)
    await conn.execute(f"UPDATE scraper_jobs SET {sets} WHERE id = ?",
                       list(campos.values()) + [job_id])
    await conn.commit()


async def correr_scraper(solo_ids=None, score_fn=None):
    """
    Tarea de background. score_fn opcional: callable(conn, senal_id) para scoring
    automático al insertar (Etapa 6). Si es None, no se puntúa.
    """
    ESTADO.corriendo = True
    ESTADO.detener = False
    async with db.get_conn() as conn:
        conn.row_factory = db.row_to_dict
        cur = await conn.execute(
            "INSERT INTO scraper_jobs (tipo, estado, iniciado_en) VALUES (?,?,?)",
            ("scraping", "corriendo", datetime.now().isoformat(timespec="seconds")))
        await conn.commit()
        job_id = cur.lastrowid
        ESTADO.job_id = job_id

        conceptos = await _cargar_conceptos(conn)
        fuentes = await _cargar_fuentes_activas(conn, solo_ids)
        await _actualizar_job(conn, job_id, fuentes_total=len(fuentes))
        judge_ok = await llm.disponible()   # juez de calidad en la puerta, si hay LLM

        encontrados = relevantes = descartados = duplicados = 0
        errores = []

        # URLs ya existentes para deduplicar
        cur = await conn.execute("SELECT url_directa FROM senales")
        existentes = {r["url_directa"] for r in await cur.fetchall()}

        async with httpx.AsyncClient(follow_redirects=True) as cliente:
            for idx, fuente in enumerate(fuentes):
                if ESTADO.detener:
                    break
                capa = fuente["categoria"]
                ESTADO.capa_actual = capa
                await _actualizar_job(conn, job_id, capa_actual=capa,
                                      fuentes_procesadas=idx)
                rel_en_fuente = 0
                try:
                    items = await recolectar_urls(cliente, fuente)
                except Exception as e:
                    errores.append(f"{fuente['nombre']}: recolección — {e}")
                    items = []

                if fuente["tipo_acceso"] == "html" and not items:
                    await conn.execute(
                        "UPDATE fuentes SET calidad = ? WHERE id = ?",
                        ("sin estructura navegable", fuente["id"]))
                    await conn.commit()

                # 1) extraer todos los items de la fuente (sin juzgar todavía)
                candidatos = []
                for item in items[:25]:  # límite por fuente para mantener el ritmo
                    if ESTADO.detener:
                        break
                    encontrados += 1
                    if item["url"] in existentes:
                        duplicados += 1
                        continue
                    try:
                        registro, motivo = await evaluar_url(cliente, item, conceptos)
                    except Exception as e:
                        registro, motivo = None, str(e)
                    if registro is None:
                        descartados += 1
                        continue
                    existentes.add(item["url"])
                    candidatos.append(registro)

                # 2) juez de calidad EN LOTE (si hay LLM): descarta en la puerta
                if judge_ok and candidatos:
                    codigos = await _juzgar_lote(candidatos, fuente.get("cuadrante_steep"))
                    admitidos = []
                    for reg, cod in zip(candidatos, codigos):
                        if cod and cod != "OK":
                            descartados += 1            # rechazado por el juez
                        else:
                            if cod == "OK":
                                reg["juez_codigo"] = "OK"
                                reg["es_relevante"] = 1  # el juez manda sobre conceptos
                            admitidos.append(reg)
                    candidatos = admitidos

                # 3) insertar los que quedaron
                for registro in candidatos:
                    if registro["es_relevante"] != 1:
                        descartados += 1
                    senal_id = await _insertar_senal(conn, fuente, registro)
                    if registro["es_relevante"] == 1:
                        relevantes += 1
                        rel_en_fuente += 1
                    if score_fn:
                        try:
                            await score_fn(conn, senal_id)
                        except Exception:
                            pass
                await _actualizar_job(
                    conn, job_id, items_encontrados=encontrados,
                    items_relevantes=relevantes, items_descartados=descartados,
                    duplicados=duplicados, errores=json.dumps(errores[-50:]))

                # calidad de la fuente según rendimiento
                calidad = "útil" if rel_en_fuente >= 3 else (
                    "pobre" if rel_en_fuente == 0 else "regular")
                await conn.execute(
                    "UPDATE fuentes SET senales_generadas = senales_generadas + ?, "
                    "calidad = ? WHERE id = ?",
                    (rel_en_fuente, calidad, fuente["id"]))
                await conn.commit()

        estado_final = "detenido" if ESTADO.detener else "completado"
        await _actualizar_job(
            conn, job_id, estado=estado_final, capa_actual=None,
            fuentes_procesadas=len(fuentes),
            detenido_en=datetime.now().isoformat(timespec="seconds"),
            errores=json.dumps(errores[-50:]))

    ESTADO.corriendo = False
    ESTADO.capa_actual = None


async def _insertar_senal(conn, fuente, registro):
    cur = await conn.execute(
        """INSERT INTO senales
           (fuente_id, titulo, url_directa, fecha_origen, cita_relevancia,
            cuadrante_steep, es_relevante, calidad_senal, juez_codigo, fecha_scrapeada)
           VALUES (?,?,?,?,?,?,?,?,?,?)""",
        (fuente["id"], registro["titulo"], registro["url_directa"],
         registro["fecha_origen"], registro["cita_relevancia"],
         fuente.get("cuadrante_steep"), registro["es_relevante"],
         "sin evaluar", registro.get("juez_codigo"),
         datetime.now().isoformat(timespec="seconds")))
    await conn.commit()
    return cur.lastrowid


async def estado_actual():
    async with db.get_conn() as conn:
        conn.row_factory = db.row_to_dict
        cur = await conn.execute(
            "SELECT * FROM scraper_jobs ORDER BY id DESC LIMIT 1")
        job = await cur.fetchone()
    return {
        "corriendo": ESTADO.corriendo,
        "capa_actual": ESTADO.capa_actual,
        "job": job,
    }
