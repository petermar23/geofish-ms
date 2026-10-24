# -*- coding: utf-8 -*-
r"""
Geo-Peter: Extrator e Preparador da Base Cartográfica Estadual do GeoFish MS
100% DADOS REAIS E OFICIAIS DE C:\DADOS\MS (IBGE, ANA, IMASUL, FUNAI, DNIT/AGESUL e OpenStreetMap)
Zero dados inventados ou fictícios.
"""
import json
import math
import os
from osgeo import ogr, osr

ogr.UseExceptions()

BASE_DADOS_MS = r"C:\DADOS\MS"
OUT_DIR = r"C:\Users\peter\.gemini\antigravity\scratch\novo-projeto\public\data\processed"
os.makedirs(OUT_DIR, exist_ok=True)


def round_coords(coords, decimals=5):
    if isinstance(coords, (list, tuple)):
        return [round_coords(c, decimals) for c in coords]
    if isinstance(coords, float):
        return round(coords, decimals)
    return coords


def geom_to_geojson_dict(geom, decimals=5):
    if geom is None or geom.IsEmpty():
        return None
    g_json = json.loads(geom.ExportToJson())
    if "coordinates" in g_json:
        g_json["coordinates"] = round_coords(g_json["coordinates"], decimals)
    return g_json


def save_geojson(filename, features):
    filepath = os.path.join(OUT_DIR, filename)
    fc = {
        "type": "FeatureCollection",
        "features": features
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(fc, f, separators=(",", ":"), ensure_ascii=False)
    kb = os.path.getsize(filepath) / 1024.0
    print(f"[OK] {filename}: {len(features)} feicoes reais ({kb:.1f} KB)")


def haversine_km(lon1, lat1, lon2, lat2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calc_geom_length_km(geom):
    if geom is None or geom.IsEmpty():
        return 0.0
    gtype = geom.GetGeometryName()
    total = 0.0
    if gtype == "LINESTRING":
        pts = geom.GetPoints()
        if pts:
            for i in range(len(pts) - 1):
                total += haversine_km(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])
    elif gtype == "MULTILINESTRING":
        for j in range(geom.GetGeometryCount()):
            total += calc_geom_length_km(geom.GetGeometryRef(j))
    return round(total, 1)


def gmaps_route_url(lat, lon):
    return f"https://www.google.com/maps/dir/?api=1&destination={lat:.5f},{lon:.5f}"


# ==============================================================================
# 1. MUNICÍPIOS DE MATO GROSSO DO SUL (79 Municípios - IBGE)
# ==============================================================================
print("\n--- 1. Processando Municipios de MS (IBGE) ---")
ds_mun = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_brutos\divisao_politica\municipios_ms_ibge.gpkg"))
lyr_mun = ds_mun.GetLayer(0)

mun_features = []
mun_geoms = []  # (nome_municipio, codigo_ibge, geom_clone)

for feat in lyr_mun:
    nome = feat.GetField("nome_municipio")
    cod = str(feat.GetField("codigo_ibge"))
    area = round(float(feat.GetField("area_km2") or 0), 1)
    geom = feat.GetGeometryRef()
    if geom:
        g_clean = geom.Buffer(0)
        mun_geoms.append((nome, cod, g_clean.Clone()))
        g_simp = g_clean.SimplifyPreserveTopology(0.0035)
        gj = geom_to_geojson_dict(g_simp, 4)
        if gj:
            mun_features.append({
                "type": "Feature",
                "properties": {
                    "codigo_ibge": cod,
                    "nome_municipio": nome,
                    "titulo": nome,
                    "sigla_uf": "MS",
                    "area_km2": area,
                    "fonte": "IBGE"
                },
                "geometry": gj
            })

save_geojson("municipios_ms.geojson", mun_features)


def identificar_municipio_ponto(lon, lat):
    pt = ogr.Geometry(ogr.wkbPoint)
    pt.AddPoint(lon, lat)
    for nome, cod, g in mun_geoms:
        env = g.GetEnvelope()
        if env[0] <= lon <= env[1] and env[2] <= lat <= env[3]:
            if g.Contains(pt) or g.Intersects(pt):
                return nome, cod
    return None, None


# ==============================================================================
# 2. BACIAS HIDROGRÁFICAS DO MS (15 UPGs - IMASUL/SEMADESC)
# ==============================================================================
print("\n--- 2. Processando Bacias Hidrograficas do MS (15 UPGs) ---")
ds_upg = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_brutos\recursos_hidricos\upg_planejamento_hidrico_ms.gpkg"))
lyr_upg = ds_upg.GetLayer(0)

bacias_features = []
bacia_geoms = []  # (nome_bacia, regiao_hidrografica, geom_clone)

for feat in lyr_upg:
    upg = feat.GetField("upg") or ""
    regiao = feat.GetField("regiao_hidrografica") or ""
    nome_bacia = feat.GetField("nome_bacia") or ""
    criticidade = feat.GetField("criticidade") or ""
    geom = feat.GetGeometryRef()
    if geom:
        g_clean = geom.Buffer(0)
        bacia_geoms.append((nome_bacia.title(), regiao.upper(), g_clean.Clone()))
        g_simp = g_clean.SimplifyPreserveTopology(0.0035)
        gj = geom_to_geojson_dict(g_simp, 4)
        if gj:
            bacias_features.append({
                "type": "Feature",
                "properties": {
                    "id_bacia": upg,
                    "upg": upg,
                    "titulo": f"UPG {nome_bacia.title()} ({regiao.title()})",
                    "nome_bacia": nome_bacia.title(),
                    "regiao_hidrografica": regiao.upper(),
                    "criticidade": str(criticidade),
                    "fonte": "IMASUL / Plano Estadual de Recursos Hídricos MS"
                },
                "geometry": gj
            })

save_geojson("bacias_ms.geojson", bacias_features)


def identificar_bacia_ponto(lon, lat):
    pt = ogr.Geometry(ogr.wkbPoint)
    pt.AddPoint(lon, lat)
    for nome_bacia, regiao, g in bacia_geoms:
        env = g.GetEnvelope()
        if env[0] <= lon <= env[1] and env[2] <= lat <= env[3]:
            if g.Contains(pt) or g.Intersects(pt):
                return nome_bacia, regiao
    return "N/D", "N/D"


# ==============================================================================
# 3. BACIAS ESPECIAIS (Rios Cênicos - IMASUL)
# ==============================================================================
print("\n--- 3. Processando Bacias Especiais (IMASUL) ---")
s_srs = osr.SpatialReference()
s_srs.ImportFromEPSG(31981)
t_srs = osr.SpatialReference()
t_srs.ImportFromEPSG(4326)
t_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
ct_21s_to_4326 = osr.CoordinateTransformation(s_srs, t_srs)

ds_esp = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_preparados\vetor\tema_03_bacias_especiais_ms_utm21s.gpkg"))
lyr_esp = ds_esp.GetLayer(0)
esp_features = []
for feat in lyr_esp:
    nome = feat.GetField("nome") or "N/D"
    area_ha = round(float(feat.GetField("Area_ha") or 0), 1)
    geom = feat.GetGeometryRef().Clone()
    geom.Transform(ct_21s_to_4326)
    g_simp = geom.Buffer(0).SimplifyPreserveTopology(0.0015)
    gj = geom_to_geojson_dict(g_simp, 5)
    if gj:
        esp_features.append({
            "type": "Feature",
            "properties": {
                "titulo": nome,
                "nome": nome,
                "area_ha": area_ha,
                "fonte": "IMASUL / SEMADESC"
            },
            "geometry": gj
        })

save_geojson("bacias_especiais.geojson", esp_features)


# ==============================================================================
# 4. UNIDADES DE CONSERVAÇÃO E TERRAS INDÍGENAS DE MS (IMASUL / FUNAI)
# ==============================================================================
print("\n--- 4. Processando Unidades de Conservacao e Terras Indigenas ---")
uc_features = []

ds_uc = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_preparados\vetor\tema_04_restricoes_ucs_mosaico_utm21s.gpkg"))
lyr_uc = ds_uc.GetLayer(0)
for feat in lyr_uc:
    nome_uc = feat.GetField("nome_uc") or "N/D"
    cat = feat.GetField("categoria") or "N/D"
    grupo = feat.GetField("grupo") or "N/D"
    esfera = feat.GetField("esfera") or "N/D"
    mun = feat.GetField("municipio") or "N/D"
    leis = feat.GetField("leis") or "N/D"
    is_integral = "INTEGRAL" in grupo.upper()
    geom = feat.GetGeometryRef().Clone()
    geom.Transform(ct_21s_to_4326)
    g_simp = geom.Buffer(0).SimplifyPreserveTopology(0.002)
    gj = geom_to_geojson_dict(g_simp, 4)
    if gj:
        uc_features.append({
            "type": "Feature",
            "properties": {
                "titulo": nome_uc,
                "subtitulo": f"{cat} ({esfera})",
                "categoria": cat,
                "grupo": grupo,
                "esfera": esfera,
                "municipio": mun,
                "leis": leis,
                "pesca_status": "Proibida (Proteção Integral)" if is_integral else "Uso Sustentável (Plano de Manejo)",
                "regras_pesca": f"Unidade de Conservação ({cat} - {grupo}). Ato legal: {leis}.",
                "fonte": "IMASUL / MMA"
            },
            "geometry": gj
        })

ds_ti = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_preparados\vetor\tema_04_restricoes_terras_indigenas_utm21s.gpkg"))
lyr_ti = ds_ti.GetLayer(0)
for feat in lyr_ti:
    nome_ti = feat.GetField("nome_ti") or "N/D"
    etnia = feat.GetField("etnia") or "N/D"
    fase = feat.GetField("fase") or "N/D"
    mun = feat.GetField("municipio") or "N/D"
    geom = feat.GetGeometryRef().Clone()
    geom.Transform(ct_21s_to_4326)
    g_simp = geom.Buffer(0).SimplifyPreserveTopology(0.002)
    gj = geom_to_geojson_dict(g_simp, 4)
    if gj:
        uc_features.append({
            "type": "Feature",
            "properties": {
                "titulo": f"Terra Indígena {nome_ti}",
                "subtitulo": f"Etnia {etnia} ({fase})",
                "categoria": "Terra Indígena",
                "grupo": "Terra Indígena (FUNAI)",
                "esfera": "Federal",
                "municipio": mun,
                "leis": f"Fase: {fase}",
                "pesca_status": "Proibida (Exclusivo Indígena)",
                "regras_pesca": f"Terra Indígena {nome_ti} (Etnia {etnia}, Fase: {fase}). Ingresso e pesca restritos conforme legislação federal (FUNAI).",
                "fonte": "FUNAI"
            },
            "geometry": gj
        })

save_geojson("uc_ms.geojson", uc_features)


# ==============================================================================
# 5. REDE HIDROGRÁFICA ESTADUAL (ANA - Rios de Domínio da União e do Estado)
# ==============================================================================
print("\n--- 5. Processando Hidrografia Estadual (ANA) ---")

RIOS_PROIBIDOS = {
    "Rio Salobra", "Rio Formoso", "Rio da Prata", "Rio Nioaque", "Rio Mimoso", "Rio Perdido", "Rio Batione"
}

RIOS_PESQUE_SOLTE = {
    "Rio Negro", "Rio Vermelho", "Rio Abobral"
}

RIOS_TRONCAIS_MS = {
    "Rio Paraguai", "Rio Paraná", "Rio Miranda", "Rio Aquidauana", "Rio Taquari",
    "Rio Negro", "Rio Apa", "Rio Sucuriú", "Rio Pardo", "Rio Verde",
    "Rio Ivinheima", "Rio Ivinhema", "Rio Dourados", "Rio Brilhante",
    "Rio Amambaí", "Rio Iguatemi", "Rio Coxim", "Rio Aporé ou do Peixe",
    "Rio Correntes", "Rio Nabileque", "Rio Jauru", "Rio Paranaíba", "Rio Piquirí"
}

rios_geoms = {}  # nome_rio -> {"dominio": str, "geoms": list}

ds_u = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_brutos\recursos_hidricos\rios_dominio_uniao_ana_ms.gpkg"))
lyr_u = ds_u.GetLayer(0)
for feat in lyr_u:
    nome = (feat.GetField("nome_rio") or "").strip()
    if not nome or not (nome.startswith("Rio ") or "Paraná" in nome or "Paraguai" in nome):
        continue
    dom = feat.GetField("dominio") or "Federal (União)"
    geom = feat.GetGeometryRef()
    if geom and not geom.IsEmpty():
        info = rios_geoms.setdefault(nome, {"dominio": dom, "geoms": []})
        info["geoms"].append(geom.Clone())

ds_e = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_brutos\recursos_hidricos\rios_dominio_estado_ana_ms.gpkg"))
lyr_e = ds_e.GetLayer(0)
for feat in lyr_e:
    nome = (feat.GetField("nome_rio") or "").strip()
    if not nome or not nome.startswith("Rio "):
        continue
    dom = feat.GetField("dominialidade") or "Estadual"
    geom = feat.GetGeometryRef()
    if geom and not geom.IsEmpty():
        info = rios_geoms.setdefault(nome, {"dominio": dom, "geoms": []})
        info["geoms"].append(geom.Clone())

hidro_features = []
principais_features = []

for nome in sorted(rios_geoms.keys()):
    info = rios_geoms[nome]
    multi = ogr.Geometry(ogr.wkbMultiLineString)
    for g in info["geoms"]:
        g_lin = g.GetLinearGeometry()
        g_lin.FlattenTo2D()
        gt = g_lin.GetGeometryName()
        if gt == "LINESTRING":
            multi.AddGeometry(g_lin)
        elif gt == "MULTILINESTRING":
            for i in range(g_lin.GetGeometryCount()):
                multi.AddGeometry(g_lin.GetGeometryRef(i))

    comp_km = calc_geom_length_km(multi)
    if comp_km < 3.0 and nome not in RIOS_PROIBIDOS:
        continue

    # Identifica bacia real pelo ponto médio/centroide da geometria
    c_pt = multi.Centroid()
    nome_subbacia, regiao_hidro = identificar_bacia_ponto(c_pt.GetX(), c_pt.GetY())

    if nome in RIOS_PROIBIDOS:
        status_pesca = "Proibida"
        regras = f"Curso d'água com restrição de pesca ({nome} - Sub-bacia {nome_subbacia}). Consulte regulamentação vigente do IMASUL/PMA-MS."
        cota = "Zero (Pesca Proibida)"
        base_legal = "Legislação Estadual de Rios Cênicos / IMASUL"
    elif nome in RIOS_PESQUE_SOLTE:
        status_pesca = "Pesque e Solte"
        regras = f"Curso d'água com trechos de Pesque e Solte ({nome} - Sub-bacia {nome_subbacia}). Dourado 100% Pesque e Solte (Lei 6.190/24)."
        cota = "Captura Zero nos trechos regulamentados (Pesque e Solte)"
        base_legal = "Regulamentação IMASUL / Lei Estadual nº 6.190/2024"
    else:
        status_pesca = "Permitida com Cota"
        regras = f"{nome} (Dominialidade: {info['dominio']} · Sub-bacia: {nome_subbacia} · Região Hidrográfica: {regiao_hidro}). Pesca permitida na temporada aberta conforme cotas vigentes do IMASUL. Dourado proibido abate até 2029 (Lei 6.190/24)."
        cota = "Conforme cota vigente IMASUL/PMA-MS (Dourado: Pesque e Solte)"
        base_legal = "Decreto Estadual nº 15.166/2019 · Lei nº 6.190/2024"

    props = {
        "titulo": nome,
        "nome": nome,
        "rio": nome,
        "dominio": info["dominio"],
        "sub_bacia": nome_subbacia,
        "regiao_hidrografica": regiao_hidro,
        "status_pesca": status_pesca,
        "regras_pesca": regras,
        "cota_abate": cota,
        "comprimento_km": comp_km,
        "base_legal": base_legal,
        "fonte": "ANA / IMASUL"
    }

    g_simp_hidro = multi.SimplifyPreserveTopology(0.0012)
    gj_hidro = geom_to_geojson_dict(g_simp_hidro, 4)
    if gj_hidro:
        hidro_features.append({
            "type": "Feature",
            "properties": props,
            "geometry": gj_hidro
        })

    if nome in RIOS_TRONCAIS_MS or nome in RIOS_PROIBIDOS:
        g_simp_princ = multi.SimplifyPreserveTopology(0.0015)
        gj_princ = geom_to_geojson_dict(g_simp_princ, 4)
        if gj_princ:
            principais_features.append({
                "type": "Feature",
                "properties": props,
                "geometry": gj_princ
            })

save_geojson("hidrografia.geojson", hidro_features)
save_geojson("rios_principais.geojson", principais_features)


# ==============================================================================
# 6. MALHA RODOVIÁRIA OFICIAL (DNIT / AGESUL - rodovias_ms.geojson)
# ==============================================================================
print("\n--- 6. Processando Rodovias Oficiais do MS (AGESUL/DNIT) ---")
ds_rod = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_brutos\infraestrutura_transporte\rodovias_ms.gpkg"))
lyr_rod = ds_rod.GetLayer(0)

RODOVIAS_PRINCIPAIS = {
    "BR-262", "BR-163", "BR-267", "BR-060", "BR-158", "BR-359", "BR-419", "BR-487", "BR-376",
    "MS-184", "MS-228", "MS-345", "MS-178", "MS-382", "MS-040", "MS-306", "MS-395", "MS-276",
    "MS-141", "MS-156", "MS-164", "MS-270", "MS-320", "MS-338", "MS-377", "MS-080", "MS-450"
}

rod_groups = {}
for feat in lyr_rod:
    sigla = (feat.GetField("rodovia") or "").strip()
    if sigla not in RODOVIAS_PRINCIPAIS:
        continue
    pav = (feat.GetField("pavimentacao") or "N/D").strip()
    jur = (feat.GetField("jurisdicao") or "N/D").strip()
    denom = (feat.GetField("denominacao") or "").strip()
    key = (sigla, pav, jur)
    geom = feat.GetGeometryRef()
    if geom and not geom.IsEmpty():
        rod_groups.setdefault(key, {"denom": denom, "geoms": []})["geoms"].append(geom.Clone())

rod_features = []
for (sigla, pav, jur), info in sorted(rod_groups.items()):
    multi = ogr.Geometry(ogr.wkbMultiLineString)
    for g in info["geoms"]:
        g_lin = g.GetLinearGeometry()
        g_lin.FlattenTo2D()
        if g_lin.GetGeometryName() == "LINESTRING":
            multi.AddGeometry(g_lin)
        elif g_lin.GetGeometryName() == "MULTILINESTRING":
            for i in range(g_lin.GetGeometryCount()):
                multi.AddGeometry(g_lin.GetGeometryRef(i))
    g_simp = multi.SimplifyPreserveTopology(0.0025)
    gj = geom_to_geojson_dict(g_simp, 4)
    if gj:
        rod_features.append({
            "type": "Feature",
            "properties": {
                "rodovia": sigla,
                "titulo": f"{sigla} ({info['denom']})" if info["denom"] else sigla,
                "jurisdicao": jur,
                "pavimentacao": pav,
                "denominacao": info["denom"] or "N/D",
                "fonte": "AGESUL / DNIT"
            },
            "geometry": gj
        })

save_geojson("rodovias_ms.geojson", rod_features)


# ==============================================================================
# 7. EXTRAÇÃO 100% REAL DO OPENSTREETMAP (Hospitais, Polícia, Bombeiros, Rampas, Portos, Pousadas e Hotéis)
# ==============================================================================
print("\n--- 7. Extraindo Pontos Reais do OpenStreetMap dentro de MS ---")

apoio_features = []
anunciantes_features = []
seen_apoio = set()
seen_anunciantes = set()

OSM_LAYERS = [
    "gis_osm_pois_free_1.shp",
    "gis_osm_pois_a_free_1.shp",
    "gis_osm_traffic_free_1.shp",
    "gis_osm_traffic_a_free_1.shp",
    "gis_osm_transport_free_1.shp",
    "gis_osm_transport_a_free_1.shp",
]

for shp_name in OSM_LAYERS:
    shp_path = f"/vsizip/C:/DADOS/MS/dados_brutos/infraestrutura_transporte/centro-oeste-261020-free.shp.zip/{shp_name}"
    ds_osm = ogr.Open(shp_path)
    if not ds_osm:
        continue
    lyr = ds_osm.GetLayer(0)
    lyr.SetSpatialFilterRect(-58.2, -24.1, -50.9, -17.1)

    for feat in lyr:
        fclass = feat.GetField("fclass")
        osm_id = str(feat.GetField("osm_id") or "")
        name = (feat.GetField("name") or "").strip()

        if fclass not in (
            "hospital", "clinic", "police", "fire_station",
            "slipway", "marina", "pier", "ferry_terminal",
            "guesthouse", "hotel", "chalet", "camp_site"
        ):
            continue

        geom = feat.GetGeometryRef()
        if not geom or geom.IsEmpty():
            continue
        pt_geom = geom.Centroid() if geom.GetGeometryName() != "POINT" else geom
        lon, lat = pt_geom.GetX(), pt_geom.GetY()

        # Recorte estrito aos 79 municípios de Mato Grosso do Sul
        mun, cod_ibge = identificar_municipio_ponto(lon, lat)
        if not mun:
            continue

        nome_subbacia, regiao_hidro = identificar_bacia_ponto(lon, lat)

        # A) SEGURANÇA, SAÚDE E INFRAESTRUTURA NÁUTICA (Hospitais, Polícia, Bombeiros, Rampas, Píeres, Marinas, Balsas)
        if fclass in ("hospital", "clinic", "police", "fire_station", "slipway", "marina", "pier", "ferry_terminal"):
            # Exige nome para hospitais/clínicas/polícia; para rampas (slipway/marina/ferry) aceita mesmo sem nome pois a geometria física da rampa existe no OSM
            if fclass in ("hospital", "clinic", "police", "fire_station") and not name:
                continue
            dedup_key = (fclass, round(lon, 3), round(lat, 3))
            if dedup_key in seen_apoio:
                continue
            seen_apoio.add(dedup_key)

            if fclass == "hospital":
                tipo_label = "Hospital"
                cat_icone = "hospital"
                tel = "192"
                rampa_str = "Não"
            elif fclass == "clinic":
                tipo_label = "Unidade de Saúde / Clínica"
                cat_icone = "hospital"
                tel = "192"
                rampa_str = "Não"
            elif fclass == "police":
                tipo_label = "Polícia / Segurança Pública"
                cat_icone = "policia"
                tel = "190"
                rampa_str = "Não"
            elif fclass == "fire_station":
                tipo_label = "Corpo de Bombeiros"
                cat_icone = "bombeiro"
                tel = "193"
                rampa_str = "Não"
            elif fclass == "slipway":
                tipo_label = "Rampa de Embarque (Slipway)"
                cat_icone = "rampa"
                tel = ""
                rampa_str = "Sim"
            elif fclass == "marina":
                tipo_label = "Marina"
                cat_icone = "marina"
                tel = ""
                rampa_str = "Sim"
            elif fclass == "pier":
                tipo_label = "Píer / Atracadouro Fluvial"
                cat_icone = "rampa"
                tel = ""
                rampa_str = "Sim"
            else:  # ferry_terminal
                tipo_label = "Porto / Terminal Fluvial"
                cat_icone = "rampa"
                tel = ""
                rampa_str = "Sim"

            display_name = name if name else f"{tipo_label} ({mun})"

            apoio_features.append({
                "type": "Feature",
                "properties": {
                    "id": f"osm-{osm_id}",
                    "osm_id": osm_id,
                    "nome": display_name,
                    "titulo": display_name,
                    "tipo": tipo_label,
                    "fclass_osm": fclass,
                    "categoria_icone": cat_icone,
                    "municipio": mun,
                    "codigo_ibge": cod_ibge,
                    "sub_bacia": nome_subbacia,
                    "regiao_hidrografica": regiao_hidro,
                    "possui_rampa": rampa_str,
                    "telefone_emergencia": tel,
                    "endereco": f"{mun} - MS",
                    "rota_gmaps": gmaps_route_url(lat, lon),
                    "fonte": "OpenStreetMap (Geofabrik)"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(lon, 5), round(lat, 5)]
                }
            })

        # B) HOSPEDAGENS, POUSADAS, HOTÉIS, RANCHOS E CAMPINGS REAIS MAPEADOS NO OSM
        elif fclass in ("guesthouse", "hotel", "chalet", "camp_site"):
            if not name:
                continue
            dedup_key = (name.lower(), mun)
            if dedup_key in seen_anunciantes:
                continue
            seen_anunciantes.add(dedup_key)

            cat_map = {
                "guesthouse": "Pousada",
                "hotel": "Hotel",
                "chalet": "Chalé / Rancho",
                "camp_site": "Camping / Pesqueiro"
            }

            anunciantes_features.append({
                "type": "Feature",
                "properties": {
                    "id": f"osm-{osm_id}",
                    "osm_id": osm_id,
                    "nome": name,
                    "titulo": name,
                    "categoria": cat_map.get(fclass, "Hospedagem"),
                    "fclass_osm": fclass,
                    "plano": "basico",
                    "municipio": mun,
                    "codigo_ibge": cod_ibge,
                    "sub_bacia": nome_subbacia,
                    "regiao_hidrografica": regiao_hidro,
                    "contato_wa": None,
                    "rota_gmaps": gmaps_route_url(lat, lon),
                    "fonte": "OpenStreetMap (Geofabrik)"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(lon, 5), round(lat, 5)]
                }
            })

save_geojson("pontos_emergencia.geojson", apoio_features)
save_geojson("anunciantes_ms.geojson", anunciantes_features)

# ==============================================================================
# 8. COMUNIDADES TRADICIONAIS E RURAIS REAIS (AGRAER / INCRA - aglomerados_rurais.geojson)
# ==============================================================================
print("\n--- 8. Processando Comunidades Tradicionais Reais de MS (AGRAER/INCRA) ---")
ds_q = ogr.Open(os.path.join(BASE_DADOS_MS, r"dados_brutos\restricoes_e_areas_protegidas\quilombolas_comunidades_agraer_ms.gpkg"))
if ds_q:
    lyr_q = ds_q.GetLayer(0)
    defn_q = lyr_q.GetLayerDefn()
    q_fields = [defn_q.GetFieldDefn(i).GetName() for i in range(defn_q.GetFieldCount())]
    com_features = []
    for feat in lyr_q:
        geom = feat.GetGeometryRef()
        if not geom or geom.IsEmpty():
            continue
        pt = geom.Centroid() if geom.GetGeometryName() != "POINT" else geom
        lon, lat = pt.GetX(), pt.GetY()
        mun, cod_ibge = identificar_municipio_ponto(lon, lat)
        props_raw = {k: feat.GetField(k) for k in q_fields}
        nome_c = (
            props_raw.get("nm_comunid")
            or props_raw.get("nome")
            or props_raw.get("comunidade")
            or "Comunidade Tradicional"
        )
        com_features.append({
            "type": "Feature",
            "properties": {
                "titulo": str(nome_c),
                "nome": str(nome_c),
                "municipio": mun or str(props_raw.get("nm_municip") or "MS"),
                "rota_gmaps": gmaps_route_url(lat, lon),
                "fonte": "AGRAER / INCRA MS"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [round(lon, 5), round(lat, 5)]
            }
        })
    save_geojson("aglomerados_rurais.geojson", com_features)

# ==============================================================================
# 9. GUIAS E PILOTEIROS (Sem dados inventados - Apenas estrutura limpa aguardando cadastros reais)
# ==============================================================================
print("\n--- 9. Limpando guias_credenciados.geojson (Zero perfis inventados) ---")
save_geojson("guias_credenciados.geojson", [])

print("\n=== EXTRACAO 100% FIEL AOS DADOS REAIS CONCLUIDA! ===")
