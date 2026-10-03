import json
import sys

import argparse

def round_coords(coords, decimals):
    if isinstance(coords, list):
        if coords and not isinstance(coords[0], list):
            # Posição [lng, lat, (z)]: descarta a altitude Z (sempre 0 nos dados SEMADESC/IMASUL)
            return [round(c, decimals) if isinstance(c, float) else c for c in coords[:2]]
        return [round_coords(c, decimals) for c in coords]
    if isinstance(coords, float):
        return round(coords, decimals)
    return coords

def optimize(filepath, decimals):
    print(f'Otimizando {filepath} (precisão: {decimals} casas)...')
    with open(filepath, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    
    for feat in data.get('features', []):
        if 'geometry' in feat and feat['geometry'] and 'coordinates' in feat['geometry']:
            feat['geometry']['coordinates'] = round_coords(feat['geometry']['coordinates'], decimals)
    
    temp = filepath + '.tmp'
    with open(temp, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
    import os; os.replace(temp, filepath)
    print('Concluído!')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Otimiza arquivos GeoJSON.')
    parser.add_argument('arquivos', nargs='+', help='Arquivos GeoJSON para processar')
    parser.add_argument('--precisao', type=int, default=5, help='Casas decimais (padrão: 5)')
    args = parser.parse_args()
    
    for f in args.arquivos:
        optimize(f, args.precisao)
