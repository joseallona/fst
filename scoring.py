"""
Scoring programático de calidad de señales — Etapa 6.

No usa Claude ni APIs externas: solo embeddings (ya disponibles) y reglas.
Tres dimensiones → score 0-100:
  - Relevancia semántica (0-40): coseno del embedding de la señal con el
    embedding del territorio (= promedio de temáticas de nivel 'nucleo').
  - Especificidad (0-40): largo de título, largo de cita, datos cuantitativos.
  - Verificabilidad (0-20): URL directa (no homepage), fecha válida, fuente útil.
"""

import re
from datetime import datetime

import db
import embeddings

# Cache del embedding del territorio (promedio de temáticas núcleo).
_TERRITORIO_EMB = None


def reset_territorio():
    global _TERRITORIO_EMB
    _TERRITORIO_EMB = None


async def territorio_embedding(conn):
    global _TERRITORIO_EMB
    if _TERRITORIO_EMB is not None:
        return _TERRITORIO_EMB
    conn.row_factory = db.row_to_dict
    cur = await conn.execute("SELECT nombre, descripcion FROM tematicas WHERE nivel='nucleo'")
    nucleo = await cur.fetchall()
    if not nucleo:
        cur = await conn.execute("SELECT nombre, descripcion FROM tematicas")
        nucleo = await cur.fetchall()
    if not nucleo:
        import fuentes_gen
        textos = [fuentes_gen.TERRITORIO + " " + fuentes_gen.TERRITORIO_DESCRIPCION]
    else:
        textos = [(t["nombre"] or "") + " " + (t["descripcion"] or "") for t in nucleo]
    embs = embeddings.embed(textos)
    _TERRITORIO_EMB = embs.mean(axis=0)
    return _TERRITORIO_EMB


def es_homepage(url):
    if not url:
        return True
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        return p.path.strip("/") in ("", "index.html", "home")
    except Exception:
        return False


def es_fecha_valida(fecha):
    if not fecha:
        return False
    s = str(fecha)
    if re.search(r"\d{4}-\d{2}-\d{2}", s):
        return True
    for fmt in ("%a, %d %b %Y", "%d %b %Y", "%Y/%m/%d"):
        try:
            datetime.strptime(s[:len(fmt) + 5].strip(), fmt)
            return True
        except Exception:
            continue
    return bool(re.search(r"\b(19|20)\d{2}\b", s))


def score_especificidad(titulo, cita):
    pts = 0
    titulo = titulo or ""
    cita = cita or ""
    palabras_titulo = len(titulo.split())
    if palabras_titulo >= 8:
        pts += 15
    elif palabras_titulo >= 5:
        pts += 8
    elif palabras_titulo >= 4:
        pts += 3
    palabras_cita = len(cita.split())
    if palabras_cita >= 200:
        pts += 15
    elif palabras_cita >= 100:
        pts += 8
    elif palabras_cita >= 80:
        pts += 3
    # datos cuantitativos: años, porcentajes, montos, decimales
    patrones = [r"\b\d{4}\b", r"\d+\s?[%％]", r"[$€£]\s?\d+", r"\d+[.,]\d+"]
    matches = sum(len(re.findall(p, cita)) for p in patrones)
    if matches >= 3:
        pts += 10
    elif matches >= 1:
        pts += 5
    return min(pts, 40), palabras_titulo, palabras_cita, matches


def score_verificabilidad(url, fecha, fuente_calidad):
    pts = 0
    if url and not es_homepage(url):
        pts += 8
    if fecha and es_fecha_valida(fecha):
        pts += 7
    if fuente_calidad == "útil":
        pts += 5
    return pts


def score_senal(senal, fuente_calidad, territorio_emb):
    """Calcula los 4 scores + texto de razón para una señal (dict)."""
    titulo = senal.get("titulo") or ""
    cita = senal.get("cita_relevancia") or ""

    # Dimensión 1 — relevancia semántica
    emb = embeddings.embed((titulo + " " + cita)[:2000])[0]
    similitud = embeddings.coseno(emb, territorio_emb)
    similitud = max(0.0, similitud)
    rel = round(similitud * 40)
    razon = f"Relevancia: {similitud:.2f} con el territorio ({rel}/40)"

    # Dimensión 2 — especificidad
    esp, pt, pc, matches = score_especificidad(titulo, cita)
    razon += (f"\nEspecificidad: título {pt} palabras, cita {pc} palabras, "
              f"{matches} datos ({esp}/40)")

    # Dimensión 3 — verificabilidad
    ver = score_verificabilidad(senal.get("url_directa"),
                                senal.get("fecha_origen"), fuente_calidad)
    razon += (f"\nVerificabilidad: URL directa "
              f"{'✓' if senal.get('url_directa') and not es_homepage(senal.get('url_directa')) else '✗'}, "
              f"fecha {'✓' if es_fecha_valida(senal.get('fecha_origen')) else '✗'}, "
              f"fuente {fuente_calidad or 'sin evaluar'} ({ver}/20)")

    total = rel + esp + ver
    calidad = "alta" if total >= 70 else "media" if total >= 40 else "baja"
    razon += f"\nScore total: {total}/100 — {calidad.capitalize()} calidad"

    return {
        "score_calidad": total, "score_relevancia": rel,
        "score_especificidad": esp, "score_verificabilidad": ver,
        "calidad_senal": calidad, "razon_score": razon,
    }


async def score_senal_en_conn(conn, senal_id):
    """Carga la señal y su fuente, calcula scores y persiste."""
    conn.row_factory = db.row_to_dict
    cur = await conn.execute("SELECT * FROM senales WHERE id=?", (senal_id,))
    senal = await cur.fetchone()
    if not senal:
        return None
    fuente_calidad = None
    if senal.get("fuente_id"):
        cur = await conn.execute("SELECT calidad FROM fuentes WHERE id=?",
                                 (senal["fuente_id"],))
        f = await cur.fetchone()
        fuente_calidad = f["calidad"] if f else None
    terr = await territorio_embedding(conn)
    r = score_senal(senal, fuente_calidad, terr)
    await conn.execute(
        """UPDATE senales SET score_calidad=?, score_relevancia=?,
           score_especificidad=?, score_verificabilidad=?, razon_score=?,
           calidad_senal=? WHERE id=?""",
        (r["score_calidad"], r["score_relevancia"], r["score_especificidad"],
         r["score_verificabilidad"], r["razon_score"], r["calidad_senal"], senal_id))
    await conn.commit()
    return r


async def recalcular_todas(conn):
    reset_territorio()
    conn.row_factory = db.row_to_dict
    cur = await conn.execute("SELECT id FROM senales")
    ids = [r["id"] for r in await cur.fetchall()]
    terr = await territorio_embedding(conn)
    for sid in ids:
        await score_senal_en_conn(conn, sid)
    return len(ids)
