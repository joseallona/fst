

**DISEÑAR FUTUROS**

Guía de Taller · Clase 3

*Construir el corpus: \+300 señales verificadas y auditables*

| Qué van a construir hoy Una app web con servidor Python local y base de datos SQLite. El servidor hace scraping real de las fuentes, guarda todo en la base de datos, y sirve una interfaz con tabs para administrar señales, clusterizarlas, detectar tendencias y analizarlas con visualizaciones interactivas. |
| :---- |

| ⚠️  Regla de oro — sin excepciones |
| :---- |
| Cada señal apunta a un hecho concreto y verificable: una noticia, publicación, producto, regulación o dato — no a la página de inicio de una institución. |
| URL directa al contenido, fecha de origen (no de scraping), extracto textual de la fuente. |
| La app se diseña para AUDITAR: poder seguir cualquier señal hasta su origen. |

## **Qué es una señal — antes de arrancar**

Este taller produce señales de futuros, no listas de instituciones. La diferencia es crítica para que el corpus sea útil.

### **Una señal ES**

* **Una noticia concreta:** "Ciudad de Gales reubica municipio completo por daños climáticos irreparables" (The Guardian, 12/03/2024).

* **Un producto o servicio emergente:** "Startup lanza primer seguro médico cotizado por algoritmo de biometría facial" (TechCrunch, 2024).

* **Un hallazgo científico:** "Paper en Nature: bacterias intestinales predicen depresión con 87% de precisión" (Nature, feb 2024).

* **Una regulación o política pública específica:** "UE aprueba reglamento que obliga a neutralidad de carbono en centros de datos desde 2027".

* **Un comportamiento observable o dato cuantificable:** "Ventas de autos eléctricos superan a nafta por primera vez en Noruega — Q1 2024".

* **Una señal débil:** algo pequeño, fuera de lugar, que podría apuntar a un cambio. No necesita ser masivo para ser señal.

### **Una señal NO ES**

* La página principal de la OMS, del MIT o de Greenpeace.

* Una sección 'Noticias' o 'Publicaciones' sin link al artículo específico.

* Una descripción de lo que hace una organización en general.

* Un titular sin URL verificable al artículo original.

| 💡  La regla de granularidad |
| :---- |
| Si el link lleva a una institución porque hace algo relevante, el link tiene que apuntar exactamente al qué: la publicación específica que lanzó, el servicio que ofrece con su URL propia, la noticia que la menciona. La institución puede aparecer como fuente, pero la señal es el hecho concreto que justifica incluirla. |

## **Cómo está organizada la app**

La app tiene dos partes que se comunican entre sí:

* **Servidor Python (FastAPI):** corre en terminal, hace scraping real sin restricciones de CORS, administra SQLite, expone una API REST.

* **Interfaz web (browser):** navega por tabs — Fuentes / Señales / Clusters / Tendencias / Visualizaciones. Cada tab se agrega en su propio prompt. Todo persiste en SQLite.

| 💡  Cómo iterar cuando algo falla |
| :---- |
| Error en browser (F12 → Console): 'Esto falla en el browser. El error es el de arriba. Arreglalo sin cambiar lo que ya anda.' |
| Error en terminal (traceback de Python): 'El servidor da este error. El traceback es el de arriba.' |
| Si no sabés de dónde viene el error: pegá ambos juntos. |
| Más de 10 minutos trabados en lo mismo: llamen al docente antes de reescribir desde cero. |

| 0 | *Setup* | Preparar el entorno via Claude Code |
| :---: | :---- | :---- |

Claude Code hace el setup completo desde la carpeta donde está abierto. No hay que crear carpetas a mano ni ir al escritorio.

  **Prompt — copiá esto en Claude Code**


| Necesito hacer el setup inicial de un proyecto Python para scraping web. |
| :---- |
| Usá las herramientas de terminal disponibles para ejecutar estos pasos |
| DENTRO DE LA CARPETA ACTUAL donde está abierto Claude Code: |
|   |
| 1\. Verificá que Python 3.9 o superior esté instalado. |
|    Si no está, avisame antes de continuar. |
| 2\. En la carpeta actual, creá un entorno virtual llamado 'venv'. |
| 3\. Activá el entorno virtual e instalá: |
|    fastapi, uvicorn, httpx, beautifulsoup4, aiosqlite, |
|    python-multipart, feedparser, sentence-transformers, scikit-learn, |
|    numpy, umap-learn, hdbscan |
| 4\. Verificá la instalación y creá requirements.txt. |
| 5\. Al terminar, decime el comando exacto para levantar el servidor. |
|   |
| Si algo falla, avisame el error exacto antes de continuar. |

  **Qué deberías ver**


| ✓  Python 3.9+ confirmado |
| :---- |
| ✓  Entorno virtual creado en la carpeta actual del proyecto |
| ✓  Todas las dependencias instaladas — requirements.txt generado |
| ✓  Claude Code te dice el comando para levantar el servidor |

| Si Claude Code no puede correr comandos de terminal |
| :---- |
| Están en Claude.ai (browser) en vez de Claude Code (app de escritorio). Descarguen Claude Code desde claude.ai/code, inicien sesión con la misma cuenta y vuelvan a este prompt. |

| 1 | *Tab Fuentes* | Expandir temáticas y armar 500 fuentes |
| :---: | :---- | :---- |

El problema de un corpus pequeño casi siempre es un problema de mix de fuentes, no de cantidad. 87 fuentes institucionales son todas del mismo tipo: publican poco, sus webs son difíciles de scrapear y generan pocas señales por visita.

La solución tiene dos pasos: primero expandir las temáticas relacionadas al territorio para no quedarse en el ángulo obvio, y después armar una pirámide de 500 fuentes por tipo de acceso y rendimiento esperado.

| Capa | Tipo | Rendimiento | Ejemplos |
| :---- | :---- | :---- | :---- |
| **Alta frecuencia** | Feeds RSS / APIs estructuradas | **50–200 señales por fuente** | Google News RSS, arXiv, PubMed, Reddit, OpenAlex, GDELT |
| **Media frecuencia** | Medios especializados con RSS | **10–30 señales por fuente** | WIRED, MIT Tech Review, The Conversation, medios regionales |
| **Baja frecuencia** | Instituciones — sección de publicaciones | **2–15 señales por fuente** | OMS /publicaciones, OCDE /reports, BID /news — nunca la homepage |

| Distribución recomendada para 500 fuentes |
| :---- |
| 15–20 feeds de alta frecuencia → aportan el 60–70% del volumen total |
| 100–150 medios especializados → señales más elaboradas con contexto |
| 300–350 instituciones → siempre apuntando a /publicaciones o RSS propio |

**Reemplazá \[TEMA DEL GRUPO\] antes de pegar.**

  **Prompt — Expansión temática \+ pirámide de 500 fuentes**


| Creá una app web con servidor Python FastAPI y base de datos SQLite. |
| :---- |
| El territorio del proyecto es: \[TEMA DEL GRUPO\] |
|   |
| PASO 1 — EXPANSIÓN TEMÁTICA (ejecutar antes de sugerir fuentes): |
|   Antes de sugerir fuentes, generá un mapa de temáticas relacionadas |
|   al territorio. El objetivo es no quedarse en el ángulo obvio. |
|   El mapa tiene tres niveles: |
|   |
|   NÚCLEO: las 3-5 temáticas centrales del territorio |
|   ADYACENTES: 10-15 temáticas que se cruzan con el núcleo |
|     (sectores que producen, consumen o regulan el fenómeno central) |
|   PERIFÉRICAS: 10-15 temáticas que parecen lejanas pero tienen |
|     conexión indirecta (tecnologías habilitantes, efectos colaterales, |
|     analogías en otros sectores, contextos geopolíticos relevantes) |
|   |
|   Guardá este mapa en una tabla 'tematicas': |
|     id, nombre, nivel (nucleo/adyacente/periferico), descripcion |
|   El mapa es visible en la interfaz antes de generar las fuentes. |
|   El grupo puede editar, agregar o eliminar temáticas antes de continuar. |
|   |
| ARQUITECTURA GENERAL |
|   Archivo principal: main.py |
|   Base de datos: corpus.db (SQLite via aiosqlite) |
|   Frontend: static/index.html servido por FastAPI |
|   Interfaz con tabs. Esta versión activa solo la tab 'Fuentes'. |
|   Las demás tabs aparecen deshabilitadas ('próximamente'). |
|   |
| BASE DE DATOS — tabla 'fuentes': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   nombre TEXT NOT NULL |
|   url TEXT NOT NULL |
|   tipo\_acceso TEXT   \-- 'rss' | 'api\_google\_news' | 'html' |
|   cuadrante\_steep TEXT |
|   categoria TEXT     \-- 'alta\_frecuencia' | 'media\_frecuencia' | 'baja\_frecuencia' |
|   tematica\_id INTEGER REFERENCES tematicas(id) |
|   activa INTEGER DEFAULT 1 |
|   calidad TEXT DEFAULT 'sin evaluar' |
|   senales\_generadas INTEGER DEFAULT 0 |
|   fecha\_agregada TEXT |
|   |
| ENDPOINT /fuentes/sugerir: |
|   Usa el mapa de temáticas para generar \~500 fuentes. |
|   Para CADA temática del mapa generá fuentes en las tres capas. |
|   Esto asegura cobertura de ángulos no obvios. |
|   |
|   CAPA ALTA FRECUENCIA: |
|     Para cada temática del núcleo: 2-3 queries de Google News RSS |
|     (formato: https://news.google.com/rss/search?q=\[QUERY\]\&hl=es) |
|     Para temáticas tecnológicas: feed arXiv de la categoría relevante |
|     Para temáticas con comunidad activa: subreddit via RSS |
|     (https://www.reddit.com/r/\[subreddit\]/.rss) |
|   |
|   CAPA MEDIA FRECUENCIA: |
|     Para cada temática adyacente: 3-5 medios con RSS propio |
|     Priorizar medios en español para contexto regional |
|     Incluir newsletters con archivo web público |
|   |
|   CAPA BAJA FRECUENCIA: |
|     Para cada temática (núcleo \+ adyacentes \+ periféricas): |
|     2-3 instituciones apuntando SIEMPRE a subsección específica: |
|     /publicaciones /noticias /reportes /press-room /research |
|     — nunca a la homepage |
|   |
| ENDPOINTS REST: |
|   GET  /tematicas         → lista el mapa de temáticas |
|   POST /tematicas         → agrega temática |
|   PATCH /tematicas/{id}   → edita |
|   DELETE /tematicas/{id}  → elimina |
|   GET  /fuentes           → lista todas las fuentes |
|   POST /fuentes           → agrega una fuente |
|   PATCH /fuentes/{id}     → edita |
|   DELETE /fuentes/{id}    → elimina |
|   POST /fuentes/sugerir   → genera la pirámide a partir del mapa de temáticas |
|   |
| TAB FUENTES — interfaz: |
|   SECCIÓN MAPA DE TEMÁTICAS (arriba, siempre visible): |
|     Tres columnas: Núcleo / Adyacentes / Periféricas. |
|     Chips editables por temática (click para editar, X para eliminar). |
|     Botón 'Agregar temática' por columna. |
|     Botón 'Generar mapa automáticamente' (llama a POST /tematicas/generar). |
|     Contador de temáticas por nivel. |
|   SECCIÓN FUENTES (abajo, después del mapa): |
|     Botón 'Sugerir 500 fuentes desde el mapa'. |
|     Fuentes agrupadas por capa, con acordeón por cuadrante STEEP. |
|     Cada fuente: badge tipo (RSS/API/HTML), toggle activo/inactivo, |
|     badge calidad, contador señales generadas, temática vinculada, URL. |
|     Formulario para agregar fuentes manualmente. |
|     Contador de fuentes activas por capa en el header. |
|   |
| Diseño: fondo \#F9FAFB, acento \#1D7874, texto \#1A1A1A. |
| Sin frameworks de frontend ni dependencias externas de JS. |
| El servidor crea corpus.db al iniciar si no existe. |

**Para levantar el servidor:**

uvicorn main:app \--reload

**Abrir el browser en: http://127.0.0.1:8000**

  **Qué deberías ver**


| ✓  Servidor corre sin errores en terminal |
| :---- |
| ✓  Tab Fuentes muestra el mapa de temáticas en tres columnas editables |
| ✓  Botón 'Sugerir 500 fuentes' genera la pirámide desde el mapa |
| ✓  Las fuentes de Google News tienen queries específicas por temática |
| ✓  Fuentes agrupadas por capa con badges de tipo |
| ✓  Datos persisten al recargar |

| Qué hacer con el mapa de temáticas antes de generar fuentes |
| :---- |
| Revisá las periféricas: son las que generan las señales más inesperadas. Si el territorio es 'futuro del trabajo', una periferia podría ser 'infraestructura de movilidad urbana' o 'sistemas de identidad digital'. |
| Agregá temáticas que el grupo conoce bien pero que la IA no incluyó. |
| Eliminá las que sean ruido obvio para el proyecto. El mapa es la hipótesis del grupo sobre qué está relacionado. |

| 2 | *Tab Señales — Scraper* | Leer publicaciones reales y evaluar relevancia |
| :---: | :---- | :---- |

El scraper anterior traía títulos genéricos como 'news' o 'search' porque leía páginas de listado sin entrar a cada publicación. Este prompt corrige eso: para cada item encontrado, el scraper entra al contenido real, evalúa si es relevante para el territorio y extrae una cita textual del motivo.

| ⚠️  La diferencia clave con la versión anterior |
| :---- |
| Versión anterior: leía la página de listado y tomaba el título del link → resultado: 'news', 'research', 'publications'. |
| Esta versión: entra a cada URL individual, lee el contenido real, decide si es señal y extrae por qué. |
| Es más lento pero los resultados son señales reales, no metadatos vacíos. |

  **Prompt — copiá esto en Claude Code**


| Al main.py existente, agregale el scraper y habilitá la tab 'Señales'. |
| :---- |
|   |
| BASE DE DATOS — tabla 'senales': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   fuente\_id INTEGER REFERENCES fuentes(id) |
|   titulo TEXT NOT NULL |
|   url\_directa TEXT NOT NULL   \-- URL del artículo/publicación individual |
|   fecha\_origen TEXT           \-- fecha de publicación del contenido original |
|   cita\_relevancia TEXT NOT NULL \-- extracto textual que justifica por qué |
|                               \-- es señal. Copia literal del texto fuente. |
|   por\_que\_es\_senal TEXT       \-- interpretación del grupo (se completa después) |
|   cuadrante\_steep TEXT |
|   driver\_hipotesis TEXT |
|   calidad\_senal TEXT DEFAULT 'sin evaluar' |
|   es\_relevante INTEGER DEFAULT 1 |
|   cluster\_id INTEGER |
|   tendencia\_id INTEGER |
|   fecha\_scrapeada TEXT |
|   |
| BASE DE DATOS — tabla 'scraper\_jobs': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   estado TEXT DEFAULT 'detenido' |
|   fuentes\_total INTEGER DEFAULT 0 |
|   fuentes\_procesadas INTEGER DEFAULT 0 |
|   items\_encontrados INTEGER DEFAULT 0 |
|   items\_relevantes INTEGER DEFAULT 0 |
|   items\_descartados INTEGER DEFAULT 0 |
|   duplicados INTEGER DEFAULT 0 |
|   errores TEXT DEFAULT '\[\]' |
|   iniciado\_en TEXT |
|   detenido\_en TEXT |
|   |
| SCRAPER — lógica de extracción en dos fases: |
|   |
| FASE 1 — RECOLECCIÓN DE URLs INDIVIDUALES: |
|   Para cada fuente activa, recolectar URLs individuales de contenido. |
|   NO tomar la URL de la fuente como señal: entrar y encontrar items. |
|   |
|   Si tipo\_acceso \= 'rss': |
|     Parsear el feed XML con feedparser. |
|     Extraer todos los \<item\> o \<entry\>. |
|     La url\_directa de cada señal \= \<link\> del item (URL del artículo). |
|     Si \<link\> \== URL del feed: DESCARTAR (es un feed mal formado). |
|     Extraer título, fecha publicación del item. |
|   |
|   Si tipo\_acceso \= 'api\_google\_news': |
|     Parsear como RSS. Cada \<item\> tiene un link al artículo original. |
|     El título del feed-item es un titulo candidato. |
|     Si el título es genérico (contiene solo 'news', 'search', 'results', |
|     'home', tiene menos de 4 palabras): DESCARTAR ese item. |
|     url\_directa \= link del item en Google News. |
|   |
|   Si tipo\_acceso \= 'html': |
|     Hacer GET a la URL de la fuente. |
|     Extraer SOLO links que apunten a páginas individuales de contenido. |
|     Criterio de link válido: la URL del link es distinta a la URL de la fuente |
|     Y contiene palabras como: /articulo/ /article/ /noticia/ /news/ /post/ |
|     /publicacion/ /publication/ /report/ /documento/ /paper/ /release/ |
|     /evento/ /comunicado/ /resolución/ /decreto/ |
|     Si no hay links válidos: marcar fuente como 'sin estructura navegable'. |
|     Seguir paginación (?page=N o siguiente/next) hasta 5 páginas. |
|   |
| FASE 2 — LECTURA Y EVALUACIÓN DE CADA URL INDIVIDUAL: |
|   Para cada URL individual recolectada en Fase 1: |
|   |
|   a) Hacer GET a la URL (timeout 15s, User-Agent de browser real). |
|      Si falla (timeout, 403, 404, paywall detectado): registrar error, |
|      marcar calidad\_senal \= 'sin acceso', continuar. |
|   |
|   b) Extraer el contenido principal con BeautifulSoup: |
|      Buscar en orden: \<article\>, \<main\>, \[role='main'\], .content, \#content |
|      Tomar los párrafos del contenido principal (no nav, no footer, no sidebar). |
|      Concatenar párrafos hasta tener al menos 300 palabras. |
|      Si hay menos de 100 palabras: marcar como 'contenido insuficiente', descartar. |
|   |
|   c) Extraer metadatos: |
|      Título: \<h1\> del contenido principal. Si no hay: \<title\> del documento. |
|      Si el título resultante es genérico (menos de 4 palabras, o contiene |
|      solo 'home', 'news', 'search', 'results', 'publications'): DESCARTAR. |
|      Fecha: buscar en meta\[property='article:published\_time'\], |
|      time\[datetime\], .date, .fecha, .published. Si no hay: fecha de scraping. |
|   |
|   d) Evaluar relevancia para el territorio \[TEMA DEL GRUPO\]: |
|      Buscar en el texto conceptos relacionados con las temáticas del mapa. |
|      Si el texto menciona al menos 2 conceptos relevantes: es\_relevante \= 1\. |
|      Si no: es\_relevante \= 0, guardar igual pero marcado como no relevante. |
|      (El grupo puede revisarlos después.) |
|   |
|   e) Extraer cita\_relevancia: |
|      Del texto del artículo, extraer el párrafo o fragmento que mejor |
|      justifica por qué esta publicación es relevante para el territorio. |
|      Tiene que ser una COPIA LITERAL del texto fuente, mínimo 80 palabras. |
|      No parafrasear. No resumir. Copiar el fragmento más denso en información. |
|   |
|   f) Insertar en la tabla senales si es\_relevante \= 1\. |
|      Verificar que url\_directa no existe ya en la tabla (deduplicar). |
|   |
| COMPORTAMIENTO DEL SCRAPER: |
|   No arranca automáticamente. |
|   Procesa fuentes en orden: alta frecuencia → media → baja. |
|   Por cada fuente: actualiza calidad según items relevantes encontrados. |
|   Puede detenerse en cualquier momento. |
|   Estado visible por capa: 'corriendo — alta frecuencia', etc. |
|   |
| ENDPOINTS: |
|   POST /scraper/iniciar |
|   POST /scraper/detener |
|   GET  /scraper/estado |
|   GET  /senales           → filtros: ?cuadrante=\&calidad=\&relevante=\&q= |
|   POST /senales           → carga manual |
|   PATCH /senales/{id} |
|   DELETE /senales/{id} |
|   PATCH /senales/lote |
|   DELETE /senales/lote |
|   |
| TAB SEÑALES — interfaz: |
|   |
|   Panel de control (top, siempre visible): |
|     Botón Iniciar / Detener. |
|     Barra de progreso con capa actual. |
|     Contadores: items encontrados / relevantes / descartados / duplicados. |
|     Lista de errores colapsable. |
|   |
|   Formulario de carga manual (colapsable): |
|     Campos: titulo, url\_directa, fecha\_origen, cita\_relevancia, |
|     por\_que\_es\_senal, cuadrante\_steep, driver\_hipotesis. |
|     Validación: url\_directa y cita\_relevancia obligatorios. |
|   |
|   Tabla de señales: |
|     Toggle 'Mostrar no relevantes' (por defecto: solo relevantes). |
|     Columnas: titulo, cuadrante, driver, calidad, fuente, fecha\_origen. |
|     Click expande: cita\_relevancia completa en bloque de cita, |
|     por\_que\_es\_senal (editable), url\_directa clickeable. |
|     Edición inline de cuadrante\_steep, driver\_hipotesis, calidad\_senal. |
|     Checkboxes \+ toolbar de lote. |
|     Búsqueda en titulo y cita\_relevancia. |
|     Contador: \[N relevantes\] \[M no relevantes\] \[total\]. |

  **Qué deberías ver**


| ✓  Panel con contadores separados: relevantes / descartados / duplicados |
| :---- |
| ✓  Cada señal tiene título real extraído del artículo, no del listado |
| ✓  cita\_relevancia es texto literal del artículo (mínimo 80 palabras) |
| ✓  Señales con título genérico ('news', 'search') son descartadas automáticamente |
| ✓  Toggle para ver señales no relevantes y recuperar las que se descartaron por error |

| Si las señales siguen siendo genéricas después de este prompt |
| :---- |
| El problema suele estar en las fuentes de baja frecuencia con estructura HTML rota. Mirá las que tienen 'sin estructura navegable': buscá manualmente si tienen un feed RSS alternativo (/feed, /rss, /atom) y actualizá el tipo\_acceso. |
| Para publicaciones académicas o de think tanks: la URL de la fuente debería apuntar directamente a la lista de papers o reportes, no a la home. |
| Ejemplo: Chatham House → https://www.chathamhouse.org/publications/research-publications (el scraper entra a cada publicación de esa lista y extrae la cita). |

| 3 | *Revisar señales* | Corregir categorías y agregar lo que faltó |
| :---: | :---- | :---- |

El scraper extrae texto, pero la categorización automática no siempre es correcta. Esta etapa no tiene prompt nuevo: usa las herramientas de edición que ya están en la tab Señales.

### **Qué revisar**

* **Cuadrante STEEP:** muestreá 20 señales al azar. ¿El cuadrante es el correcto?

* **Driver-hipótesis:** la IA tiende a ser genérica. Reformulá con la fuerza específica del territorio. No 'digitalización' sino 'reemplazo de intermediarios humanos por sistemas de recomendación algorítmica'.

* **Calidad de señal:** ¿la URL lleva al hecho concreto o a una página de inicio? ¿El extracto describe un fenómeno observable real?

* **Carga manual:** agregá las señales relevantes que el scraper no capturó — cosas encontradas leyendo, en conversaciones, en fuentes de acceso restringido.

| Herramienta de lote para correcciones masivas |
| :---- |
| Si muchas señales de una misma fuente tienen el cuadrante mal: filtrá por fuente, seleccioná todas, y usá 'Asignar cuadrante en lote'. |
| Si hay señales con calidad dudosa que querés marcar rápido: filtrá, seleccioná, 'Asignar calidad en lote'. |

| 4 | *Verificar* | Anti-alucinación antes de analizar |
| :---: | :---- | :---- |

No es optativo. Elegí 5 señales al azar —una por cuadrante STEEP— y verificalas antes de clusterizar. Un corpus con datos inventados no sirve para nada.

| \# | Título de la señal | URL — ¿abre? | ¿Dice lo que la IA afirma? | Acción |
| :---- | :---- | :---- | :---- | :---- |
| **1** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |
| **2** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |
| **3** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |
| **4** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |
| **5** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |

| 🚨  Qué hacer según los resultados |
| :---- |
| 0-1 con problema → corpus confiable, seguí con la Etapa 5\. |
| 2-3 con problema → revisá las fuentes que generaron esas señales. Desactivalas y agregá fuentes más granulares (repositorios de publicaciones, RSS, páginas de resultados específicos). |
| 4-5 con problema → el parser de BeautifulSoup está extrayendo contenido equivocado. Pedile a Claude Code que revise qué selectores CSS usa para encontrar artículos. |

| 5 | *Tab Clusters* | Clusterizar por significado — usando las temáticas del mapa |
| :---: | :---- | :---- |

Los embeddings semánticos agrupan por significado real, no por palabras compartidas. Antes de crear clusters nuevos, el algoritmo verifica si las señales calzan con las temáticas que el grupo ya definió en la tab Fuentes — lo que permite saber qué temáticas tienen más evidencia.

| Cómo funciona el clustering semántico con temáticas |
| :---- |
| 1\. Sentence-transformers genera embeddings de cada señal (título \+ cita\_relevancia) y de cada temática del mapa. 2\. UMAP reduce a 2D. 3\. El algoritmo primero intenta asignar señales a temáticas existentes por similitud semántica. Si una señal tiene similitud \> 0.75 con una temática: se asigna a ella. 4\. Las señales sin temática asignada van a HDBSCAN para detectar clusters emergentes no anticipados. 5\. Resultado: clusters etiquetados con temáticas conocidas \+ clusters nuevos que el mapa no tenía. |

  **Prompt — copiá esto en Claude Code**


| Al main.py existente, habilitá la tab 'Clusters' con clustering semántico |
| :---- |
| que usa las temáticas ya definidas como punto de partida. |
|   |
| DEPENDENCIAS (ya instaladas): sentence-transformers, umap-learn, |
| hdbscan, numpy, scikit-learn |
|   |
| BASE DE DATOS — tabla 'clusters': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   nombre TEXT NOT NULL |
|   driver\_candidato TEXT |
|   descripcion TEXT |
|   razonamiento TEXT |
|   tematica\_id INTEGER REFERENCES tematicas(id)  \-- null si es cluster emergente |
|   es\_emergente INTEGER DEFAULT 0  \-- 1 si no corresponde a ninguna temática |
|   validado INTEGER DEFAULT 0 |
|   fecha\_creado TEXT |
|   |
| ALGORITMO DE CLUSTERING: |
|   |
|   PASO 1 — EMBEDDINGS: |
|     Modelo: 'paraphrase-multilingual-MiniLM-L12-v2' |
|     Para cada señal: embedding de (titulo \+ ' ' \+ cita\_relevancia). |
|     Para cada temática de la tabla 'tematicas': embedding de (nombre \+ ' ' \+ descripcion). |
|   |
|   PASO 2 — ASIGNACIÓN A TEMÁTICAS EXISTENTES: |
|     Para cada señal, calcular similitud coseno con cada temática. |
|     Si similitud máxima \>= 0.75: asignar la señal a esa temática. |
|     Crear un cluster por temática que tenga \>= 3 señales asignadas. |
|     Señales sin temática asignada → van al paso 3\. |
|   |
|   PASO 3 — UMAP \+ HDBSCAN PARA SEÑALES RESIDUALES: |
|     Reducir embeddings de señales residuales con UMAP |
|     (n\_neighbors=15, n\_components=2, metric='cosine'). |
|     Detectar clusters con HDBSCAN (min\_cluster\_size=5). |
|     Estos son clusters emergentes (es\_emergente=1). |
|     Señales con label=-1 → cluster 'Sin clasificar'. |
|   |
|   PASO 4 — NOMBRAR CLUSTERS EMERGENTES: |
|     Para cada cluster emergente, tomar las 5 señales más cercanas |
|     al centroide. Extraer conceptos frecuentes para generar nombre. |
|   |
|   PASO 5 — GUARDAR: |
|     Insertar clusters en la tabla. Actualizar cluster\_id en senales. |
|     Guardar coordenadas UMAP de TODAS las señales (incluidas las |
|     asignadas a temáticas) en una tabla 'senales\_coords': |
|       senal\_id, x REAL, y REAL |
|   |
|   El proceso corre en background con progreso visible por paso. |
|   |
| ENDPOINTS: |
|   POST /clusters/generar |
|   GET  /clusters/estado |
|   GET  /clusters |
|   GET  /clusters/{id}/senales |
|   PATCH /clusters/{id} |
|   POST /clusters |
|   PATCH /senales/{id}/cluster |
|   GET  /clusters/mapa  → coords UMAP de todas las señales con cluster\_id |
|   |
| TAB CLUSTERS — interfaz: |
|   |
|   Botón 'Clusterizar señales' con progreso por paso. |
|   |
|   RESUMEN DE TEMÁTICAS (visible antes y después de clusterizar): |
|     Tabla: temática | nivel | señales asignadas | % del total. |
|     Ordenada por señales asignadas descendente. |
|     Permite ver qué temáticas del mapa tienen más evidencia. |
|   |
|   VISTA ESPACIAL — scatter plot SVG: |
|     Sin zoom ni pan (vista fija, tamaño fijo). |
|     Cada punto \= señal. Color \= cluster. |
|     Label visible siempre en el centroide de cada cluster |
|     (nombre del cluster en el color del cluster, fondo blanco semitransparente). |
|     Hover sobre punto: tooltip fijo con título de la señal y temática. |
|     Click sobre punto: panel lateral con detalle completo de la señal. |
|     Leyenda de colores debajo del gráfico. |
|   |
|   VISTA DE TARJETAS: |
|     Separadas en dos secciones: 'Temáticas conocidas' / 'Emergentes'. |
|     Una tarjeta por cluster: nombre, temática vinculada o badge 'emergente', |
|     driver candidato, cantidad de señales, badge validado. |
|     Click expande: señales con cita\_relevancia. |
|     Selector para mover señal a otro cluster. |
|     Edición inline de nombre y driver\_candidato. |
|     Botón 'Validar cluster'. |
|     Botón 'Crear cluster manual'. |

  **Qué deberías ver**


| ✓  Resumen de temáticas con conteo de señales asignadas |
| :---- |
| ✓  Vista espacial con labels visibles en el centroide de cada cluster |
| ✓  Clusters de temáticas conocidas separados de los emergentes |
| ✓  Señales asignadas a temáticas con similitud ≥ 0.75 |
| ✓  Clusters emergentes detectados por HDBSCAN sobre residuales |

| Qué leer en el resumen de temáticas |
| :---- |
| Temáticas con 0 señales asignadas → o son irrelevantes para el territorio o faltan fuentes. Antes de descartarlas, agregá una fuente específica de esa temática. |
| Temáticas periféricas con muchas señales → son las sorpresas. Señalan dinámicas que el grupo no anticipó como centrales. |
| Clusters emergentes (no anticipados en el mapa) → son los hallazgos más valiosos del corpus. |

| 5b | *Re-scraping dirigido* | Completar el corpus desde los clusters |
| :---: | :---- | :---- |

Una vez clusterizadas las señales, sabemos exactamente qué temáticas están sub-representadas y en qué cuadrantes STEEP falta evidencia. Este paso usa esa información para lanzar un scraping dirigido con fuentes nuevas —especialmente papers y fuentes no tecnológicas— hasta completar 100 señales por cuadrante.

| Por qué acá aparecen pocas señales no-tecnológicas y pocos papers |
| :---- |
| Las fuentes sugeridas en la Etapa 1 tienden a sobre-representar lo tecnológico porque es el dominio con más contenido web indexado y en inglés. Los cuadrantes Social, Ecológico y Político requieren fuentes especializadas que el scraper inicial no prioriza. |
| Los papers académicos raramente aparecen en Google News o RSS de medios. Necesitan fuentes específicas: arXiv, PubMed, SSRN, Redalyc, SciELO, Google Scholar RSS, Semantic Scholar. |

  **Prompt — copiá esto en Claude Code**


| Al main.py existente, agregá un sistema de re-scraping dirigido post-clusterización. |
| :---- |
|   |
| LÓGICA DEL RE-SCRAPING: |
|   1\. Leer el estado actual del corpus: |
|      \- Contar señales por cuadrante STEEP. |
|      \- Identificar cuadrantes con \< 100 señales (déficit). |
|      \- Identificar clusters/temáticas con \< 10 señales (sub-representados). |
|   2\. Por cada cuadrante con déficit, generar fuentes nuevas dirigidas. |
|   3\. Scrapear esas fuentes nuevas con la misma lógica de la Etapa 2\. |
|   4\. Repetir hasta que todos los cuadrantes tengan \>= 100 señales |
|      o hasta agotar max\_iteraciones (default: 8). |
|   |
| GENERACIÓN DE FUENTES NUEVAS POR CUADRANTE: |
|   |
|   Para SOCIAL (si tiene déficit): |
|     Google News RSS con queries: comportamiento social, políticas sociales, |
|     desigualdad, comunidades, salud pública, educación — específicas del territorio. |
|     Fuentes: CEPAL /noticias, OPS /noticias, PNUD /es/news, |
|     Redalyc categoría ciencias sociales, SciELO ciencias sociales. |
|   |
|   Para TECNOLÓGICO (si tiene déficit): |
|     arXiv RSS para categorías cs.\*, eess.\*, stat.\*. |
|     Semantic Scholar API para papers del territorio. |
|     Google Scholar RSS con queries técnicas específicas. |
|   |
|   Para ECONÓMICO (si tiene déficit): |
|     SSRN RSS para economía. BID /es/news. Banco Mundial /es/news. |
|     FMI /es/News. Google News con queries: mercado laboral, financiero, |
|     regulación económica — específicas del territorio. |
|   |
|   Para ECOLÓGICO (si tiene déficit): |
|     arXiv RSS: eess.SP, q-bio.\*. PubMed RSS para términos ambientales. |
|     UNEP /news. IPCC /report. Google News queries: cambio climático, |
|     biodiversidad, recursos naturales — específicas del territorio. |
|   |
|   Para POLÍTICO (si tiene déficit): |
|     Google News RSS: regulación, legislación, política pública — del territorio. |
|     Fuentes gubernamentales /noticias o /press. Think tanks: CIPPEC, |
|     CIDE, Wilson Center, Brookings /research. |
|   |
|   Para TEMÁTICAS SUB-REPRESENTADAS: |
|     Por cada cluster/temática con \< 10 señales: |
|     Generar 3 queries de Google News específicas para esa temática. |
|     Agregar 2 fuentes académicas relevantes (arXiv, PubMed, SSRN según dominio). |
|   |
| NUEVO ENDPOINT: |
|   POST /scraper/re-scraping |
|     Body: { objetivo\_por\_cuadrante: 100, max\_iteraciones: 8 } |
|     Responde con job\_id. |
|     El job corre en background con el loop: |
|       mientras déficit existe y iteración \< max\_iteraciones: |
|         calcular\_deficit() |
|         generar\_fuentes\_dirigidas(cuadrantes\_con\_deficit) |
|         scrapear\_fuentes\_nuevas() |
|         iteración \+= 1 |
|   |
|   GET /scraper/re-scraping/estado |
|     Devuelve: { iteracion\_actual, max\_iteraciones, |
|       progreso\_por\_cuadrante: { |
|         Social: { actual: N, objetivo: 100, deficit: M }, |
|         ... }, |
|       fuentes\_agregadas\_esta\_sesion: N, |
|       senales\_nuevas\_esta\_sesion: N } |
|   |
| TAB SEÑALES — agregar panel de re-scraping: |
|   Sección 'Re-scraping dirigido' (debajo del panel de scraping principal). |
|   Tabla de estado por cuadrante: |
|     Cuadrante | Señales actuales | Objetivo | Déficit | Barra de progreso. |
|   Botón 'Iniciar re-scraping para completar 100 por cuadrante'. |
|   Log en tiempo real de fuentes nuevas agregadas por iteración. |
|   Al completar: resumen 'Cuadrantes completados: X/5. Papers agregados: N.' |
|   Si un cuadrante no llega a 100 tras max\_iteraciones: |
|     Mostrar alerta: 'Cuadrante \[X\]: máximo alcanzado con fuentes disponibles \= N. |
|     Agregar fuentes manualmente para llegar a 100.' |

  **Qué deberías ver**


| ✓  Panel de re-scraping con tabla de estado por cuadrante STEEP |
| :---- |
| ✓  Barra de progreso por cuadrante en tiempo real |
| ✓  Papers académicos (arXiv, PubMed, SSRN, SciELO) aparecen en los resultados |
| ✓  Cuadrantes no tecnológicos reciben fuentes especializadas |
| ✓  Alerta al final si algún cuadrante no llega a 100 |

| Si un cuadrante sigue bajo después del re-scraping |
| :---- |
| Ecológico y Político son los más difíciles de completar automáticamente. Parte de su escasez puede ser real: hay menos publicaciones indexadas sobre esos ángulos en el territorio. |
| Usá la carga manual para señales encontradas en bibliografía específica, tesis, informes de organismos con acceso restringido, o materiales en idiomas no cubiertos. |
| Un cuadrante con 65-80 señales bien verificadas es más valioso que uno con 100 señales de baja calidad. |

| 6 | *Scoring de señales* | Calificar calidad con embeddings — sin IA externa |
| :---: | :---- | :---- |

El scoring de calidad no usa Claude ni ninguna IA externa. Usa los embeddings que ya generamos para medir tres dimensiones programáticas: relevancia semántica para el territorio, especificidad del contenido y verificabilidad. El resultado es un score de 0 a 100 con la razón explicada.

| Las tres dimensiones del scoring |
| :---- |
| Relevancia semántica (0-40 pts): similitud coseno del embedding de la señal con el embedding del territorio. Mide qué tan cerca está semánticamente de lo que el proyecto busca. |
| Especificidad (0-40 pts): largo del título (títulos de 4+ palabras suman), largo de la cita\_relevancia (más de 150 palabras suman), presencia de datos cuantitativos (fechas, porcentajes, cifras) en la cita. |
| Verificabilidad (0-20 pts): URL directa al contenido (no a homepage), fecha\_origen presente y válida, fuente con calidad 'útil'. |

  **Prompt — copiá esto en Claude Code**


| Al main.py existente, agregá un sistema de scoring programático de calidad |
| :---- |
| para las señales. No usar APIs externas ni Claude. Solo embeddings y reglas. |
|   |
| BASE DE DATOS — agregar a tabla 'senales': |
|   score\_calidad INTEGER DEFAULT NULL  \-- 0 a 100 |
|   score\_relevancia INTEGER DEFAULT NULL  \-- 0 a 40 |
|   score\_especificidad INTEGER DEFAULT NULL  \-- 0 a 40 |
|   score\_verificabilidad INTEGER DEFAULT NULL  \-- 0 a 20 |
|   razon\_score TEXT DEFAULT NULL  \-- explicación en texto de por qué ese score |
|   |
| ALGORITMO DE SCORING (función score\_senal(senal, territorio\_embedding)): |
|   |
|   DIMENSIÓN 1 — RELEVANCIA SEMÁNTICA (0-40 puntos): |
|     similitud \= coseno(embedding\_senal, embedding\_territorio) |
|     donde embedding\_territorio \= embedding promedio de todas las temáticas |
|     de nivel 'nucleo' de la tabla tematicas. |
|     puntos \= round(similitud \* 40\) |
|     texto\_razon \= f'Similitud con el territorio: {similitud:.2f}' |
|   |
|   DIMENSIÓN 2 — ESPECIFICIDAD (0-40 puntos): |
|     pts \= 0 |
|     \# Título informativo |
|     palabras\_titulo \= len(titulo.split()) |
|     if palabras\_titulo \>= 8: pts \+= 15 |
|     elif palabras\_titulo \>= 5: pts \+= 8 |
|     elif palabras\_titulo \>= 4: pts \+= 3 |
|     \# Cita sustancial |
|     palabras\_cita \= len(cita\_relevancia.split()) |
|     if palabras\_cita \>= 200: pts \+= 15 |
|     elif palabras\_cita \>= 100: pts \+= 8 |
|     elif palabras\_cita \>= 80: pts \+= 3 |
|     \# Datos cuantitativos en la cita (fechas, %, cifras) |
|     import re |
|     patrones \= \[r'd{4}', r'd+\[%％\]', r'$d+', r'd+.d+'\] |
|     matches \= sum(len(re.findall(p, cita\_relevancia)) for p in patrones) |
|     if matches \>= 3: pts \+= 10 |
|     elif matches \>= 1: pts \+= 5 |
|     puntos\_especificidad \= min(pts, 40\) |
|     texto\_razon \+= f' | Especificidad: título {palabras\_titulo} palabras, |
|     cita {palabras\_cita} palabras, {matches} datos cuantitativos' |
|   |
|   DIMENSIÓN 3 — VERIFICABILIDAD (0-20 puntos): |
|     pts \= 0 |
|     if url\_directa and not es\_homepage(url\_directa): pts \+= 8 |
|     if fecha\_origen and es\_fecha\_valida(fecha\_origen): pts \+= 7 |
|     if fuente.calidad \== 'útil': pts \+= 5 |
|     puntos\_verificabilidad \= pts |
|     texto\_razon \+= f' | Verificabilidad: URL directa={bool(url\_directa)}, |
|     fecha={bool(fecha\_origen)}, fuente={fuente.calidad}' |
|   |
|   SCORE FINAL: |
|     score\_total \= puntos\_relevancia \+ puntos\_especificidad \+ puntos\_verificabilidad |
|     calidad\_senal \= 'alta' if score\_total \>= 70 else 'media' if score\_total \>= 40 else 'baja' |
|     razon\_score \= texto\_razon completo |
|   |
| CUÁNDO CORRER EL SCORING: |
|   Al insertar una señal nueva (scraping o manual): calcular score automáticamente. |
|   Endpoint para recalcular todas: POST /senales/recalcular-scores |
|   Endpoint para recalcular una: POST /senales/{id}/score |
|   |
| ENDPOINTS: |
|   POST /senales/recalcular-scores  → recalcula scores de todas las señales |
|   GET  /senales/stats-calidad       → distribución de scores (histograma) |
|   |
| TAB SEÑALES — mostrar scoring: |
|   En la tabla: columna 'Score' con número (0-100) \+ badge color |
|   (verde ≥70, amarillo ≥40, rojo \<40). |
|   Al expandir una señal: mostrar los tres sub-scores con su razón. |
|   Ejemplo de razón visible: |
|     'Relevancia: 0.82 con el territorio (32/40) |
|      Especificidad: título 9 palabras, cita 210 palabras, 4 datos (35/40) |
|      Verificabilidad: URL directa ✓, fecha ✓, fuente útil ✓ (20/20) |
|      Score total: 87/100 — Alta calidad' |
|   Filtro por rango de score (slider 0-100) en la tabla. |
|   Botón 'Recalcular todos los scores'. |

  **Qué deberías ver**


| ✓  Cada señal tiene score 0-100 con tres sub-scores visibles |
| :---- |
| ✓  Badge de color (verde/amarillo/rojo) en la tabla |
| ✓  Razón del score explicada en texto al expandir la señal |
| ✓  Filtro por rango de score en la tabla |
| ✓  Score calculado automáticamente al insertar señales nuevas |

| Cómo usar el scoring para curar el corpus |
| :---- |
| Señales con score \< 40: revisalas antes de clusterizar. Muchas serán falsos positivos del scraper. |
| Señales con alta relevancia pero baja especificidad (ej: 32+8+15=55): el contenido es del territorio pero el extracto es pobre. Entrá a la URL y completá la cita\_relevancia manualmente. |
| Señales con alta especificidad pero baja relevancia (ej: 5+38+20=63): artículo muy detallado pero que se desvió del territorio. Revisá si realmente aporta o si es ruido. |

| 7 | *Tab Visualizaciones* | 14 vistas para análisis y construcción de escenarios |
| :---: | :---- | :---- |

Las visualizaciones están organizadas en tres grupos según para qué sirven en el proceso de diseño de futuros: entender el corpus, detectar dinámicas, y construir escenarios. Hacé Prompt A, B y C en orden — cada uno agrega un grupo de vistas.

| Grupo | Vistas | Para qué sirven |
| :---- | :---- | :---- |
| **Entender el corpus** | **1–5** | Ver qué hay, qué falta, de dónde viene |
| **Detectar dinámicas** | **6–9** | Qué se mueve, a qué velocidad, qué es débil pero potente |
| **Construir escenarios** | **10–14** | Priorizar drivers, cruzarlos en 2×2, profundizar en significado |

  **Prompt A — Grupo 1: Entender el corpus (vistas 1–5)**


| Al main.py existente, habilitá la tab 'Visualizaciones' con las primeras 5 vistas. |
| :---- |
| Endpoint base: GET /visualizaciones/datos → {senales, clusters, tendencias, |
| tematicas, senales\_coords (coords UMAP)} |
|   |
| VISTA 1: MAPA SEMÁNTICO DE TERRITORIOS |
|   Scatter SVG de embeddings 2D (coords UMAP ya calculadas en Clusters). |
|   Sin zoom ni pan. Tamaño fijo. |
|   Cada punto \= señal. Color \= cluster. |
|   Label siempre visible en el centroide de cada cluster |
|   (texto en color del cluster, fondo blanco semitransparente). |
|   Zonas de densidad resaltadas (círculo difuso detrás de los puntos). |
|   Huecos vacíos visibles \= territorios no explorados. |
|   Señales aisladas (cluster 'Sin clasificar') en gris. |
|   Click en punto: panel lateral con título, cita, score, URL clickeable. |
|   |
| VISTA 2: BALANCE STEEP (radar \+ heatmap) |
|   Dos sub-vistas por tab: |
|   Radar SVG: 5 ejes STEEP, área rellena proporcional a cantidad de señales. |
|   Heatmap SVG: grilla STEEP × nivel (núcleo/adyacente/periférico). |
|   Color por densidad. Click en celda: panel con señales de esa celda. |
|   Señala visualmente los puntos ciegos del corpus. |
|   |
| VISTA 3: SANKEY — nivel → STEEP → cluster → tendencia |
|   Flujo SVG de izquierda a derecha en 4 columnas. |
|   Ancho de cada flujo \= cantidad de señales. |
|   Permite ver qué temáticas alimentan qué tendencias. |
|   Hover sobre un flujo: resalta la cadena completa. |
|   Click: muestra panel con señales de ese flujo. |
|   |
| VISTA 4: SEÑAL DÉBIL vs. TENDENCIA FUERTE (Novedad × Volumen) |
|   Scatter SVG: X \= volumen de señales del cluster, |
|   Y \= novedad (distancia semántica al centroide del corpus \+ qué tan reciente). |
|   Cada burbuja \= cluster. Tamaño \= fuerza de la tendencia. |
|   Cuadrante superior-izquierdo \= señales débiles valiosas. |
|   Cuadrante inferior-derecho \= hype (mucho volumen, poca novedad). |
|   Labels siempre visibles en cada burbuja. |
|   Tooltip fijo al click: nombre, driver, señales más representativas. |
|   |
| VISTA 5: PROCEDENCIA DE FUENTES |
|   Tabla SVG: filas \= fuentes, columnas \= cuadrante STEEP. |
|   Celda \= cantidad de señales de esa fuente en ese cuadrante. |
|   Color por densidad. Ordenada por total de señales desc. |
|   Click en celda: panel con señales de esa fuente+cuadrante. |
|   Permite ver qué fuentes son más productivas y en qué cuadrante. |
|   |
| Todas las vistas con botón 'Exportar PNG'. |
| Implementar con SVG puro. Sin librerías JS externas. |
| Tooltips y paneles laterales: links clickeables en nueva pestaña. |

  **Qué deberías ver — Prompt A**


| ✓  5 tabs de visualización navegables |
| :---- |
| ✓  Mapa semántico con labels en centroides, sin zoom, puntos clickeables |
| ✓  Balance STEEP muestra puntos ciegos visualmente |
| ✓  Sankey traza el flujo de temáticas a tendencias |
| ✓  Cuadrante señal débil vs hype claramente visible |
| ✓  Tabla de procedencia ordena fuentes por productividad |

  **Prompt B — Grupo 2: Detectar dinámicas (vistas 6–9)**


| A la tab Visualizaciones, agregale 4 vistas más (sub-tabs 6-9). |
| :---- |
|   |
| VISTA 6: TRES HORIZONTES (Three Horizons) |
|   Diagrama SVG con 3 bandas diagonales: H1, H2, H3. |
|   H1 (declive): tendencias con estado 'en declive'. |
|   H2 (transición): tendencias con estado 'consolidada' o emergentes. |
|   H3 (futuro emergente): tendencias 'emergentes' \+ clusters periféricos. |
|   Cada tendencia/cluster como etiqueta posicionada en su banda. |
|   Eje X \= tiempo (horizontes: 1-3 / 3-10 / 10+ años). |
|   Color \= cuadrante STEEP predominante. |
|   Click en etiqueta: panel lateral con señales y driver. |
|   |
| VISTA 7: CURVAS DE EMERGENCIA (S-curves) |
|   Líneas SVG: una por cluster/tendencia. |
|   Eje X \= tiempo (fecha\_origen de señales). Eje Y \= señales acumuladas. |
|   Pendiente pronunciada reciente \= aceleración. |
|   Selector de clusters a mostrar (checkbox por cluster). |
|   Tooltip fijo al click en un punto de la curva: señales de ese período. |
|   Selector de rango de fechas. |
|   |
| VISTA 8: MATRIZ IMPACTO × INCERTIDUMBRE |
|   Scatter SVG: X \= incertidumbre, Y \= impacto. |
|   Cada burbuja \= driver/tendencia. Tamaño \= volumen de señales. |
|   Los campos impacto e incertidumbre se editan desde un panel lateral |
|   (slider 1-5 por driver, con botón guardar que persiste en SQLite). |
|   Cuatro zonas coloreadas: |
|     arriba-izq \= certezas (alto impacto, baja incertidumbre), |
|     arriba-der \= incertidumbres críticas → ejes de la matriz 2×2, |
|     abajo \= ruido. |
|   Labels siempre visibles. Tooltip fijo al click. |
|   Nota: agregar campos impacto INTEGER y incertidumbre INTEGER |
|   a la tabla tendencias. |
|   |
| VISTA 9: MATRIZ DE IMPACTO CRUZADO (drivers × drivers) |
|   Grilla SVG NxN donde N \= cantidad de drivers/tendencias. |
|   Celda (i,j) \= co-ocurrencia de señales entre driver i y driver j |
|   (cuántas señales comparten ambos drivers). |
|   Color: más oscuro \= más co-ocurrencia. |
|   Diagonal \= vacía. |
|   Click en celda: panel con señales compartidas. |
|   Permite detectar drivers transversales (fila con muchas celdas oscuras). |
|   |
| Botón 'Exportar PNG' en cada vista. SVG puro. |

  **Qué deberías ver — Prompt B**


| ✓  Three Horizons con tendencias posicionadas en H1/H2/H3 |
| :---- |
| ✓  S-curves con selector de clusters y pendiente visible |
| ✓  Matriz impacto × incertidumbre con sliders editables |
| ✓  Grilla de impacto cruzado identifica drivers transversales |

  **Prompt C — Grupo 3: Construir escenarios (vistas 10–14)**


| A la tab Visualizaciones, agregale 5 vistas más (sub-tabs 10-14). |
| :---- |
|   |
| VISTA 10: MAPA SEMÁNTICO (misma vista 1 pero en este grupo también) |
|   Reusar el componente de Vista 1 aquí. |
|   En este contexto: resaltar los clusters de mayor score promedio. |
|   |
| VISTA 11: MATRIZ 2×2 DE ESCENARIOS |
|   Dos selectores: Eje X \= driver A, Eje Y \= driver B |
|   (seleccionar desde las incertidumbres críticas de Vista 8). |
|   Cuatro cuadrantes \= 4 mundos posibles. |
|   Cada cuadrante tiene un nombre editable (campo de texto libre). |
|   Las señales/clusters se ubican en el cuadrante correspondiente |
|   según su relación con los dos drivers seleccionados. |
|   Permite ver qué evidencia puebla cada mundo posible. |
|   Los nombres de los 4 mundos se guardan en SQLite. |
|   |
| VISTA 12: ICEBERG / CLA POR DRIVER |
|   Selector de cluster o driver. |
|   Diagrama SVG de iceberg con 4 capas: |
|     Litania (visible): los titulares de las señales del cluster. |
|     Causas sistémicas: señales agrupadas por driver\_hipotesis. |
|     Visión de mundo: campo de texto editable por el grupo. |
|     Mito/metáfora: campo de texto editable por el grupo. |
|   Las capas 3 y 4 son texto libre que el grupo completa. |
|   Se guarda en SQLite como análisis CLA por cluster. |
|   |
| VISTA 13: HEATMAP STEEP ORIGINAL |
|   Reusar la vista del heatmap (ya implementada). |
|   |
| VISTA 14: MAPA DE BURBUJAS ORIGINAL |
|   Reusar la vista del mapa de burbujas (ya implementada). |
|   Agregar: colorear por score\_calidad en vez de cluster (toggle). |
|   |
| Botón 'Exportar PNG' en cada vista. SVG puro. |
| Nota: agregar tabla 'cla\_analisis' en SQLite: |
|   cluster\_id, vision\_mundo TEXT, mito\_metafora TEXT |
| Nota: agregar tabla 'escenarios\_2x2' en SQLite: |
|   driver\_x\_id, driver\_y\_id, nombre\_q1, nombre\_q2, nombre\_q3, nombre\_q4 |

  **Qué deberías ver — Prompt C**


| ✓  Matriz 2×2 con selectores de drivers y 4 mundos editables |
| :---- |
| ✓  Iceberg CLA con capas editables por el grupo |
| ✓  Vista 14 con toggle para colorear por score de calidad |
| ✓  Análisis CLA y nombres de escenarios persisten en SQLite |

| Cómo usar las visualizaciones en el proceso |
| :---- |
| Empezá por Vista 2 (Balance STEEP): identificá los puntos ciegos antes de analizar. |
| Vista 4 (Señal débil vs hype): los clusters arriba-izquierda son los más generativos para especular. |
| Vista 8 (Impacto × Incertidumbre): los dos drivers del cuadrante arriba-derecha son los ejes de la Matriz 2×2. |
| Vista 11 (Matriz 2×2) \+ Vista 12 (Iceberg): son las herramientas puente hacia los escenarios de la Clase 7\. |

## **Tarea — lo que tienen que entregar en Clase 4**

| 📋  Checklist de entrega |
| :---- |
| \+300 señales en la base de datos. Cada señal: URL directa, fecha de origen, extracto textual. |
| Tabla de verificación completada (5 señales chequeadas manualmente). |
| Fuentes revisadas: calidades asignadas, irrelevantes desactivadas, mejores fuentes agregadas. |
| Señales con cuadrante y driver corregidos donde el scraper se equivocó. |
| 4-6 clusters validados con nombre y driver revisados por el grupo. |
| Al menos 3 tendencias con estado, horizonte y bullets de temas internos. |
| Backup de corpus.db en la carpeta compartida del grupo. |
| Contactos de especialistas confirmados con fecha de entrevista. |

### **Backup de la base de datos**

*Pedile a Claude Code: "Copiá el archivo corpus.db a la carpeta compartida del grupo como backup\_corpus\_\[fecha de hoy\].db"*

**Lectura para Clase 4 (debate obligatorio):** *Kolko — Exposing the Magic of Design, caps. 2–3.* Foco: cómo se pasa del dato crudo al significado. Léanlo pensando en los drivers que destilaron hoy.

*Diseñar Futuros · Clase 3 · Guía de Taller para Alumnos*