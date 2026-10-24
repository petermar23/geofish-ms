# -*- coding: utf-8 -*-
"""
GeoFish MS — Sincronizador de Cadastros Reais (Guias e Anunciantes Comerciais)
==============================================================================
Lê a planilha `cadastros_geofish.csv` na raiz do projeto e atualiza:
1. `public/data/processed/guias_credenciados.geojson` (linhas com tipo_cadastro = guia)
2. `public/data/processed/anunciantes_ms.geojson` (linhas com tipo_cadastro = anunciante,
   mesclando com a base real extraída do OpenStreetMap sem inventar nenhum dado).
"""

import csv
import json
import os
import re

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CSV_PATH = os.path.join(ROOT_DIR, "cadastros_geofish.csv")
GUIAS_PATH = os.path.join(ROOT_DIR, "public", "data", "processed", "guias_credenciados.geojson")
ANUNCIANTES_PATH = os.path.join(ROOT_DIR, "public", "data", "processed", "anunciantes_ms.geojson")


def limpar_whatsapp(valor):
    digits = re.sub(r"\D", "", str(valor or ""))
    if not digits:
        return ""
    if len(digits) in (10, 11) and not digits.startswith("55"):
        digits = "55" + digits
    return digits


def sincronizar():
    if not os.path.exists(CSV_PATH):
        print(f"[AVISO] Planilha {CSV_PATH} não encontrada.")
        return

    guias_reais = []
    anunciantes_csv = []

    with open(CSV_PATH, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=1):
            nome = (row.get("nome") or "").strip()
            tipo_cad = (row.get("tipo_cadastro") or "").strip().lower()
            if not nome or not tipo_cad:
                continue

            try:
                lat = float(str(row.get("latitude") or "").replace(",", ".").strip())
                lon = float(str(row.get("longitude") or "").replace(",", ".").strip())
            except ValueError:
                print(f"[AVISO] Linha {idx} ignorada ({nome}): latitude/longitude inválidas.")
                continue

            item_id = (row.get("id") or f"CAD_{idx:03d}").strip()
            categoria = (row.get("categoria") or "").strip()
            plano = (row.get("plano") or "gratuito").strip().lower()
            destaque = (row.get("destaque_banner") or "nao").strip().lower() in ("sim", "s", "true", "1")
            municipio = (row.get("municipio") or "Mato Grosso do Sul").strip()
            wa = limpar_whatsapp(row.get("whatsapp"))
            estrutura = (row.get("barco_ou_estrutura") or "").strip()
            descricao = (row.get("descricao") or "").strip()
            rota_gmaps = f"https://www.google.com/maps/dir/?api=1&destination={lat:.6f},{lon:.6f}"

            if tipo_cad in ("guia", "piloteiro"):
                guias_reais.append({
                    "type": "Feature",
                    "properties": {
                        "id": item_id,
                        "nome_operacional": nome,
                        "colonia": categoria or "Guia / Piloteiro Tradicional",
                        "porto_base": municipio,
                        "tipo_barco": estrutura or "Embarcação de Pesca",
                        "descricao": descricao,
                        "contato_wa": wa,
                        "credenciado": True,
                        "homologado": True,
                        "demonstrativo": False,
                        "plano": plano,
                        "destaque": destaque,
                        "rota_gmaps": rota_gmaps
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [round(lon, 6), round(lat, 6)]
                    }
                })
            elif tipo_cad in ("anunciante", "pousada", "rancho", "hotel", "loja", "marina"):
                anunciantes_csv.append({
                    "type": "Feature",
                    "properties": {
                        "id": item_id,
                        "osm_id": "",
                        "nome": nome,
                        "categoria": categoria or "Pousada / Rancho de Pesca",
                        "plano": plano if plano in ("ouro", "prata", "basico") else "ouro",
                        "destaque": destaque,
                        "municipio": municipio,
                        "rio_referencia": estrutura or municipio,
                        "comodidades": estrutura or "Estrutura de pesca esportiva",
                        "descricao": descricao or f"{categoria or 'Estabelecimento'} em {municipio} (MS).",
                        "whatsapp": wa,
                        "rota_gmaps": rota_gmaps,
                        "fonte_dados": "Cadastro Direto GeoFish MS"
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [round(lon, 6), round(lat, 6)]
                    }
                })

    # 1. Salva guias_credenciados.geojson (somente os reais cadastrados no CSV)
    os.makedirs(os.path.dirname(GUIAS_PATH), exist_ok=True)
    with open(GUIAS_PATH, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": guias_reais}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[OK] guias_credenciados.geojson atualizado: {len(guias_reais)} piloteiros/guias reais.")

    # 2. Mescla anunciantes do CSV com os estabelecimentos reais do OpenStreetMap
    osm_features = []
    if os.path.exists(ANUNCIANTES_PATH):
        try:
            with open(ANUNCIANTES_PATH, "r", encoding="utf-8") as f:
                data_existente = json.load(f)
                for feat in data_existente.get("features", []):
                    props = feat.get("properties", {})
                    if props.get("fonte_dados") != "Cadastro Direto GeoFish MS":
                        osm_features.append(feat)
        except Exception as e:
            print(f"[AVISO] Erro ao ler anunciantes_ms.geojson existente: {e}")

    # Coloca anunciantes patrocinados/cadastrados no topo, seguidos da base real OSM
    todas_features_anunciantes = anunciantes_csv + osm_features
    with open(ANUNCIANTES_PATH, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": todas_features_anunciantes}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[OK] anunciantes_ms.geojson atualizado: {len(anunciantes_csv)} cadastrados via CSV + {len(osm_features)} reais OSM = {len(todas_features_anunciantes)} total.")


if __name__ == "__main__":
    sincronizar()
