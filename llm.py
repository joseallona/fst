"""
Generación automática con LLM local (Ollama).

Dos tareas generativas para la construcción de escenarios:
  - sugerir_ejes: propone 2 incertidumbres críticas con polos opuestos (JSON).
  - redactar_escenarios: escribe 1 narrativa por cuadrante (JSON).

Todo local y gratis: pega contra Ollama en localhost:11434. Modelo configurable
por la variable de entorno OLLAMA_MODEL (default qwen3:30b-a3b, MoE, rápido).
"""

import json
import os
import re

import httpx

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3:30b-a3b")


class LLMError(Exception):
    pass


async def disponible():
    """True si el servidor de Ollama responde."""
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags", timeout=2.5)
        return r.status_code == 200
    except Exception:
        return False


async def _chat(system, user, temperature=0.7, timeout=300):
    payload = {
        "model": OLLAMA_MODEL, "stream": False, "think": False, "format": "json",
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
        "options": {"temperature": temperature},
    }
    try:
        async with httpx.AsyncClient() as c:
            r = await c.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=timeout)
        r.raise_for_status()
    except httpx.ConnectError:
        raise LLMError(f"Ollama no responde en {OLLAMA_URL}. ¿Está corriendo `ollama serve`?")
    except httpx.HTTPStatusError as e:
        raise LLMError(f"Ollama devolvió {e.response.status_code} "
                       f"(¿el modelo '{OLLAMA_MODEL}' está instalado?).")
    except Exception as e:
        raise LLMError(f"Error llamando a Ollama: {e}")
    return r.json().get("message", {}).get("content", "")


def _parse_json(txt):
    txt = (txt or "").strip()
    m = re.search(r"\{.*\}", txt, re.S)
    if m:
        txt = m.group(0)
    return json.loads(txt)


async def titulo_cluster(senales):
    """Convierte un cluster (lista de señales) en un título-frase corto en español.

    Reemplaza los nombres tipo 'Iran · Trump · Health' (top-3 palabras) por una
    frase breve y legible que capture el patrón común del cluster.
    """
    titulos = [s.get("titulo", "").strip() for s in senales if s.get("titulo")][:14]
    lista = "\n".join(f"- {t}" for t in titulos) or "- (sin títulos)"
    system = ("Sos analista de prospectiva estratégica y rotulás clusters de señales "
              "de futuro. Respondés siempre en español.")
    user = f"""Estos son los titulares de las señales que componen UN cluster:

{lista}

Escribí un rótulo breve para el cluster: una frase corta y descriptiva de 4 a 9
palabras que capture el patrón o tema común. Reglas:
- Frase legible por un humano, no una lista de palabras sueltas.
- Sin dos puntos, sin comillas, sin punto final, sin el prefijo "Cluster".
- Si los titulares son heterogéneos, nombrá el hilo conductor más plausible.

Respondé SOLO con JSON válido, sin texto adicional: {{"titulo":"..."}}"""
    j = _parse_json(await _chat(system, user, temperature=0.4))
    return (j.get("titulo") or "").strip().strip('"').rstrip(".")


async def sugerir_ejes(senales, territorio, horizonte):
    """Devuelve dict con eje_x_label/pos/neg y eje_y_label/pos/neg."""
    lista = "\n".join(f"{i+1}. {s.get('titulo', '')}" for i, s in enumerate(senales[:20]))
    system = ("Sos un experto en prospectiva estratégica y diseño de escenarios por "
              "el método de matriz 2x2 de incertidumbres críticas (GBN/Shell). "
              "Respondés siempre en español.")
    user = f"""Territorio del proyecto: {territorio}.
Horizonte temporal: {horizonte} años.

A partir de estas señales de futuro, identificá las DOS incertidumbres críticas más
importantes e INDEPENDIENTES entre sí para construir una matriz de escenarios 2x2.

Reglas:
- Cada eje es una INCERTIDUMBRE (algo que hoy no sabemos cómo se resolverá), no una certeza.
- Cada eje tiene dos polos OPUESTOS, plausibles y cualitativamente distintos.
  Evitá ejes de magnitud tipo "mucho vs poco" o "avanza vs no avanza":
  preferí dos futuros DIFERENTES EN SU NATURALEZA (ej: "control estatal" vs "mercado abierto").
- Los dos ejes deben ser ortogonales (independientes) para que las 4 combinaciones
  den 4 mundos coherentes y bien diferenciados.
- Etiquetas y polos breves (máximo ~8 palabras cada uno).

Respondé SOLO con JSON válido, sin texto adicional, con este formato exacto:
{{"eje_x":{{"label":"...","pos":"...","neg":"..."}},"eje_y":{{"label":"...","pos":"...","neg":"..."}}}}

SEÑALES:
{lista}"""
    j = _parse_json(await _chat(system, user, temperature=0.7))
    ex, ey = j["eje_x"], j["eje_y"]
    return {
        "eje_x_label": ex["label"], "eje_x_pos": ex["pos"], "eje_x_neg": ex["neg"],
        "eje_y_label": ey["label"], "eje_y_pos": ey["pos"], "eje_y_neg": ey["neg"],
    }


async def redactar_escenarios(ejes, cuadrantes, horizonte, territorio):
    """
    ejes: dict con eje_*_label/pos/neg. cuadrantes: {q1:[{titulo}], ...} (placement).
    Devuelve {q1:{nombre,texto}, ...}.
    """
    polos = {
        "q1": (ejes["eje_x_pos"], ejes["eje_y_pos"]),
        "q2": (ejes["eje_x_neg"], ejes["eje_y_pos"]),
        "q3": (ejes["eje_x_neg"], ejes["eje_y_neg"]),
        "q4": (ejes["eje_x_pos"], ejes["eje_y_neg"]),
    }
    bloques = []
    for q, (xp, yp) in polos.items():
        titulos = [s.get("titulo", "") for s in (cuadrantes.get(q) or [])[:5]]
        ev = "\n   ".join("- " + t for t in titulos) or "- (sin señales en este cuadrante)"
        bloques.append(f'{q}: eje X="{xp}", eje Y="{yp}"\n   Señales:\n   {ev}')
    cuerpo = "\n".join(bloques)

    system = ("Sos un experto en prospectiva y narrativa de escenarios de futuro. "
              "Escribís en español, en presente, de forma vívida pero fundada en la evidencia.")
    user = f"""Territorio: {territorio}. Horizonte: {horizonte} años.

Ejes de la matriz de incertidumbre:
- Eje X ({ejes['eje_x_label']}): "{ejes['eje_x_pos']}" ↔ "{ejes['eje_x_neg']}"
- Eje Y ({ejes['eje_y_label']}): "{ejes['eje_y_pos']}" ↔ "{ejes['eje_y_neg']}"

Redactá 4 escenarios, uno por cuadrante. Cada escenario:
- un NOMBRE evocador (3 a 6 palabras).
- un TEXTO de 120 a 180 palabras que describa cómo es ese mundo dentro de {horizonte} años:
  cómo viven las personas, qué actores dominan, qué tensiones aparecen, qué implica para el
  territorio. Fundá la narrativa en las señales de ese cuadrante.
Los 4 escenarios deben ser DISTINTOS entre sí y coherentes con su combinación de polos
(cada cuadrante es la intersección de un polo de X y un polo de Y).

Respondé SOLO con JSON válido, sin texto adicional:
{{"q1":{{"nombre":"...","texto":"..."}},"q2":{{"nombre":"...","texto":"..."}},"q3":{{"nombre":"...","texto":"..."}},"q4":{{"nombre":"...","texto":"..."}}}}

CUADRANTES Y SU EVIDENCIA:
{cuerpo}"""
    j = _parse_json(await _chat(system, user, temperature=0.85, timeout=360))
    out = {}
    for q in ("q1", "q2", "q3", "q4"):
        item = j.get(q, {}) or {}
        out[q] = {"nombre": item.get("nombre", ""), "texto": item.get("texto", "")}
    return out
