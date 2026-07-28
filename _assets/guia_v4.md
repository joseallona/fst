

**DISEÑAR FUTUROS**

Guía de Taller · Clase 3

*Construir el base: \+300 señales verificadas y auditables*

| Qué van a construir hoy Una app web con servidor Python local y base de datos SQLite. El servidor hace scraping real de las fuentes, guarda todo en la base de datos, y sirve una interfaz con tabs para administrar señales, clusterizarlas, detectar tendencias y analizarlas con visualizaciones interactivas. |
| :---- |

| ⚠️  Regla de oro — sin excepciones |
| :---- |
| Cada señal apunta a un hecho concreto y verificable: una noticia, publicación, producto, regulación o dato — no a la página de inicio de una institución. |
| URL directa al contenido, fecha de origen (no de scraping), extracto textual de la fuente. |
| La app se diseña para AUDITAR: poder seguir cualquier señal hasta su origen. |

## **Qué es una señal — antes de arrancar**

Este taller produce señales de futuros, no listas de instituciones. La diferencia es crítica para que el base sea útil.

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

Claude Code hace el setup completo: verifica Python, crea la carpeta, el entorno virtual e instala las dependencias. Esta etapa se hace una sola vez.

  **Prompt — copiá esto en Claude Code**


| Necesito hacer el setup inicial de un proyecto Python para scraping web. |
| :---- |
| Usá las herramientas de terminal disponibles para ejecutar estos pasos: |
|   |
| 1\. Verificá que Python 3.9 o superior esté instalado. |
|    Si no está, avisame antes de continuar. |
| 2\. Creá una carpeta llamada 'base-futuros'. |
| 3\. Dentro de esa carpeta, creá un entorno virtual llamado 'venv'. |
| 4\. Activá el entorno virtual e instalá: |
|    fastapi, uvicorn, httpx, beautifulsoup4, aiosqlite, python-multipart |
| 5\. Verificá la instalación y creá requirements.txt. |
| 6\. Al terminar, decime exactamente el comando para levantar el servidor. |
|   |
| Si algo falla, avisame el error exacto antes de continuar. |

  **Qué deberías ver**


| ✓  Python 3.9+ confirmado |
| :---- |
| ✓  Carpeta 'base-futuros' creada |
| ✓  Dependencias instaladas sin errores — requirements.txt generado |
| ✓  Claude Code te dice el comando exacto para levantar el servidor |

| Si Claude Code no puede correr comandos de terminal |
| :---- |
| Están en Claude.ai (browser) en vez de Claude Code (app de escritorio). Descarguen Claude Code desde claude.ai/code, inicien sesión con la misma cuenta y vuelvan a este prompt. |

| 1 | *Tab Fuentes* | Armar la pirámide de fuentes |
| :---: | :---- | :---- |

El problema de un base pequeño casi siempre es un problema de mix de fuentes, no de cantidad. 87 fuentes institucionales son todas del mismo tipo: publican poco, sus webs son difíciles de scrapear y generan pocas señales por visita. La solución es armar una pirámide de tres capas con tipos de fuentes radicalmente distintos.

| Capa | Tipo | Rendimiento esperado | Ejemplos |
| :---- | :---- | :---- | :---- |
| **Alta frecuencia** | Feeds estructurados RSS / APIs | **50–200 señales por fuente** | Google News RSS, arXiv, PubMed, GDELT, Reddit (subreddits especializados), Arxiv Sanity, OpenAlex |
| **Media frecuencia** | Medios especializados y newsletters | **10–30 señales por fuente** | WIRED, MIT Tech Review, The Conversation, Nexo Político, El País Ciencia, Noticias OPS, Nature News |
| **Baja frecuencia** | Instituciones, think tanks, organismos | **2–8 señales por fuente** | OMS, OCDE, BID, CEPAL, WEF — pero apuntando al repositorio de publicaciones o RSS de noticias, no a la home |

| Distribución recomendada para llegar a 300–500 señales |
| :---- |
| 8–12 feeds de alta frecuencia (RSS o APIs) → aportan el 60–70% del volumen |
| 20–30 medios especializados → aportan 20–30% del volumen con señales más elaboradas |
| 30–50 instituciones → apuntando siempre al repositorio/RSS, no a la home |

**Reemplazá \[TEMA DEL GRUPO\] antes de pegar.**

  **Prompt — copiá esto en Claude Code**


| Creá una app web con servidor Python FastAPI y base de datos SQLite. |
| :---- |
| El territorio del proyecto es: \[TEMA DEL GRUPO\] |
|   |
| ARQUITECTURA GENERAL |
|   Archivo principal: main.py |
|   Base de datos: base.db (SQLite via aiosqlite) |
|   Frontend: static/index.html servido por FastAPI |
|   Interfaz con tabs: Fuentes activa, el resto deshabilitadas ('próximamente'). |
|   |
| BASE DE DATOS — tabla 'fuentes': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   nombre TEXT NOT NULL |
|   url TEXT NOT NULL |
|   tipo\_acceso TEXT   \-- 'rss' | 'api' | 'html' | 'api\_google\_news' |
|   cuadrante\_steep TEXT |
|   categoria TEXT     \-- 'alta\_frecuencia' | 'media\_frecuencia' | 'baja\_frecuencia' |
|   activa INTEGER DEFAULT 1 |
|   calidad TEXT DEFAULT 'sin evaluar' |
|   senales\_generadas INTEGER DEFAULT 0 |
|   fecha\_agregada TEXT |
|   |
| ENDPOINT /fuentes/sugerir: |
|   Genera fuentes organizadas en tres capas para el territorio. |
|   No sugerir homepages institucionales: apuntar siempre al feed RSS, |
|   repositorio de publicaciones, o sección de noticias con URL directa. |
|   |
|   CAPA ALTA FRECUENCIA (8-12 fuentes, tipo\_acceso: rss o api): |
|     Google News RSS con queries específicas del territorio |
|     (formato: https://news.google.com/rss/search?q=\[QUERY\]\&hl=es\&gl=AR\&ceid=AR:es) |
|     Al menos 4 queries distintas cubriendo ángulos STEEP del territorio. |
|     arXiv RSS para categorías académicas relevantes |
|     (formato: https://arxiv.org/rss/\[categoria\]) |
|     Subreddits relevantes via RSS |
|     (formato: https://www.reddit.com/r/\[subreddit\]/.rss) |
|     OpenAlex API si hay categorías académicas relevantes. |
|   |
|   CAPA MEDIA FRECUENCIA (20-30 fuentes, tipo\_acceso: rss o html): |
|     Medios especializados con RSS propio. |
|     Newsletters con archivo web públicamente accesible. |
|     Blogs de expertos con feed RSS. |
|     Priorizar fuentes en español para el contexto regional. |
|   |
|   CAPA BAJA FRECUENCIA (30-50 fuentes, tipo\_acceso: html): |
|     Instituciones y organismos, pero apuntando a: |
|       /noticias, /publicaciones, /novedades, /press-room, /research |
|     — nunca a la homepage. |
|     Think tanks con sección de reportes. |
|     Reguladores con sección de resoluciones o comunicados. |
|   |
| ENDPOINTS REST: |
|   GET  /fuentes          → lista todas |
|   POST /fuentes          → agrega una |
|   PATCH /fuentes/{id}    → edita campos |
|   DELETE /fuentes/{id}   → elimina |
|   POST /fuentes/sugerir  → genera la pirámide de fuentes |
|   |
| TAB FUENTES — interfaz: |
|   Botón 'Sugerir fuentes para este territorio'. |
|   Fuentes agrupadas por capa (alta / media / baja frecuencia), |
|   con acordeón por cuadrante STEEP dentro de cada capa. |
|   Cada fuente: badge de tipo (RSS/API/HTML), toggle activo/inactivo, |
|   badge de calidad editable, contador de señales generadas, link a URL. |
|   Formulario para agregar fuentes manualmente con campo tipo\_acceso. |
|   Contador de fuentes activas por capa en el header. |
|   |
| Diseño: fondo \#F9FAFB, acento \#1D7874, texto \#1A1A1A. |
| Sin frameworks de frontend ni dependencias externas de JS. |
| El servidor crea base.db al iniciar si no existe. |

**Para levantar el servidor:**

cd \~/Desktop/base-futuros  y después  uvicorn main:app \--reload

**Abrir el browser en: http://127.0.0.1:8000**

  **Qué deberías ver**


| ✓  Servidor corre sin errores en terminal |
| :---- |
| ✓  Interfaz muestra tab Fuentes con tres capas diferenciadas |
| ✓  Botón 'Sugerir fuentes' genera la pirámide con badges de tipo RSS/API/HTML |
| ✓  Los feeds de Google News tienen queries específicas del territorio |
| ✓  Toggle, calidad y formulario manual funcionan |
| ✓  Datos persisten al recargar |

| Antes de scrapear: calibrá las queries de Google News |
| :---- |
| Abrí cada URL de Google News RSS en el browser y verificá que devuelve noticias relevantes para el territorio. |
| Si una query trae ruido: editá la URL directamente en la tabla de fuentes para afinarla. |
| Agregá queries en inglés si el territorio tiene más cobertura en ese idioma. |

| 2 | *Tab Señales — Scraper* | Recolectar señales en profundidad |
| :---: | :---- | :---- |

El scraper maneja tres modos de acceso según el tipo de fuente. Los feeds RSS y APIs son los más productivos: pueden procesar cientos de items en minutos sin bloqueos. El HTML scraping de institucionales es más lento y menos confiable, pero cubre fuentes que no tienen feed.

  **Prompt — copiá esto en Claude Code**


| Al main.py existente, agregale el scraper y habilitá la tab 'Señales'. |
| :---- |
|   |
| BASE DE DATOS — tabla 'senales': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   fuente\_id INTEGER REFERENCES fuentes(id) |
|   titulo TEXT NOT NULL |
|   resumen TEXT NOT NULL |
|   url\_directa TEXT NOT NULL |
|   fecha\_origen TEXT |
|   extracto\_original TEXT NOT NULL |
|   cuadrante\_steep TEXT |
|   driver\_hipotesis TEXT |
|   calidad\_senal TEXT DEFAULT 'sin evaluar' |
|   cluster\_id INTEGER |
|   tendencia\_id INTEGER |
|   fecha\_scrapeada TEXT |
|   |
| BASE DE DATOS — tabla 'scraper\_jobs': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   estado TEXT DEFAULT 'detenido' |
|   fuentes\_total INTEGER DEFAULT 0 |
|   fuentes\_procesadas INTEGER DEFAULT 0 |
|   senales\_encontradas INTEGER DEFAULT 0 |
|   errores TEXT DEFAULT '\[\]' |
|   iniciado\_en TEXT |
|   detenido\_en TEXT |
|   |
| SCRAPER — tres modos de acceso: |
|   |
| MODO RSS (tipo\_acceso \= 'rss'): |
|   Parsear el feed XML con feedparser o xml.etree. |
|   Extraer todos los items del feed. |
|   Por cada item: |
|     titulo → campo titulo de la señal |
|     link → url\_directa (DEBE ser la URL del artículo, no del feed) |
|     summary o description → extracto\_original |
|     published → fecha\_origen |
|   Paginación: si el feed tiene \<link rel='next'\> seguirlo hasta 3 páginas. |
|   Rendimiento esperado: 20-200 señales por feed. |
|   |
| MODO API GOOGLE NEWS (tipo\_acceso \= 'api\_google\_news'): |
|   Parsear la URL como feed RSS (Google News usa formato RSS estándar). |
|   Extraer título, link, snippet, fecha de cada resultado. |
|   Para cada resultado: hacer GET al artículo original para extraer |
|   el primer párrafo sustancial (80+ palabras) como extracto\_original. |
|   Si el artículo está bloqueado (paywall, CAPTCHA): guardar el snippet |
|   del feed como extracto\_original y marcar calidad\_senal \= 'extracto\_parcial'. |
|   Rendimiento esperado: 50-100 señales por query. |
|   |
| MODO HTML (tipo\_acceso \= 'html'): |
|   Hacer GET a la URL con httpx (timeout 15s, headers de browser real). |
|   Parsear con BeautifulSoup. |
|   Buscar en este orden: |
|     1\. Elementos \<article\> con título y párrafo propio |
|     2\. Links a sub-páginas que contengan 'noticia', 'news', 'publicacion', |
|        'report', 'release' en la URL — seguirlos y extraer el contenido |
|     3\. Párrafos con 80+ palabras en el contenido principal |
|   Descartar: menús de navegación, footers, sidebars, texto de menos de 80 palabras. |
|   Para cada item encontrado: verificar que tiene URL directa propia |
|   (no la misma URL de la fuente). Si no tiene URL directa: descartar. |
|   Paginación: si hay botón 'siguiente' o '?page=N', seguir hasta 5 páginas. |
|   Rendimiento esperado: 5-30 señales por fuente. |
|   |
| COMPORTAMIENTO GENERAL DEL SCRAPER: |
|   No arranca automáticamente. Requiere acción del usuario. |
|   Corre en background (async). |
|   Procesa fuentes activas en orden: primero alta frecuencia, luego media, luego baja. |
|   Por cada fuente procesada: |
|     Actualiza fuentes\_procesadas en el job. |
|     Actualiza senales\_encontradas en el job. |
|     Actualiza calidad y senales\_generadas en la tabla fuentes: |
|       útil       → 5+ señales con URL directa y extracto |
|       poca señal → menos de 5 señales válidas |
|       sin acceso → timeout, error HTTP, bloqueo |
|   Puede detenerse en cualquier momento (señal de stop async). |
|   No inserta duplicados: verificar url\_directa antes de insertar. |
|   |
| ENDPOINTS: |
|   POST /scraper/iniciar   → lanza el scraper en background |
|   POST /scraper/detener   → señaliza la detención |
|   GET  /scraper/estado    → job activo con todos sus campos |
|   GET  /senales           → lista con filtros: ?cuadrante=\&calidad=\&q=\&fuente\_id= |
|   POST /senales           → carga manual |
|   PATCH /senales/{id}     → edita cualquier campo |
|   DELETE /senales/{id}    → elimina |
|   PATCH /senales/lote     → edita cuadrante o calidad en lote |
|   DELETE /senales/lote    → elimina lista de ids |
|   |
| TAB SEÑALES — interfaz: |
|   |
|   Panel de control del scraper (top de la tab, siempre visible): |
|     Botón 'Iniciar scraping' (deshabilitado si ya corre). |
|     Botón 'Detener' (visible solo cuando corre). |
|     Barra de progreso: fuentes procesadas / total, con capa actual. |
|     Contadores: señales encontradas, duplicados descartados, errores. |
|     Lista de errores colapsable. |
|     Estado: 'detenido' | 'corriendo — alta frecuencia' | |
|     'corriendo — media frecuencia' | 'corriendo — baja frecuencia' | 'completado'. |
|     Polling a /scraper/estado cada 2 segundos cuando corre. |
|   |
|   Formulario de carga manual (colapsable): |
|     Campos: titulo, resumen, url\_directa, fecha\_origen, |
|     extracto\_original, cuadrante\_steep, driver\_hipotesis, calidad\_senal. |
|     Validación: url\_directa y extracto\_original obligatorios. |
|   |
|   Tabla de señales: |
|     Columnas: titulo, cuadrante, driver, calidad, fuente, fecha\_origen. |
|     Click en fila expande: resumen, extracto, url\_directa clickeable, fuente. |
|     Edición inline de cuadrante\_steep, driver\_hipotesis, calidad\_senal. |
|     Filtros: cuadrante, calidad, fuente, con/sin driver. |
|     Búsqueda por texto en titulo y resumen. |
|     Checkboxes para selección múltiple. |
|     Toolbar de lote: asignar cuadrante, asignar calidad, eliminar. |
|     Contador total en el header de la tab. |

  **Qué deberías ver**


| ✓  Panel scraper con Iniciar/Detener y estado por capa (alta/media/baja) |
| :---- |
| ✓  Feeds RSS procesan 20-200 items cada uno |
| ✓  Google News RSS genera señales con URL directa al artículo |
| ✓  HTML scraping sigue sub-páginas y paginación |
| ✓  Calidad de fuentes se actualiza durante el scraping |
| ✓  Tabla con filtros, edición inline, checkboxes y toolbar de lote |

| Estrategia si el base queda por debajo de 300 |
| :---- |
| Primero: revisá las fuentes de alta frecuencia con 'sin acceso'. Probá editar la query de Google News para ampliar el rango o agregar términos en inglés. |
| Segundo: agregá más subreddits o feeds arXiv. Un subreddit activo puede dar 100+ señales solo. |
| Tercero: para institucionales que bloquean el scraper, buscá su feed RSS manualmente (muchas organizaciones tienen /feed o /rss aunque no lo publiciten) y cambiá el tipo\_acceso a 'rss'. |
| Cuarto: usá la carga manual para señales encontradas durante la revisión bibliográfica o en conversaciones del grupo. |

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

No es optativo. Elegí 5 señales al azar —una por cuadrante STEEP— y verificalas antes de clusterizar. Un base con datos inventados no sirve para nada.

| \# | Título de la señal | URL — ¿abre? | ¿Dice lo que la IA afirma? | Acción |
| :---- | :---- | :---- | :---- | :---- |
| **1** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |
| **2** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |
| **3** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |
| **4** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |
| **5** |  | ☐ Sí   ☐ No   ☐ Rota | ☐ Sí  ☐ Parcial  ☐ No | ☐ OK ☐ Editar ☐ Borrar |

| 🚨  Qué hacer según los resultados |
| :---- |
| 0-1 con problema → base confiable, seguí con la Etapa 5\. |
| 2-3 con problema → revisá las fuentes que generaron esas señales. Desactivalas y agregá fuentes más granulares (repositorios de publicaciones, RSS, páginas de resultados específicos). |
| 4-5 con problema → el parser de BeautifulSoup está extrayendo contenido equivocado. Pedile a Claude Code que revise qué selectores CSS usa para encontrar artículos. |

| 5 | *Tab Clusters* | Agrupar señales para ver patrones |
| :---: | :---- | :---- |

Este prompt habilita la tab Clusters. El algoritmo agrupa las señales por similitud temática. El grupo audita: la IA agrupa por palabras, ustedes deciden si el agrupamiento tiene sentido real.

  **Prompt — copiá esto en Claude Code**


| Al main.py existente, habilitá la tab 'Clusters'. |
| :---- |
|   |
| BASE DE DATOS — tabla 'clusters': |
|   id INTEGER PRIMARY KEY AUTOINCREMENT |
|   nombre TEXT NOT NULL |
|   driver\_candidato TEXT |
|   descripcion TEXT |
|   validado INTEGER DEFAULT 0 |
|   fecha\_creado TEXT |
|   |
| ALGORITMO: |
|   Analiza titulo \+ resumen \+ driver\_hipotesis de todas las señales. |
|   Agrupa por similitud temática (TF-IDF o similitud de coseno, |
|   la implementación más simple posible). |
|   Genera 6-12 clusters. Mínimo 5 señales por cluster. |
|   Señales que no encajan → cluster 'Sin clasificar'. |
|   Actualiza cluster\_id en cada señal. |
|   |
| ENDPOINTS: |
|   POST /clusters/generar       → corre el algoritmo |
|   GET  /clusters               → lista con conteo de señales |
|   GET  /clusters/{id}/senales  → señales de un cluster |
|   PATCH /clusters/{id}         → edita nombre, driver\_candidato, validado |
|   POST /clusters               → crea cluster manual |
|   PATCH /senales/{id}/cluster  → mueve señal a otro cluster |
|   |
| TAB CLUSTERS — interfaz: |
|   Botón 'Clusterizar señales'. |
|   Tarjetas: nombre, driver candidato, cantidad de señales, badge validado. |
|   Click expande: lista de señales del cluster con resumen. |
|   Selector por señal para moverla a otro cluster. |
|   Edición inline de nombre y driver\_candidato. |
|   Botón 'Validar cluster'. |
|   Botón 'Crear cluster manual'. |

  **Qué deberías ver**


| ✓  Tab Clusters activa con botón de clusterización |
| :---- |
| ✓  6-12 tarjetas con nombre y driver candidato |
| ✓  Señales expandibles y movibles entre clusters |
| ✓  Edición inline y botón Validar funcionando |

| Qué auditar en cada cluster antes de validarlo |
| :---- |
| ¿Las señales hablan de lo mismo o la IA agrupó por palabras similares sin relación real? |
| ¿El driver candidato es estructural (opera 10+ años) o es una tendencia superficial? |
| Un cluster se valida solo cuando todo el grupo está de acuerdo. Al final: 4-6 drivers, cada uno con respaldo en al menos 10 señales. |

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

| 7 | *Tab Visualizaciones* | Leer el base de otra manera |
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
| Backup de base.db en la carpeta compartida del grupo. |
| Contactos de especialistas confirmados con fecha de entrevista. |

### **Backup de la base de datos**

*Pedile a Claude Code: "Copiá el archivo base.db a la carpeta compartida del grupo como backup\_base\_\[fecha de hoy\].db"*

**Lectura para Clase 4 (debate obligatorio):** *Kolko — Exposing the Magic of Design, caps. 2–3.* Foco: cómo se pasa del dato crudo al significado. Léanlo pensando en los drivers que destilaron hoy.

*Diseñar Futuros · Clase 3 · Guía de Taller para Alumnos*