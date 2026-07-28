# Diseñar Futuros · Corpus de señales — Territorio: **Longevity**

App web con servidor Python (FastAPI) + base de datos SQLite que hace scraping
real de fuentes, guarda todo en `corpus.db` y sirve una interfaz con tabs para
administrar señales de futuros, clusterizarlas, detectar tendencias y analizarlas
con 14 visualizaciones interactivas.

Construida siguiendo la **Guía de Taller · Clase 3 (guia_v6)**.

> **Regla de oro:** cada señal apunta a un hecho concreto y verificable (noticia,
> paper, producto, regulación) con URL directa, fecha de origen y extracto textual
> literal. La app está diseñada para AUDITAR: seguir cualquier señal hasta su origen.

---

## Cómo levantar el servidor

```bash
source venv/bin/activate
uvicorn main:app --reload
```

Abrir el browser en **http://127.0.0.1:8000**

> ⚠️ **Puerto 8000 ocupado:** durante el desarrollo había otro proceso escuchando
> en el 8000, así que la instancia de prueba quedó en el **8001**. Si el 8000 está
> libre, usá `--reload` a secas. Si está ocupado: `uvicorn main:app --reload --port 8001`.

La base `corpus.db` se crea automáticamente al iniciar si no existe. **Ya viene
poblada** con un corpus de demostración (ver abajo).

## Estado del corpus de demostración (`corpus.db`)

| Métrica | Valor |
| :-- | :-- |
| Señales totales | **383** (326 relevantes, 0 duplicados) |
| Fuentes generadas | **336** (reales y auditables) |
| Clusters | 33 (10 temáticas conocidas + 23 emergentes) |
| Tendencias | 32 |
| Scoring | todas las señales con score 0-100 |

Todas las señales tienen URL directa al artículo, fecha de origen y cita literal
(mín. 80 palabras) — cumplen la Regla de oro.

---

## Arquitectura

```
main.py            FastAPI: todos los endpoints REST
db.py              esquema SQLite + migraciones idempotentes
fuentes_gen.py     mapa de temáticas (Longevity) + generador de pirámide de fuentes
scraper.py         scraper en 2 fases (recolectar URLs → leer y evaluar c/u)
scoring.py         scoring programático de calidad (Etapa 6, con embeddings)
clustering.py      clustering semántico (Etapa 5): asignación a temáticas + UMAP/HDBSCAN
rescraping.py      re-scraping dirigido por cuadrante STEEP (Etapa 5b)
embeddings.py      modelo paraphrase-multilingual-MiniLM-L12-v2 (singleton)
static/
  index.html       interfaz con tabs
  styles.css       paleta de la guía (#F9FAFB / #1D7874 / #1A1A1A)
  app.js           tabs Fuentes y Señales
  clusters.js      tab Clusters
  tendencias.js    tab Tendencias
  viz.js           tab Visualizaciones (14 vistas SVG puro)
```

## Flujo del taller (tabs)

1. **Fuentes** — Generá el mapa de temáticas (núcleo/adyacente/periférico) y luego
   "Sugerir 500 fuentes desde el mapa". Editá el mapa antes (las periféricas dan las
   señales más inesperadas).
2. **Señales** — "Iniciar scraping". El scraper entra a cada artículo, evalúa
   relevancia y extrae la cita literal. Panel de re-scraping dirigido para completar
   cuadrantes con déficit. Carga manual, scoring, edición en lote.
3. **Revisar / Verificar** (Etapas 3-4) — corregí cuadrantes/drivers con las
   herramientas de la tab, verificá 5 señales al azar contra su URL.
4. **Clusters** — "Clusterizar señales". Asigna a temáticas conocidas (coseno) y
   detecta emergentes con HDBSCAN. Vista espacial + tarjetas + validación.
5. **Tendencias** — "Generar desde clusters" o creá manualmente; asigná estado,
   horizonte, impacto e incertidumbre.
6. **Visualizaciones** — 14 vistas en 3 grupos: entender el corpus (1-5), detectar
   dinámicas (6-9), construir escenarios (10-14). Todas exportan PNG.

## Backup de la base

```bash
cp corpus.db "backup_corpus_$(date +%Y-%m-%d).db"
```

---

## Decisiones de diseño (desvíos conscientes de la guía)

La guía es la especificación; estos ajustes la hacen **funcionar de verdad** con
fuentes reales y este modelo de embeddings, manteniendo el comportamiento descrito:

1. **~336 fuentes reales en lugar de 500 fabricadas.** Para respetar la Regla de
   oro (toda fuente debe ser auditable) no se inventan 300 URLs de instituciones que
   darían 404. La pirámide se apoya en feeds de **artículo directo verificados**
   (bioRxiv, medRxiv, PLOS, eLife, Nature, arXiv, Guardian, STAT, El País…) más
   queries de **Google News RSS por temática y ángulo** (cada una es un feed válido y
   auditable). El backbone de alta frecuencia es lo que la guía dice que aporta el
   60-70% del volumen.

2. **Umbral de asignación a temáticas: 0.45 en vez de 0.75.** El modelo multilingüe
   `paraphrase-multilingual-MiniLM-L12-v2` da similitudes coseno señal↔temática reales
   de ~0.30-0.55 (medido sobre el corpus). Con 0.75 la asignación quedaba en cero. 0.45
   asigna ~28% del corpus a temáticas conocidas y deja el resto para HDBSCAN — la
   mezcla "conocidas + emergentes" que busca la guía. Es **configurable** desde la UI.

3. **Google News como capa secundaria.** Funciona pero rate-limitea y sus URLs
   redirigen (no siempre dan contenido extraíble en Fase 2). El corpus de calidad sale
   de los feeds de artículo directo. Las queries de Google News siguen en la base para
   cuando rindan.

4. **Tab Tendencias inferida.** La guía la nombra (tabs y checklist) pero v6 no trae
   prompt para ella. Se implementó porque las Visualizaciones 6/8/11 dependen de
   `tendencias` (estado, horizonte, impacto, incertidumbre). "Generar desde clusters"
   la bootstrapea.

## Setup desde cero (si hace falta reinstalar)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Dependencias core: fastapi, uvicorn, httpx, beautifulsoup4, aiosqlite,
python-multipart, feedparser. Stack ML: sentence-transformers, scikit-learn, numpy,
umap-learn, hdbscan. (Python 3.9+).
