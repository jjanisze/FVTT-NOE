from __future__ import annotations

import base64
import io
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
SIZE = 256
MARGIN = 20
CELL_INSET = 12

ATLASES = {
    "a": [
        "ruch_revision_c",
        "karabin_laserowy_revision_c",
        "cwiczenie_czyni_mistrza_revision_b",
        "grad_olowiu_revision_b",
        "ja_juz_swoje_odchorowalem_revision_b",
        "jesli_ma_silnik_to_ruszy_revision_b",
        "pakowanie_revision_b",
        "paszcza_revision_b",
        "patriota_revision_b",
    ],
    "b": [
        "urodzony_morderca_revision_b",
        "wychuchana_spluwa_revision_b",
        "zawziety_sukinkot_revision_b",
        "na_symulatorach_to_dzialalo",
        "telepata",
        "przycelowanie",
        "samuraj",
        "nowka_sztuka",
        "przedwojenna_edukacja",
    ],
    "c": [
        "nano_tech",
        "dieta_cud",
        "duch_pustyni",
        "polegam_tylko_na_sobie",
        "ale_jazda",
        "gornik_z_dziada_pradziada",
        "szlachetne_urodzenie",
        "czlowiek_aligator",
        "wloczykij",
    ],
}


def white_alpha(tile: Image.Image) -> Image.Image:
    rgba = tile.convert("RGBA")
    pixels = []
    for red, green, blue, source_alpha in rgba.getdata():
        luminance = max(red, green, blue)
        if luminance <= 28:
            alpha = 0
        else:
            alpha = round(255 * min(1.0, (luminance - 28) / 180))
            alpha = min(alpha, source_alpha)
        pixels.append((255, 255, 255, alpha))
    rgba.putdata(pixels)
    return rgba


def remove_tiny_white_components(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    data = bytearray(alpha.tobytes())
    seen = bytearray(SIZE * SIZE)
    remove: list[int] = []
    neighbours = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for start in range(SIZE * SIZE):
        if seen[start] or data[start] < 16:
            continue
        queue = deque([start])
        seen[start] = 1
        component: list[int] = []
        min_x = min_y = SIZE
        max_x = max_y = 0
        while queue:
            point = queue.popleft()
            component.append(point)
            x, y = point % SIZE, point // SIZE
            min_x, min_y = min(min_x, x), min(min_y, y)
            max_x, max_y = max(max_x, x), max(max_y, y)
            for dx, dy in neighbours:
                nx, ny = x + dx, y + dy
                if 0 <= nx < SIZE and 0 <= ny < SIZE:
                    neighbour = ny * SIZE + nx
                    if not seen[neighbour] and data[neighbour] >= 16:
                        seen[neighbour] = 1
                        queue.append(neighbour)
        width, height = max_x - min_x + 1, max_y - min_y + 1
        if len(component) < 12 or ((width <= 1 or height <= 1) and len(component) < 80):
            remove.extend(component)
    rgba = bytearray(image.tobytes())
    for point in range(SIZE * SIZE):
        if rgba[point * 4 + 3] < 16:
            rgba[point * 4 + 3] = 0
    for point in remove:
        rgba[point * 4 + 3] = 0
    return Image.frombytes("RGBA", image.size, bytes(rgba))


def fill_tiny_black_holes(image: Image.Image) -> Image.Image:
    """Fill tiny enclosed pinholes and scratches without closing structural cutouts."""
    alpha = bytearray(image.getchannel("A").tobytes())
    seen = bytearray(SIZE * SIZE)
    fill: list[int] = []
    neighbours = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for start in range(SIZE * SIZE):
        if seen[start] or alpha[start] >= 16:
            continue
        queue = deque([start])
        seen[start] = 1
        component: list[int] = []
        touches_edge = False
        min_x = min_y = SIZE
        max_x = max_y = 0
        while queue:
            point = queue.popleft()
            component.append(point)
            x, y = point % SIZE, point // SIZE
            min_x, min_y = min(min_x, x), min(min_y, y)
            max_x, max_y = max(max_x, x), max(max_y, y)
            touches_edge |= x == 0 or y == 0 or x == SIZE - 1 or y == SIZE - 1
            for dx, dy in neighbours:
                nx, ny = x + dx, y + dy
                if 0 <= nx < SIZE and 0 <= ny < SIZE:
                    neighbour = ny * SIZE + nx
                    if not seen[neighbour] and alpha[neighbour] < 16:
                        seen[neighbour] = 1
                        queue.append(neighbour)
        width, height = max_x - min_x + 1, max_y - min_y + 1
        if not touches_edge and (len(component) < 24 or (len(component) < 70 and (width <= 3 or height <= 3))):
            fill.extend(component)
    rgba = bytearray(image.tobytes())
    for point in fill:
        rgba[point * 4:point * 4 + 4] = bytes((255, 255, 255, 255))
    return Image.frombytes("RGBA", image.size, bytes(rgba))


def normalize(tile: Image.Image) -> Image.Image:
    icon = white_alpha(tile)
    alpha = icon.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
    if not bbox:
        raise ValueError("empty atlas cell")
    icon = icon.crop(bbox)
    scale = min((SIZE - 2 * MARGIN) / icon.width, (SIZE - 2 * MARGIN) / icon.height)
    resized = icon.resize(
        (max(1, round(icon.width * scale)), max(1, round(icon.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    canvas.alpha_composite(resized, ((SIZE - resized.width) // 2, (SIZE - resized.height) // 2))
    return fill_tiny_black_holes(remove_tiny_white_components(canvas))


def svg_mask(name: str, icon: Image.Image) -> str:
    buffer = io.BytesIO()
    icon.save(buffer, "PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">'
        f'<defs><mask id="{name}-mask"><image width="256" height="256" href="data:image/png;base64,{encoded}"/></mask></defs>'
        f'<rect width="256" height="256" fill="var(--icon-fill, #fff)" mask="url(#{name}-mask)"/></svg>\n'
    )


def main() -> None:
    for atlas_id, names in ATLASES.items():
        atlas = Image.open(RAW / f"batch-61-atlas-{atlas_id}.png").convert("RGB")
        tile_width, tile_height = atlas.width // 3, atlas.height // 3
        preview = Image.new("RGBA", (SIZE * 3, SIZE * 3), (37, 37, 37, 255))
        for index, name in enumerate(names):
            row, column = divmod(index, 3)
            cell = atlas.crop((
                column * tile_width + CELL_INSET,
                row * tile_height + CELL_INSET,
                (column + 1) * tile_width - CELL_INSET,
                (row + 1) * tile_height - CELL_INSET,
            ))
            icon = normalize(cell)
            icon.save(ROOT / f"{name}.png", "PNG", optimize=True)
            (ROOT / f"{name}.svg").write_text(svg_mask(name, icon), encoding="utf-8")
            preview.alpha_composite(icon, (column * SIZE, row * SIZE))
        preview.convert("RGB").save(RAW / f"preview-{atlas_id}.png", "PNG", optimize=True)
    print(f"Processed {sum(map(len, ATLASES.values()))} icons")


if __name__ == "__main__":
    main()
