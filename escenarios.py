"""
Escenarios especulativos — matriz de incertidumbre 2×2.

Ubica cada señal seleccionada en un cuadrante según su significado, comparando
su embedding con las dos puntas OPUESTAS de cada eje:
  sx = coseno(señal, X+) - coseno(señal, X-)
  sy = coseno(señal, Y+) - coseno(señal, Y-)
El signo de (sx, sy) define el cuadrante — cada señal cae en uno solo, así los
4 escenarios no se pisan. Al cambiar la selección o reformular los ejes, el
placement se recalcula.
"""

import numpy as np

import db
import embeddings


async def senales_de_seleccion(conn, cluster_ids, senal_ids):
    """Unión de señales de los clusters elegidos + señales sueltas elegidas."""
    conn.row_factory = db.row_to_dict
    ids = set(senal_ids or [])
    if cluster_ids:
        ph = ",".join("?" * len(cluster_ids))
        cur = await conn.execute(
            f"SELECT id FROM senales WHERE cluster_id IN ({ph}) AND es_relevante=1",
            list(cluster_ids))
        for r in await cur.fetchall():
            ids.add(r["id"])
    if not ids:
        return []
    ph = ",".join("?" * len(ids))
    cur = await conn.execute(
        f"""SELECT id, titulo, url_directa, cita_relevancia, cluster_id,
            cuadrante_steep, score_calidad FROM senales WHERE id IN ({ph})""",
        list(ids))
    return await cur.fetchall()


def placement(axes, senales):
    """
    axes: {x_pos, x_neg, y_pos, y_neg} (textos de las 4 puntas).
    Devuelve {q1,q2,q3,q4: [ {id,titulo,url_directa,sx,sy}, ... ]}.
    """
    out = {"q1": [], "q2": [], "q3": [], "q4": []}
    poles = [axes.get("x_pos") or "", axes.get("x_neg") or "",
             axes.get("y_pos") or "", axes.get("y_neg") or ""]
    # se necesitan al menos una punta por eje y señales
    if not senales or not (poles[0] or poles[1]) or not (poles[2] or poles[3]):
        return out
    pemb = embeddings.embed(poles)  # 4 x dim (normalizados)
    textos = [((s["titulo"] or "") + " " + (s["cita_relevancia"] or ""))[:1500]
              for s in senales]
    semb = embeddings.embed(textos)
    sims = semb @ pemb.T             # n x 4 → coseno (todo normalizado)
    for i, s in enumerate(senales):
        sx = float(sims[i, 0] - sims[i, 1])
        sy = float(sims[i, 2] - sims[i, 3])
        if sx >= 0:
            q = "q1" if sy >= 0 else "q4"
        else:
            q = "q2" if sy >= 0 else "q3"
        out[q].append({
            "id": s["id"], "titulo": s["titulo"], "url_directa": s["url_directa"],
            "cluster_id": s["cluster_id"], "sx": round(sx, 3), "sy": round(sy, 3),
        })
    # ordenar cada cuadrante por "fuerza" de pertenencia (distancia al centro)
    for q in out:
        out[q].sort(key=lambda d: -(abs(d["sx"]) + abs(d["sy"])))
    return out
