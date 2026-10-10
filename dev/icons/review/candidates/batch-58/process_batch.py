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
        "tarcza_umyslu_revision_d",
        "zamarcie_revision_d",
        "szosty_zmysl_revision_c",
        "tylko_drasniecie_revision_b",
        "celowanie_revision_b",
        "naprawianie_revision_b",
        "palcozerca_revision_b",
        "roznorodne_ataki_revision_b",
        "skok_lowcy_revision_b",
    ],
    "b": [
        "tanczace_pily_revision_b",
        "trzeba_dobic_revision_b",
        "wrog_molocha_revision_b",
        "bolesny_atak",
        "odporny",
        "odstapienie",
        "przyspieszenie",
        "skakun",
        "skoczek",
    ],
    "c": [
        "skok",
        "szarpanie",
        "tchorzliwosc",
        "udzwig",
        "unieruchomienie",
        "wirujace_kiscienie",
        "wycofanie_sie",
        "zmysly",
        "zasadzka",
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


def remove_tiny_components(image: Image.Image, name: str) -> Image.Image:
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
        atlas_bleed = (
            (name == "odporny" and min_x <= MARGIN and width <= 12 and len(component) < 400)
            or (name == "odstapienie" and min_y >= 225)
            or (name == "skakun" and min_x <= MARGIN and width <= 12 and len(component) < 100)
        )
        if len(component) < 12 or ((width <= 1 or height <= 1) and len(component) < 80) or atlas_bleed:
            remove.extend(component)
    rgba = bytearray(image.tobytes())
    for point in range(SIZE * SIZE):
        if rgba[point * 4 + 3] < 16:
            rgba[point * 4 + 3] = 0
    for point in remove:
        rgba[point * 4 + 3] = 0
    return Image.frombytes("RGBA", image.size, bytes(rgba))


def normalize(tile: Image.Image, name: str) -> Image.Image:
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
    return remove_tiny_components(canvas, name)


def svg_mask(name: str, icon: Image.Image) -> str:
    buffer = io.BytesIO()
    icon.save(buffer, "PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" '
        'viewBox="0 0 256 256">'
        f'<defs><mask id="{name}-mask"><image width="256" height="256" '
        f'href="data:image/png;base64,{encoded}"/></mask></defs>'
        f'<rect width="256" height="256" fill="var(--icon-fill, #fff)" '
        f'mask="url(#{name}-mask)"/></svg>\n'
    )


def main() -> None:
    previews: dict[str, Image.Image] = {}
    for atlas_id, names in ATLASES.items():
        atlas_path = RAW / f"batch-58-atlas-{atlas_id}.png"
        atlas = Image.open(atlas_path).convert("RGB")
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
            icon = normalize(cell, name)
            icon.save(ROOT / f"{name}.png", "PNG", optimize=True)
            (ROOT / f"{name}.svg").write_text(svg_mask(name, icon), encoding="utf-8")
            preview.alpha_composite(icon, (column * SIZE, row * SIZE))
        preview.convert("RGB").save(RAW / f"preview-{atlas_id}.png", "PNG", optimize=True)
        previews[atlas_id] = preview
    print(f"Processed {sum(map(len, ATLASES.values()))} icons")


if __name__ == "__main__":
    main()
