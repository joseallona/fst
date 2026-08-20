"""
Capa de base de datos — Diseñar Futuros (corpus.db)

SQLite vía aiosqlite. El esquema completo se crea al iniciar el servidor si la
base no existe. `ensure_columns()` agrega columnas faltantes de forma idempotente
para que re-correr el server después de actualizar el código no rompa una base
ya creada en una etapa anterior.
"""

import aiosqlite

DB_PATH = "corpus.db"

# Cada CREATE TABLE incluye TODAS las columnas de todas las etapas de la guía.
# Una base nueva queda completa de entrada; las migraciones de ensure_columns()
# cubren bases creadas con un esquema más viejo.
SCHEMA = """
CREATE TABLE IF NOT EXISTS tematicas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    nivel TEXT,              -- 'nucleo' | 'adyacente' | 'periferico'
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS fuentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    url TEXT NOT NULL,
    tipo_acceso TEXT,        -- 'rss' | 'api_google_news' | 'html'
    cuadrante_steep TEXT,
    categoria TEXT,          -- 'alta_frecuencia' | 'media_frecuencia' | 'baja_frecuencia'
    tematica_id INTEGER REFERENCES tematicas(id),
    activa INTEGER DEFAULT 1,
    calidad TEXT DEFAULT 'sin evaluar',
    senales_generadas INTEGER DEFAULT 0,
    fecha_agregada TEXT
);

CREATE TABLE IF NOT EXISTS senales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fuente_id INTEGER REFERENCES fuentes(id),
    titulo TEXT NOT NULL,
    url_directa TEXT NOT NULL,
    fecha_origen TEXT,
    cita_relevancia TEXT NOT NULL,
    por_que_es_senal TEXT,
    cuadrante_steep TEXT,
    driver_hipotesis TEXT,
    calidad_senal TEXT DEFAULT 'sin evaluar',
    es_relevante INTEGER DEFAULT 1,
    cluster_id INTEGER,
    tendencia_id INTEGER,
    fecha_scrapeada TEXT,
    -- Etapa 6: scoring programático
    score_calidad INTEGER DEFAULT NULL,
    score_relevancia INTEGER DEFAULT NULL,
    score_especificidad INTEGER DEFAULT NULL,
    score_verificabilidad INTEGER DEFAULT NULL,
    razon_score TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS scraper_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT DEFAULT 'scraping',   -- 'scraping' | 're-scraping'
    estado TEXT DEFAULT 'detenido',
    capa_actual TEXT,
    fuentes_total INTEGER DEFAULT 0,
    fuentes_procesadas INTEGER DEFAULT 0,
    items_encontrados INTEGER DEFAULT 0,
    items_relevantes INTEGER DEFAULT 0,
    items_descartados INTEGER DEFAULT 0,
    duplicados INTEGER DEFAULT 0,
    errores TEXT DEFAULT '[]',
    iniciado_en TEXT,
    detenido_en TEXT
);

CREATE TABLE IF NOT EXISTS clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    driver_candidato TEXT,
    descripcion TEXT,
    razonamiento TEXT,
    tematica_id INTEGER REFERENCES tematicas(id),  -- null si es emergente
    es_emergente INTEGER DEFAULT 0,
    validado INTEGER DEFAULT 0,
    fecha_creado TEXT
);

CREATE TABLE IF NOT EXISTS senales_coords (
    senal_id INTEGER PRIMARY KEY REFERENCES senales(id),
    x REAL,
    y REAL
);

CREATE TABLE IF NOT EXISTS tendencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    driver TEXT,
    estado TEXT DEFAULT 'emergente',  -- 'emergente' | 'consolidada' | 'en declive'
    horizonte TEXT,                   -- 'H1' | 'H2' | 'H3'
    fuerza INTEGER DEFAULT 1,
    cuadrante_steep TEXT,
    descripcion TEXT,
    bullets TEXT,                     -- JSON list de temas internos
    cluster_id INTEGER REFERENCES clusters(id),
    impacto INTEGER DEFAULT 3,        -- Vista 8: 1-5
    incertidumbre INTEGER DEFAULT 3,  -- Vista 8: 1-5
    fecha_creada TEXT
);

CREATE TABLE IF NOT EXISTS cla_analisis (
    cluster_id INTEGER PRIMARY KEY REFERENCES clusters(id),
    vision_mundo TEXT,
    mito_metafora TEXT
);

CREATE TABLE IF NOT EXISTS escenarios_2x2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_x_id INTEGER,
    driver_y_id INTEGER,
    nombre_q1 TEXT,
    nombre_q2 TEXT,
    nombre_q3 TEXT,
    nombre_q4 TEXT
);

CREATE TABLE IF NOT EXISTS escenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    horizonte INTEGER DEFAULT 10,        -- 5 | 10 | 15 | 30 años
    eje_x_label TEXT DEFAULT 'Eje X',
    eje_x_pos TEXT DEFAULT '',
    eje_x_neg TEXT DEFAULT '',
    eje_y_label TEXT DEFAULT 'Eje Y',
    eje_y_pos TEXT DEFAULT '',
    eje_y_neg TEXT DEFAULT '',
    cluster_ids TEXT DEFAULT '[]',        -- JSON list de cluster ids
    senal_ids TEXT DEFAULT '[]',          -- JSON list de señales sueltas
    q1_nombre TEXT DEFAULT '', q1_texto TEXT DEFAULT '',   -- X+ Y+
    q2_nombre TEXT DEFAULT '', q2_texto TEXT DEFAULT '',   -- X- Y+
    q3_nombre TEXT DEFAULT '', q3_texto TEXT DEFAULT '',   -- X- Y-
    q4_nombre TEXT DEFAULT '', q4_texto TEXT DEFAULT '',   -- X+ Y-
    fecha_creada TEXT
);
"""

# Columnas que pueden faltar en bases creadas con esquemas anteriores.
# (tabla, columna, definición SQL)
MIGRATIONS = [
    ("senales", "score_calidad", "INTEGER DEFAULT NULL"),
    ("senales", "score_relevancia", "INTEGER DEFAULT NULL"),
    ("senales", "score_especificidad", "INTEGER DEFAULT NULL"),
    ("senales", "score_verificabilidad", "INTEGER DEFAULT NULL"),
    ("senales", "razon_score", "TEXT DEFAULT NULL"),
    ("scraper_jobs", "tipo", "TEXT DEFAULT 'scraping'"),
    ("scraper_jobs", "capa_actual", "TEXT"),
    ("tendencias", "impacto", "INTEGER DEFAULT 3"),
    ("tendencias", "incertidumbre", "INTEGER DEFAULT 3"),
    ("senales", "juez_codigo", "TEXT"),  # veredicto del juez de calidad (LLM)
]


async def _table_columns(conn, table):
    cur = await conn.execute(f"PRAGMA table_info({table})")
    rows = await cur.fetchall()
    return {r[1] for r in rows}


async def ensure_columns(conn):
    for table, col, decl in MIGRATIONS:
        existing = await _table_columns(conn, table)
        if existing and col not in existing:
            await conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {decl}")
    await conn.commit()


async def init_db():
    async with aiosqlite.connect(DB_PATH) as conn:
        await conn.executescript(SCHEMA)
        await conn.commit()
        await ensure_columns(conn)


def get_conn():
    """Devuelve una conexión async con row_factory tipo dict-like."""
    return aiosqlite.connect(DB_PATH)


def row_to_dict(cursor, row):
    """row_factory: convierte filas en dicts."""
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
