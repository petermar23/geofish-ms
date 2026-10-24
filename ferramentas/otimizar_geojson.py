import json
import os
import sys
import argparse

def round_coords(coords, decimals):
    if isinstance(coords, list):
        return [round_coords(c, decimals) for c in coords]
    if isinstance(coords, float):
        return round(coords, decimals)
    return coords

def optimize(filepath, decimals):
    print(f'Otimizando {filepath} (precisão: {decimals} casas)...')
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'crs' in data:
        del data['crs']
        print(f'  - Removido membro crs obsoleto de {filepath}')
    
    for feat in data.get('features', []):
        if 'geometry' in feat and feat['geometry'] and 'coordinates' in feat['geometry']:
            feat['geometry']['coordinates'] = round_coords(feat['geometry']['coordinates'], decimals)
    
    temp = filepath + '.tmp'
    with open(temp, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
    os.replace(temp, filepath)
    print('Concluído!')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Otimiza arquivos GeoJSON.')
    parser.add_argument('arquivos', nargs='*', help='Arquivos GeoJSON para processar')
    parser.add_argument('--precisao', type=int, default=5, help='Casas decimais (padrão: 5)')
    args = parser.parse_args()
    
    arquivos = args.arquivos
    if not arquivos:
        base_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'processed')
        if not os.path.exists(base_dir):
            base_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')
        if os.path.exists(base_dir):
            arquivos = [os.path.join(base_dir, f) for f in os.listdir(base_dir) if f.endswith('.geojson')]
    
    for f in arquivos:
        optimize(f, args.precisao)
