

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

| 5 | *Tab Clusters* | Clusterizar por significado, no por palabras |
| :---: | :---- | :---- |

TF-IDF agrupa señales que comparten palabras. Los embeddings semánticos agrupan señales que comparten significado, aunque usen vocabulario distinto. La diferencia es crítica: 'desempleo tecnológico' y 'automatización del trabajo' son el mismo concepto pero TF-IDF los pone en clusters distintos.

| Cómo funciona el clustering semántico |
| :---- |
| 1\. Sentence-transformers convierte cada señal en un vector de 384 dimensiones que captura su significado. 2\. UMAP reduce esas dimensiones a 2D preservando la estructura semántica. 3\. HDBSCAN detecta clusters de densidad en ese espacio 2D — sin necesidad de definir cuántos clusters querés a priori. 4\. Claude recibe los clusters y genera el nombre y driver candidato de cada uno a partir de las señales que contiene. |

  **Prompt — copiá esto en Claude Code**


| Al main.py existente, habilitá la tab 'Clusters' con clustering semántico. |
| :---- |
|   |
| DEPENDENCIAS ADICIONALES (ya instaladas en el setup): |
|   sentence-transformers, umap-learn, hdbscan, numpy, scikit-learn |
|   |
| BASE DE DATOS — tabla 'clusters': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   nombre TEXT NOT NULL |
|   driver\_candidato TEXT |
|   descripcion TEXT |
|   razonamiento TEXT  \-- por qué estas señales van juntas (generado por el algoritmo) |
|   validado INTEGER DEFAULT 0 |
|   fecha\_creado TEXT |
|   |
| ALGORITMO DE CLUSTERING SEMÁNTICO: |
|   1\. GENERAR EMBEDDINGS: |
|      Cargar modelo 'paraphrase-multilingual-MiniLM-L12-v2' |
|      (multilingüe, funciona en español e inglés). |
|      Para cada señal: concatenar titulo \+ ' ' \+ cita\_relevancia. |
|      Generar embedding de ese texto concatenado. |
|      Guardar embeddings en memoria (numpy array). |
|   |
|   2\. REDUCIR DIMENSIONES CON UMAP: |
|      Parámetros: n\_neighbors=15, n\_components=2, metric='cosine'. |
|      Resultado: coordenadas 2D para cada señal. |
|   |
|   3\. DETECTAR CLUSTERS CON HDBSCAN: |
|      Parámetros: min\_cluster\_size=5, metric='euclidean'. |
|      HDBSCAN asigna automáticamente el número de clusters. |
|      Señales con label=-1 son 'ruido' → van a cluster 'Sin clasificar'. |
|   |
|   4\. NOMBRAR CLUSTERS CON LÓGICA INTERNA: |
|      Para cada cluster, tomar las 5 señales más representativas |
|      (las más cercanas al centroide del cluster en el espacio 2D). |
|      Extraer los conceptos más frecuentes de esas señales. |
|      Generar nombre del cluster y driver\_candidato a partir de esos conceptos. |
|      Guardar en la tabla clusters. |
|      Actualizar cluster\_id en cada señal. |
|   |
|   El proceso corre en background (puede tardar 1-3 minutos con 500 señales). |
|   Mostrar progreso: 'Generando embeddings... X/N', 'Reduciendo dimensiones...', |
|   'Detectando clusters...', 'Nombrando clusters...' |
|   |
| ENDPOINTS: |
|   POST /clusters/generar       → lanza el algoritmo en background |
|   GET  /clusters/estado        → progreso del proceso |
|   GET  /clusters               → lista con conteo de señales |
|   GET  /clusters/{id}/senales  → señales de un cluster |
|   PATCH /clusters/{id}         → edita nombre, driver\_candidato, validado |
|   POST /clusters               → crea cluster manual |
|   PATCH /senales/{id}/cluster  → mueve señal a otro cluster |
|   GET  /clusters/mapa          → coordenadas 2D de todas las señales |
|                                  para visualización del espacio semántico |
|   |
| TAB CLUSTERS — interfaz: |
|   Botón 'Clusterizar señales' con barra de progreso por etapa. |
|   VISTA ESPACIAL (arriba): scatter plot SVG de las señales en espacio 2D. |
|     Cada punto \= señal. Color \= cluster. |
|     Hover sobre punto: título de la señal. |
|     Click sobre punto: abre panel con detalle de la señal. |
|     Zoom y pan disponibles. |
|   VISTA DE TARJETAS (abajo): una tarjeta por cluster. |
|     Nombre, driver candidato, cantidad de señales, badge validado. |
|     Click expande: lista de señales con cita\_relevancia. |
|     Selector para mover señal a otro cluster. |
|     Edición inline de nombre y driver\_candidato. |
|     Botón 'Validar cluster'. |
|     Botón 'Crear cluster manual'. |

  **Qué deberías ver**


| ✓  Tab Clusters activa con barra de progreso por etapa |
| :---- |
| ✓  Vista espacial: scatter plot 2D con señales coloreadas por cluster |
| ✓  Clusters agrupan por significado — señales con vocabulario distinto pero mismo concepto van juntas |
| ✓  Tarjetas con nombre, driver candidato y señales expandibles |
| ✓  Edición inline y Validar funcionando |

| Qué auditar en cada cluster |
| :---- |
| Mirá el scatter plot: ¿los clusters están bien separados o hay mucha superposición? Superposición indica temáticas que el modelo no logra distinguir bien. |
| Leé las 5 señales más representativas (las más cercanas al centro del cluster). ¿Capturan el concepto del cluster? |
| Si un cluster mezcla conceptos distintos: dividilo en dos usando 'Crear cluster manual' y moviendo señales. |
| Un cluster se valida cuando todo el grupo acuerda que las señales comparten una dinámica real, no solo vocabulario. |

| 6 | *Tab Tendencias* | ¿Señal aislada o patrón que crece? |
| :---: | :---- | :---- |

Este prompt habilita la tab Tendencias. Una señal sola es una observación. Varias señales del mismo tipo, de distintas fuentes y en el tiempo, forman una tendencia.

  **Prompt — copiá esto en Claude Code**


| Al main.py existente, habilitá la tab 'Tendencias'. |
| :---- |
|   |
| BASE DE DATOS — tabla 'tendencias': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   nombre TEXT NOT NULL |
|   estado TEXT |
|   descripcion TEXT |
|   driver\_asociado TEXT |
|   fuerza TEXT |
|   horizonte TEXT |
|   fecha\_detectada TEXT |
|   |
| Tabla 'tendencia\_clusters': |
|   tendencia\_id INTEGER REFERENCES tendencias(id) |
|   cluster\_id INTEGER REFERENCES clusters(id) |
|   |
| ALGORITMO DE DETECCIÓN: |
|   Analiza los clusters validados. |
|   Evalúa por cluster: |
|     \- Distribución temporal de señales (¿se concentran en fechas recientes?) |
|     \- Diversidad de fuentes (¿cuántos cuadrantes STEEP la mencionan?) |
|     \- Volumen de señales |
|   Clasifica: emergente | consolidada | en declive |
|   Asigna horizonte: '1-3 años' | '3-10 años' | '10+ años' |
|   Identifica señales sin cluster\_id ('señales huérfanas'). |
|   |
| ENDPOINTS: |
|   POST /tendencias/detectar  → corre el análisis |
|   GET  /tendencias           → lista de tendencias |
|   GET  /tendencias/{id}      → detalle con clusters y señales |
|   PATCH /tendencias/{id}     → edita estado, horizonte, driver\_asociado |
|   POST /tendencias           → crea tendencia manual |
|   GET  /senales/huerfanas    → señales sin cluster |
|   |
| TAB TENDENCIAS — interfaz: |
|   Botón 'Detectar tendencias'. |
|   Lista con badge de estado: verde=emergente, amarillo=consolidada, |
|   gris=en declive. |
|   Click en tendencia expande: |
|     \- Descripción de la tendencia. |
|     \- Bullets con los temas principales de las señales que la componen |
|       (un bullet por cluster asociado, con su driver candidato). |
|     \- Cantidad de señales, cuadrantes STEEP cubiertos, rango de fechas. |
|   Edición de estado, horizonte y driver\_asociado desde la vista expandida. |
|   Botón 'Agregar tendencia manualmente'. |
|   Panel lateral: señales huérfanas (sin cluster asignado). |

  **Qué deberías ver**


| ✓  Tab Tendencias activa con botón de detección |
| :---- |
| ✓  Lista de tendencias con badges de color |
| ✓  Cada tendencia expandible con bullets de temas internos |
| ✓  Panel de señales huérfanas visible |
| ✓  Edición de estado y horizonte desde la vista expandida |

| Cómo leer los estados |
| :---- |
| Emergente \+ fuerza alta → candidata a driver. Seguila. |
| Consolidada → probablemente una certeza en la matriz 2×2 (clase 7), no una incertidumbre. |
| En declive → ¿qué mundo emerge cuando esta dinámica desaparece? |
| Señal huérfana → no la descarten. Las más raras son las más generativas. |

| 7 | *Tab Visualizaciones* | Leer el corpus de otra manera |
| :---: | :---- | :---- |

Cuatro vistas analíticas con herramientas de exploración. Si el primer prompt resulta largo para Claude Code, hacé Prompt A y después Prompt B.

  **Prompt A — Heatmap STEEP y mapa de burbujas**


| Al main.py existente, habilitá la tab 'Visualizaciones' con 2 sub-tabs. |
| :---- |
|   |
| ENDPOINT: |
|   GET /visualizaciones/datos → devuelve {senales, clusters, tendencias} |
|   |
| SUB-TAB 1: HEATMAP STEEP |
| Pregunta: ¿en qué cuadrantes hay más señales y cuáles están vacíos? |
|   Grilla SVG 5×3 (cuadrantes × relevancia alta/media/sin evaluar). |
|   Color por densidad: blanco=0, verde oscuro=máximo. |
|   Click en celda: panel lateral con señales de esa celda, |
|   cada una con su URL directa clickeable. |
|   |
| SUB-TAB 2: MAPA DE BURBUJAS |
| Pregunta: ¿cómo se distribuyen las señales entre clusters? |
|   SVG con burbujas. Eje X \= cuadrante (1-5). Eje Y \= calidad de señal. |
|   Tamaño \= relevancia. Color \= cluster. |
|   Tooltip fijo: aparece al hacer click (no al hover) y permanece |
|   visible hasta que el usuario haga click en otro lugar. |
|   Tooltip muestra: título, resumen, URL como link clickeable, |
|   driver-hipótesis, cuadrante, cluster. |
|   Zoom in/out con rueda del mouse o botones \+/-. |
|   Pan (arrastrar) cuando está en zoom. |
|   Botón 'Resetear vista'. |
|   Filtros por cluster y por cuadrante. |
|   Botón 'Exportar imagen PNG'. |
|   |
| Implementar ambas con SVG puro. Sin librerías externas de JS. |

  **Prompt B — Línea de tiempo y grafo de drivers**


| A la tab Visualizaciones, agregale 2 sub-tabs más. |
| :---- |
|   |
| SUB-TAB 3: LÍNEA DE TIEMPO |
| Pregunta: ¿qué dinámicas están acelerando? |
|   SVG con líneas. Eje X \= tiempo. Eje Y \= señales nuevas por período. |
|   Una línea por tendencia o cluster. |
|   Tooltip fijo al click (no al hover): muestra nombre de tendencia/cluster |
|   y las señales del período con sus URLs clickeables. |
|   Zoom horizontal con rueda del mouse o slider de rango. |
|   Pan horizontal cuando está en zoom. |
|   Selector de rango de fechas. |
|   Botón 'Exportar imagen PNG'. |
|   |
| SUB-TAB 4: GRAFO DE DRIVERS Y CLUSTERS |
| Pregunta: ¿qué drivers son transversales? |
|   SVG con nodos y aristas. |
|   Nodos grandes \= drivers. Nodos medianos \= clusters. |
|   Aristas \= relación cluster-driver. |
|   Color de nodo \= cuadrante STEEP predominante. |
|   Click en driver: resalta sus clusters y muestra panel lateral |
|   con descripción y conteo de señales. |
|   Click en cluster: panel lateral con bullets de sus señales |
|   (título \+ URL directa clickeable por señal). |
|   Zoom in/out con rueda del mouse o botones \+/-. |
|   Pan (arrastrar el grafo) cuando está en zoom. |
|   Botón 'Resetear posiciones'. |
|   Botón 'Exportar imagen PNG'. |
|   |
| Implementar con SVG puro. Sin librerías externas de JS. |
| En todos los tooltips y paneles laterales: los links son clickeables |
| y abren en nueva pestaña. |

  **Qué deberías ver**


| ✓  4 sub-tabs de visualización navegables |
| :---- |
| ✓  Heatmap con click que filtra señales con URLs clickeables |
| ✓  Mapa de burbujas: tooltip fijo al click, zoom y pan funcionando |
| ✓  Línea de tiempo: tooltip fijo al click, zoom horizontal y selector de rango |
| ✓  Grafo: click en driver y cluster abre panel con señales y URLs |
| ✓  Exportar PNG en cada vista |

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