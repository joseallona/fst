"""
Generación del mapa de temáticas y de la pirámide de ~500 fuentes.

Territorio del proyecto: LONGEVITY (longevidad / extensión de la vida saludable).

El mapa de temáticas tiene tres niveles (núcleo / adyacente / periférico) y se usa
tanto para generar fuentes como, más adelante, para el clustering semántico.

La pirámide de fuentes se arma POR TEMÁTICA en tres capas de acceso:
  - alta_frecuencia : Google News RSS, arXiv, PubMed, Reddit  → 50-200 señales c/u
  - media_frecuencia: medios especializados con RSS propio     → 10-30 señales c/u
  - baja_frecuencia : instituciones /publicaciones, /news      → 2-15 señales c/u

Regla de oro: las fuentes de baja frecuencia NUNCA apuntan a la homepage; apuntan
a una subsección específica de contenido.
"""

from urllib.parse import quote_plus

TERRITORIO = "Longevity"

# Descripción del territorio, usada para scoring de relevancia y evaluación.
TERRITORIO_DESCRIPCION = (
    "Longevidad y extensión de la vida humana saludable: biología del "
    "envejecimiento, gerociencia, medicina regenerativa, biotecnología de la "
    "senescencia, salud y cuidado de adultos mayores, economía de la longevidad, "
    "políticas de envejecimiento poblacional y tecnologías para vivir más y mejor."
)

# ---------------------------------------------------------------------------
# MAPA DE TEMÁTICAS — hipótesis inicial del grupo sobre qué está relacionado.
# El grupo puede editar / agregar / eliminar desde la interfaz.
# ---------------------------------------------------------------------------

MAPA_TEMATICAS = {
    "nucleo": [
        ("Biología del envejecimiento",
         "Mecanismos celulares y moleculares del envejecimiento: senescencia, "
         "telómeros, epigenética, hallmarks of aging, gerociencia."),
        ("Medicina regenerativa y rejuvenecimiento",
         "Terapias celulares, reprogramación parcial, células madre, ingeniería "
         "de tejidos y órganos para revertir el daño del envejecimiento."),
        ("Longevidad clínica y geroterapéuticos",
         "Fármacos senolíticos, metformina, rapamicina, ensayos clínicos de "
         "intervenciones que extienden la vida saludable (healthspan)."),
        ("Economía y sociedad de la longevidad",
         "Impacto del envejecimiento poblacional en sistemas de pensiones, "
         "trabajo, cuidado y la nueva economía plateada (silver economy)."),
    ],
    "adyacente": [
        ("Salud pública y envejecimiento poblacional",
         "Demografía, esperanza de vida, enfermedades crónicas asociadas a la edad."),
        ("Nutrición, ayuno y metabolismo",
         "Restricción calórica, ayuno intermitente, dieta y su efecto en la longevidad."),
        ("Biotecnología y terapias génicas",
         "Edición genética (CRISPR), terapias génicas aplicadas al envejecimiento."),
        ("Inteligencia artificial en biomedicina",
         "Descubrimiento de fármacos, biomarcadores del envejecimiento, IA para drug discovery."),
        ("Wearables y monitoreo de la salud",
         "Sensores, relojes biológicos, cuantificación del yo, salud digital."),
        ("Neurociencia y deterioro cognitivo",
         "Alzheimer, demencias, salud cerebral y envejecimiento del cerebro."),
        ("Cuidado de adultos mayores y robótica asistencial",
         "Robots de cuidado, asistencia a la dependencia, tecnología para la tercera edad."),
        ("Medicina personalizada y diagnóstico precoz",
         "Genómica, multi-ómica, detección temprana de enfermedades por edad."),
        ("Sistemas de salud y financiamiento",
         "Seguros, costos sanitarios del envejecimiento, modelos de atención."),
        ("Bienestar, salud mental y propósito en la vejez",
         "Soledad, propósito vital, salud mental en adultos mayores, blue zones."),
        ("Microbioma y longevidad",
         "Microbiota intestinal, eje intestino-cerebro y su relación con el envejecimiento."),
    ],
    "periferico": [
        ("Criónica y preservación",
         "Preservación corporal, criopreservación, transhumanismo radical."),
        ("Identidad digital y datos biométricos",
         "Identidad y privacidad de datos de salud a lo largo de una vida más larga."),
        ("Ética y bioética de la extensión de la vida",
         "Equidad de acceso, desigualdad de longevidad, dilemas morales del antienvejecimiento."),
        ("Mercados financieros y riesgo de longevidad",
         "Anualidades, riesgo actuarial, inversión en biotech de longevidad."),
        ("Urbanismo y ciudades amigables con la edad",
         "Diseño urbano, movilidad y vivienda para una población que envejece."),
        ("Inteligencia artificial general y mente digital",
         "Mind uploading, copias digitales, IA y continuidad de la identidad."),
        ("Alimentación del futuro y agricultura celular",
         "Carne cultivada, proteínas alternativas, seguridad alimentaria a largo plazo."),
        ("Cambio climático y salud planetaria",
         "Efectos del ambiente y el clima sobre la salud y la esperanza de vida."),
        ("Espacio y medicina extrema",
         "Efectos del espacio en el envejecimiento, medicina en entornos extremos."),
        ("Religión, cultura y relación con la muerte",
         "Actitudes culturales hacia la muerte, el envejecimiento y la inmortalidad."),
        ("Deporte de élite y optimización del rendimiento",
         "Biohacking, optimización física, límites del rendimiento humano con la edad."),
    ],
}

# Mapeo orientativo temática -> cuadrante STEEP predominante (para baja frecuencia).
# STEEP: Social, Tecnológico, Económico, Ecológico, Político.
STEEP = ["Social", "Tecnológico", "Económico", "Ecológico", "Político"]


def _gnews_rss(query, hl="es"):
    return f"https://news.google.com/rss/search?q={quote_plus(query)}&hl={hl}"


def _reddit_rss(sub):
    return f"https://www.reddit.com/r/{sub}/.rss"


def _arxiv_rss(cat):
    return f"http://export.arxiv.org/rss/{cat}"


def _pubmed_rss(term):
    # PubMed permite RSS por término vía el formato de búsqueda de NCBI.
    return f"https://pubmed.ncbi.nlm.nih.gov/rss/search/{quote_plus(term)}/?limit=50"


# Queries de Google News por temática del núcleo (capa alta frecuencia).
QUERIES_NUCLEO = {
    "Biología del envejecimiento": [
        "biología del envejecimiento", "senescencia celular", "hallmarks of aging"],
    "Medicina regenerativa y rejuvenecimiento": [
        "medicina regenerativa", "reprogramación celular rejuvenecimiento", "células madre envejecimiento"],
    "Longevidad clínica y geroterapéuticos": [
        "fármacos senolíticos", "rapamicina longevidad", "ensayo clínico longevidad"],
    "Economía y sociedad de la longevidad": [
        "economía de la longevidad", "envejecimiento poblacional pensiones", "silver economy"],
}

# Ángulos para expandir queries de Google News por temática (capa alta frecuencia).
# Cada combinación temática+ángulo es un feed RSS de Google News real y auditable
# que devuelve artículos individuales con su URL de origen.
ANGULOS_ES = ["", "investigación", "estudio", "startup", "regulación", "inversión"]
ANGULOS_EN = ["research", "breakthrough", "startup"]

# Categorías arXiv relevantes (verificadas: las productivas para el territorio).
ARXIV_CATS = {
    "Inteligencia artificial en biomedicina": ["cs.LG", "cs.AI"],
    "Biología del envejecimiento": ["q-bio.MN", "q-bio.CB", "q-bio.TO"],
    "Biotecnología y terapias génicas": ["q-bio.GN"],
    "Microbioma y longevidad": ["q-bio.PE"],
    "Neurociencia y deterioro cognitivo": ["q-bio.NC"],
}

# Feeds académicos de artículo directo (capa alta frecuencia) — VERIFICADOS.
# Cada item linkea al paper/preprint individual; el scraper extrae abstract/cuerpo.
ACADEMICOS_RSS = [
    ("bioRxiv — todas las áreas", "http://connect.biorxiv.org/biorxiv_xml.php?subject=all", "Tecnológico"),
    ("bioRxiv — Cell Biology", "http://connect.biorxiv.org/biorxiv_xml.php?subject=cell_biology", "Tecnológico"),
    ("medRxiv — todas las áreas", "http://connect.medrxiv.org/medrxiv_xml.php?subject=all", "Social"),
    ("PLOS Biology", "https://journals.plos.org/plosbiology/feed/atom", "Tecnológico"),
    ("PLOS ONE", "https://journals.plos.org/plosone/feed/atom", "Tecnológico"),
    ("eLife — recientes", "https://elifesciences.org/rss/recent.xml", "Tecnológico"),
    ("Longevity.Technology", "https://longevity.technology/feed/", "Económico"),
]

# Subreddits con comunidad activa por temática.
SUBREDDITS = {
    "Biología del envejecimiento": ["longevity"],
    "Longevidad clínica y geroterapéuticos": ["longevity", "AgingBiology"],
    "Nutrición, ayuno y metabolismo": ["nutrition", "ScientificNutrition"],
    "Deporte de élite y optimización del rendimiento": ["Biohackers"],
    "Wearables y monitoreo de la salud": ["QuantifiedSelf"],
}

# Medios especializados con RSS propio (capa media frecuencia) — VERIFICADOS.
MEDIOS_RSS = [
    ("STAT News", "https://www.statnews.com/feed/", "Tecnológico"),
    ("MIT Technology Review", "https://www.technologyreview.com/feed/", "Tecnológico"),
    ("WIRED Science", "https://www.wired.com/feed/category/science/latest/rss", "Tecnológico"),
    ("The Conversation — Health", "https://theconversation.com/global/health/articles.atom", "Social"),
    ("Nature Aging", "https://www.nature.com/nataging.rss", "Tecnológico"),
    ("Nature — Ageing (subject)", "https://www.nature.com/subjects/ageing.rss", "Tecnológico"),
    ("Nature Medicine", "https://www.nature.com/nm.rss", "Tecnológico"),
    ("Nature Biotechnology", "https://www.nature.com/nbt.rss", "Económico"),
    ("Nature News", "https://www.nature.com/nature.rss", "Tecnológico"),
    ("ScienceDaily — Health", "https://www.sciencedaily.com/rss/top/health.xml", "Social"),
    ("Fight Aging!", "https://www.fightaging.org/feed/", "Tecnológico"),
    ("Lifespan.io", "https://www.lifespan.io/feed/", "Tecnológico"),
    ("Endpoints News", "https://endpts.com/feed/", "Económico"),
    ("Singularity Hub", "https://singularityhub.com/feed/", "Tecnológico"),
    ("El País — Ciencia", "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/ciencia/portada", "Social"),
    ("The Guardian — Health", "https://www.theguardian.com/society/health/rss", "Social"),
    ("The Guardian — Science", "https://www.theguardian.com/science/rss", "Tecnológico"),
]

# Instituciones — SIEMPRE a subsección específica, nunca homepage (baja frecuencia).
INSTITUCIONES = [
    ("OMS — Envejecimiento (noticias)", "https://www.who.int/news-room/feed-entries/rss", "Político"),
    ("NIA — National Institute on Aging (news)", "https://www.nia.nih.gov/news/rss.xml", "Político"),
    ("OCDE — Health (publications)", "https://www.oecd.org/health/", "Económico"),
    ("CEPAL — Envejecimiento (publicaciones)", "https://www.cepal.org/es/publicaciones", "Social"),
    ("Buck Institute for Research on Aging", "https://www.buckinstitute.org/news/", "Tecnológico"),
    ("Hevolution Foundation (news)", "https://hevolution.com/news", "Económico"),
    ("SENS Research Foundation", "https://www.sens.org/category/news/", "Tecnológico"),
    ("Max Planck — Biology of Ageing", "https://www.age.mpg.de/news", "Tecnológico"),
    ("AFAR — American Federation for Aging Research", "https://www.afar.org/news", "Social"),
    ("OPS — Salud y envejecimiento", "https://www.paho.org/es/noticias", "Social"),
    ("PNUD — Envejecimiento", "https://www.undp.org/es/news", "Político"),
    ("Banco Mundial — Aging (news)", "https://www.worldbank.org/en/news", "Económico"),
    ("UNEP — Environment & health (news)", "https://www.unep.org/news-and-stories", "Ecológico"),
    ("Brookings — Aging (research)", "https://www.brookings.edu/topic/aging/", "Político"),
    ("Milken Institute — Center for the Future of Aging", "https://milkeninstitute.org/centers/center-future-aging", "Económico"),
    ("National Academies — Health (publications)", "https://www.nationalacademies.org/news", "Político"),
]


def _now_iso():
    from datetime import datetime
    return datetime.now().isoformat(timespec="seconds")


def construir_fuentes(tematicas_rows):
    """
    Dada la lista de temáticas guardadas en DB (cada una dict con id/nombre/nivel),
    construye la lista de fuentes a insertar.

    Devuelve lista de dicts con las columnas de la tabla 'fuentes'.
    Genera fuentes en las tres capas para asegurar cobertura de ángulos no obvios.
    """
    by_nombre = {t["nombre"]: t for t in tematicas_rows}
    nucleo = [t for t in tematicas_rows if t["nivel"] == "nucleo"]
    adyacentes = [t for t in tematicas_rows if t["nivel"] == "adyacente"]
    todas = tematicas_rows
    fuentes = []
    fecha = _now_iso()
    vistos = set()  # dedup por URL

    def add(nombre, url, tipo, steep, categoria, tematica_id):
        if not url or url in vistos:
            return
        vistos.add(url)
        fuentes.append({
            "nombre": nombre, "url": url, "tipo_acceso": tipo,
            "cuadrante_steep": steep, "categoria": categoria,
            "tematica_id": tematica_id, "activa": 1, "calidad": "sin evaluar",
            "senales_generadas": 0, "fecha_agregada": fecha,
        })

    # ---- CAPA ALTA FRECUENCIA --------------------------------------------
    # Google News RSS: por cada temática, varias queries por ángulo en ES + EN.
    # Son feeds reales y auditables; cada item linkea al artículo de origen.
    for t in todas:
        nom = t["nombre"]
        steep_t = STEEP[t["id"] % len(STEEP)]
        # queries base: las específicas del núcleo, o el nombre de la temática
        bases = QUERIES_NUCLEO.get(nom, [nom])
        for base in bases:
            for ang in ANGULOS_ES:
                q = f"{base} {ang}".strip()
                etq = q if ang else base
                add(f"Google News · {etq}", _gnews_rss(q), "api_google_news",
                    steep_t, "alta_frecuencia", t["id"])
        # versión en inglés (más volumen, dominio anglo dominante en longevity)
        for ang in ANGULOS_EN:
            q = f"{nom} {ang}".strip()
            add(f"Google News EN · {nom} · {ang}",
                _gnews_rss(q, hl="en-US"), "api_google_news",
                steep_t, "alta_frecuencia", t["id"])
    # arXiv para temáticas tecnológicas (núcleo + adyacentes)
    for nom, cats in ARXIV_CATS.items():
        t = by_nombre.get(nom)
        if not t:
            continue
        for cat in cats:
            add(f"arXiv · {cat} ({nom})", _arxiv_rss(cat), "rss",
                "Tecnológico", "alta_frecuencia", t["id"])
    # Feeds académicos de artículo directo (bioRxiv, medRxiv, PLOS, eLife...).
    # Se reparten entre las temáticas del núcleo (alto rendimiento, abstracts ricos).
    pool_acad = nucleo or todas
    for i, (nombre, url, steep) in enumerate(ACADEMICOS_RSS):
        t = pool_acad[i % len(pool_acad)] if pool_acad else None
        add(nombre, url, "rss", steep, "alta_frecuencia", t["id"] if t else None)
    # Reddit para temáticas con comunidad activa
    for nom, subs in SUBREDDITS.items():
        t = by_nombre.get(nom)
        if not t:
            continue
        for sub in subs:
            add(f"Reddit · r/{sub}", _reddit_rss(sub), "rss",
                "Social", "alta_frecuencia", t["id"])

    # ---- CAPA MEDIA FRECUENCIA -------------------------------------------
    # Medios especializados distribuidos cíclicamente entre las adyacentes.
    pool_med = adyacentes or todas
    for i, (nombre, url, steep) in enumerate(MEDIOS_RSS):
        t = pool_med[i % len(pool_med)] if pool_med else None
        add(nombre, url, "rss", steep, "media_frecuencia", t["id"] if t else None)

    # ---- CAPA BAJA FRECUENCIA --------------------------------------------
    # Instituciones a subsección específica, distribuidas entre todas las temáticas.
    pool_baja = todas
    for i, (nombre, url, steep) in enumerate(INSTITUCIONES):
        t = pool_baja[i % len(pool_baja)] if pool_baja else None
        tipo = "rss" if url.rstrip("/").endswith((".xml", "rss", ".rss", "feed-entries/rss")) else "html"
        add(nombre, url, tipo, steep, "baja_frecuencia", t["id"] if t else None)

    return fuentes
