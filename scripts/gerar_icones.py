"""
Gera ícones reais e de alta definição para o PWA GeoFish MS.
Tamanhos: 32x32, 180x180, 192x192, 512x512 (any e maskable com margem de segurança).
"""
import os
import math
from PIL import Image, ImageDraw

ICONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(ICONS_DIR, exist_ok=True)

def draw_icon(size, is_maskable=False):
    # Imagem base RGBA
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Cores
    bg_dark = (7, 52, 72, 255)       # #073448
    bg_light = (11, 79, 108, 255)    # #0b4f6c
    cyan = (56, 189, 248, 255)       # #38bdf8
    emerald = (52, 211, 153, 255)    # #34d399
    white = (248, 250, 252, 255)     # #f8fafc

    # Fundo
    if is_maskable:
        # Maskable preenche 100% da área quadrada sem cantos arredondados
        for y in range(size):
            factor = y / size
            r = int(bg_dark[0] * (1 - factor) + bg_light[0] * factor)
            g = int(bg_dark[1] * (1 - factor) + bg_light[1] * factor)
            b = int(bg_dark[2] * (1 - factor) + bg_light[2] * factor)
            draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
        # Escala de conteúdo interno para zona de segurança (80% central)
        scale = 0.72
    else:
        # Ícone normal: círculo/squircle arredondado elegante
        radius = int(size * 0.22)
        # Cria gradiente dentro do squircle
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg_light)
        scale = 0.85

    cx, cy = size / 2, size / 2
    r_main = (size / 2) * scale

    # Círculo decorativo sutil
    ring_r = r_main * 0.92
    draw.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r], outline=(56, 189, 248, 70), width=max(1, int(size * 0.02)))

    # Curvas de ondas de rio (Pantanal)
    wave_width = max(2, int(size * 0.045))
    y_wave = cy + r_main * 0.35
    wave_pts = []
    steps = 40
    for i in range(steps + 1):
        x = cx - r_main * 0.75 + (r_main * 1.5) * (i / steps)
        y = y_wave + math.sin(i / steps * math.pi * 2.5) * (r_main * 0.12)
        wave_pts.append((x, y))
    for i in range(len(wave_pts) - 1):
        draw.line([wave_pts[i], wave_pts[i + 1]], fill=emerald, width=wave_width)

    # Desenho estilizado do peixe (símbolo náutico de pesca sustentável)
    # Corpo em forma de gota / arco
    fish_len = r_main * 0.95
    fish_h = r_main * 0.48
    fx0 = cx - fish_len * 0.45
    fy0 = cy - r_main * 0.18

    # Cauda do peixe
    tail_pts = [
        (fx0 - fish_len * 0.18, fy0 - fish_h * 0.65),
        (fx0 + fish_len * 0.05, fy0),
        (fx0 - fish_len * 0.18, fy0 + fish_h * 0.65)
    ]
    draw.polygon(tail_pts, fill=cyan)

    # Corpo do peixe
    body_box = [fx0, fy0 - fish_h * 0.6, fx0 + fish_len * 0.85, fy0 + fish_h * 0.6]
    draw.chord(body_box, start=30, end=330, fill=cyan, outline=white, width=max(1, int(size * 0.015)))

    # Olho do peixe
    eye_r = max(2, int(size * 0.035))
    eye_x = fx0 + fish_len * 0.62
    eye_y = fy0 - fish_h * 0.1
    draw.ellipse([eye_x - eye_r, eye_y - eye_r, eye_x + eye_r, eye_y + eye_r], fill=bg_dark)
    pupil_r = max(1, int(eye_r * 0.4))
    draw.ellipse([eye_x - pupil_r + 1, eye_y - pupil_r - 1, eye_x + pupil_r + 1, eye_y + pupil_r - 1], fill=white)

    # Linha dorsal elegante
    fin_pts = [
        (fx0 + fish_len * 0.25, fy0 - fish_h * 0.55),
        (fx0 + fish_len * 0.45, fy0 - fish_h * 0.9),
        (fx0 + fish_len * 0.55, fy0 - fish_h * 0.5)
    ]
    draw.polygon(fin_pts, fill=emerald)

    return img

print("Gerando ícones PWA...")
draw_icon(32).save(os.path.join(ICONS_DIR, 'favicon-32.png'), 'PNG')
draw_icon(180).save(os.path.join(ICONS_DIR, 'apple-touch-icon.png'), 'PNG')
draw_icon(192).save(os.path.join(ICONS_DIR, 'icon-192.png'), 'PNG')
draw_icon(512).save(os.path.join(ICONS_DIR, 'icon-512.png'), 'PNG')
draw_icon(512, is_maskable=True).save(os.path.join(ICONS_DIR, 'icon-maskable-512.png'), 'PNG')
print("Ícones gerados com sucesso em:", ICONS_DIR)
