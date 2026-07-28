"""
Profundización de tendencias.

Dada una o más tendencias, extrae los conceptos dominantes de sus señales,
genera un sub-mapa temático (núcleo/adyacente/periférico) enfocado en la
tendencia, y crea fuentes dirigidas (queries de Google News por concepto) para
volver a scrapear específicamente ese tema.
"""

import re
from datetime import datetime

import db
import fuentes_gen
from clustering import STOP, _norm

# Boilerplate de papers/webs + palabras ultra-genéricas que no sirven como
# concepto de búsqueda. Se suman a STOP para el filtrado.
ARTIFACT = set("""figure figures supplement supplementary table doi http https www
html pdf preprint medrxiv biorxiv arxiv author authors license licence copyright
funder grant permission reserved rights holder display preview available org com
article journal published publication volume issue pages editor correspondence
email orcid affiliation elsevier springer wiley international peer reviewed review
human model models study studies data results result analysis method methods
approach based using patients shown show showed found figure figure abstract
introduction discussion conclusion background material materials significant""".split())


def _limpiar_base(nombre):
    """Convierte 'Cells · Cell · Cancer' en una query limpia sin duplicados."""
    palabras = re.findall(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}", nombre)
    vistos, out = set(), []
    for w in palabras:
        wn = _norm(w)
        if wn not in vistos and wn not in ARTIFACT:
            vistos.add(wn)
            out.append(w)
    return " ".join(out) or nombre


def extraer_conceptos(senales, n=8):
    """Top conceptos (unigrams + bigrams) de las señales de la tendencia."""
    descartar = STOP | ARTIFACT
    uni, bi = {}, {}
    for s in senales:
        txt = _norm((s.get("titulo") or "") + " " + (s.get("cita_relevancia") or ""))
        palabras = [w for w in re.findall(r"[a-z]{4,}", txt) if w not in descartar]
        for w in palabras:
            uni[w] = uni.get(w, 0) + 1
        for a, b in zip(palabras, palabras[1:]):
            if a == b:          # descartar bigrams de palabra repetida
                continue
            bi[a + " " + b] = bi.get(a + " " + b, 0) + 1
    conceptos = []
    # bigrams frecuentes primero (más específicos)
    for c, cnt in sorted(bi.items(), key=lambda x: -x[1]):
        if cnt >= 2 and len(conceptos) < n // 2:
            conceptos.append(c)
    # completar con unigrams frecuentes no contenidos en los bigrams
    ya = " ".join(conceptos)
    for c, cnt in sorted(uni.items(), key=lambda x: -x[1]):
        if len(conceptos) >= n:
            break
        if c not in ya and cnt >= 2:
            conceptos.append(c)
    return conceptos[:n]


async def profundizar(conn, tendencia_ids):
    """
    Crea sub-temáticas y fuentes dirigidas para las tendencias indicadas.
    Devuelve {resumen: [...], fuente_ids: [...]}.
    """
    conn.row_factory = db.row_to_dict
    fecha = datetime.now().isoformat(timespec="seconds")

    cur = await conn.execute("SELECT nombre FROM tematicas")
    tem_existentes = {r["nombre"] for r in await cur.fetchall()}
    cur = await conn.execute("SELECT url FROM fuentes")
    urls = {r["url"] for r in await cur.fetchall()}

    resumen = []
    nuevas_fuente_ids = []

    for tid in tendencia_ids:
        cur = await conn.execute("SELECT * FROM tendencias WHERE id=?", (tid,))
        t = await cur.fetchone()
        if not t:
            continue

        senales = []
        if t.get("cluster_id"):
            cur = await conn.execute(
                "SELECT * FROM senales WHERE cluster_id=?", (t["cluster_id"],))
            senales = await cur.fetchall()
        conceptos = extraer_conceptos(senales, 8)
        steep = t.get("cuadrante_steep")
        base = t["nombre"]

        # --- sub-mapa temático (núcleo = la tendencia; conceptos = ady/perif) ---
        plan = [(f"↳ {base}", "nucleo",
                 f"Profundización de la tendencia '{base}' (driver: {t.get('driver') or '—'})")]
        for i, c in enumerate(conceptos):
            nivel = "adyacente" if i < 4 else "periferico"
            plan.append((f"↳ {base} · {c}", nivel, f"Sub-tema de '{base}'"))

        tem_ids, tem_creadas = [], 0
        for nombre, nivel, desc in plan:
            if nombre in tem_existentes:
                cur = await conn.execute("SELECT id FROM tematicas WHERE nombre=?", (nombre,))
                r = await cur.fetchone()
                tem_ids.append(r["id"])
                continue
            cur = await conn.execute(
                "INSERT INTO tematicas (nombre, nivel, descripcion) VALUES (?,?,?)",
                (nombre, nivel, desc))
            tem_existentes.add(nombre)
            tem_ids.append(cur.lastrowid)
            tem_creadas += 1

        # --- fuentes dirigidas: Google News por concepto (ES + EN) ---
        f_creadas = 0
        base_q = _limpiar_base(base)   # query limpia sin "·" ni duplicados
        queries = [base_q] + [f"{base_q} {c}" for c in conceptos[:6]]
        tem_id_nucleo = tem_ids[0] if tem_ids else None
        for q in queries:
            for hl in ("es", "en-US"):
                url = fuentes_gen._gnews_rss(q, hl=hl)
                if url in urls:
                    continue
                cur = await conn.execute(
                    """INSERT INTO fuentes
                       (nombre, url, tipo_acceso, cuadrante_steep, categoria,
                        tematica_id, activa, calidad, senales_generadas, fecha_agregada)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (f"Google News · {q[:40]} [{hl[:2]}]", url, "api_google_news",
                     steep, "alta_frecuencia", tem_id_nucleo, 1, "sin evaluar", 0, fecha))
                urls.add(url)
                nuevas_fuente_ids.append(cur.lastrowid)
                f_creadas += 1

        resumen.append({
            "tendencia": base, "conceptos": conceptos,
            "tematicas_creadas": tem_creadas, "fuentes_creadas": f_creadas,
        })

    await conn.commit()
    return {"resumen": resumen, "fuente_ids": nuevas_fuente_ids}
