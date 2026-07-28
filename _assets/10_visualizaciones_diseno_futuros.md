# 10 visualizaciones para el corpus de Diseño de Futuros

Como esto es **diseño de futuros**, las visualizaciones más valiosas no son "lindos gráficos" sino instrumentos de método: tienen que ayudar a pasar de *señales sueltas* → *patrones* → *drivers* → *escenarios* (que es a dónde van en la Clase 7).

Las 10 están ordenadas de "entender el corpus" hacia "decidir por dónde avanzar", cada una atada a los datos que **ya tenemos**: cuadrante STEEP, cluster, driver, tendencia (estado/horizonte/fuerza), fecha de origen, nivel (núcleo/adyacente/periférico), similitud semántica, calidad y fuente.

---

## 1. Mapa semántico de territorios (scatter de embeddings + densidad)

**Qué muestra:** cada señal como punto en el espacio 2D (ya tenemos las coords UMAP), con "manchas" de densidad y los huecos vacíos resaltados.

**Análisis que permite:** identificar los **territorios temáticos reales** del corpus (no los que supusieron, los que emergieron); detectar **zonas vacías** = futuros no explorados / dónde falta sumar fuentes; ver **señales aisladas lejos de todo cluster** = candidatas a señal débil. Es el "mapa del terreno" antes de decidir.

## 2. Tres Horizontes (Three Horizons)

**Qué muestra:** eje X = tiempo, tres bandas: H1 (presente que declina), H2 (transición/disrupción), H3 (futuro emergente). Ubicás tendencias según `estado` (consolidada → H1, emergente → H2, débil/periférica → H3) y `horizonte`.

**Análisis que permite:** el marco más usado en futuros para **ver qué está muriendo, qué está naciendo y qué es visionario**, y las tensiones entre ellos. Responde directo "¿por dónde avanzar?": las apuestas viven en H2-H3.

## 3. Matriz 2×2 de incertidumbres críticas (cruz de escenarios)

**Qué muestra:** elegís dos drivers de **alta incertidumbre + alto impacto** como ejes; los clusters/tendencias se ubican en los 4 cuadrantes → 4 mundos posibles.

**Análisis que permite:** es **la herramienta puente hacia los escenarios** (Clase 7). Permite construir 4 futuros coherentes y ver qué señales pueblan cada uno.
> *Nota: requiere que el grupo tagueee impacto/incertidumbre por driver — un campo que hoy no tenemos, fácil de agregar.*

## 4. Matriz Impacto × Incertidumbre (priorización de drivers)

**Qué muestra:** cada driver/tendencia como burbuja; X = incertidumbre, Y = impacto, tamaño = volumen de señales.

**Análisis que permite:** la **clasificación clásica de futuros**:
- arriba-izquierda (alto impacto / baja incertidumbre) = *certezas* para planificar;
- arriba-derecha = *incertidumbres críticas* → de ahí salen los ejes de la matriz 2×2;
- abajo = ruido.

Literalmente te dice **dónde poner energía**.

## 5. Balance STEEP (radar + heatmap de cobertura)

**Qué muestra:** distribución de señales por categoría STEEP, cruzada con nivel (núcleo/adyacente/periférico) o con calidad.

**Análisis que permite:** detectar **puntos ciegos** — ya vimos que Ambiental y Político están casi vacíos. Un futuro pensado solo desde lo Tecnológico/Social es un futuro sesgado. Sirve para **decidir dónde sumar fuentes** y para chequear que el análisis no quede cojo.

## 6. Curvas de emergencia (S-curves de volumen por cluster en el tiempo)

**Qué muestra:** una curva por cluster/tendencia, señales acumuladas por mes (tenemos `fecha_origen`).

**Análisis que permite:** leer la **velocidad y madurez** de cada dinámica por la pendiente: aceleración (emergente), saturación (consolidada), caída (en declive). Ayuda a **estimar horizontes temporales** y a distinguir lo que está despegando de lo que ya pasó su pico.

## 7. Señal débil vs. tendencia fuerte (Novedad × Volumen)

**Qué muestra:** scatter, X = volumen de señales del cluster, Y = novedad (distancia semántica al centro del corpus + cuán reciente + cuán periférica).

**Análisis que permite:** separar **hype** (mucho volumen, poca novedad) de **emergencia genuina**, y sobre todo **cazar señales débiles** (poco volumen, alta novedad) — que la guía señala como "las más generativas". Es el cuadrante de oro para el diseño de futuros.

## 8. Matriz de impacto cruzado (drivers × drivers)

**Qué muestra:** grilla NxN de drivers; cada celda = co-ocurrencia o influencia entre dos drivers (basada en cuántas señales/clusters comparten o en proximidad semántica).

**Análisis que permite:** mirada **sistémica**: qué drivers son **transversales** (afectan a muchos otros = puntos de apalancamiento), qué bucles de refuerzo aparecen. Pasa de "lista de tendencias" a "sistema de fuerzas" — clave para escenarios robustos.

## 9. Sankey de procedencia: Nivel → STEEP → Cluster → Tendencia

**Qué muestra:** flujo de cómo las temáticas (núcleo/adyacente/periférico) desembocan en cuadrantes, clusters y tendencias.

**Análisis que permite:** **trazabilidad y atrición** — ver qué temáticas alimentan qué tendencias, cuántas señales sobreviven hasta una tendencia validada, y de dónde salen las sorpresas (¿las periféricas realmente generaron tendencias inesperadas?). Audita el embudo completo del corpus.

## 10. Iceberg / Análisis Causal por Capas (CLA) por driver

**Qué muestra:** para un cluster/driver elegido, las señales organizadas en 4 capas: titulares (litania) → causas sistémicas → visión de mundo → mito/metáfora.

**Análisis que permite:** **profundizar del dato crudo al significado** — exactamente el salto que pide la lectura de Kolko para la Clase 4. Convierte un montón de noticias en una interpretación con profundidad, que es lo que distingue un driver real de una lista de links.

---

## Cómo encajan en el recorrido del taller

| Etapa del proceso | Visualizaciones |
| :---- | :---- |
| **Entender el corpus** (dónde está parado el material, qué falta, de dónde viene) | 1, 5, 9 |
| **Detectar dinámicas** (qué se mueve, a qué velocidad, qué es débil pero potente) | 2, 6, 7 |
| **Decidir y construir escenarios** (priorizar drivers, cruzarlos en 2×2, profundizar en significado) | 3, 4, 8, 10 |

## Esfuerzo de implementación

- **Salen directo con los datos actuales:** 1, 6, y parte de 8/9.
- **Necesitan un dato nuevo:**
  - **3 y 4** → un rating de *impacto* e *incertidumbre* por driver.
  - **10** → asignar señales a las 4 capas CLA.

Todos son campos simples de agregar al modelo existente.
