"""Make opaque reference previews for the three isolated atlas failures."""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
for key in ("fachowiec_revision_b", "zjadlem-wlasnego-psa_revision_c", "muzyk_revision_b"):
    destination = HERE / "raw" / f"{key}-reference.png"
    if destination.is_file():
        # Preserve the initial atlas target after corrected candidates replace it.
        continue
    with Image.open(HERE / f"{key}.png") as source:
        icon = source.convert("RGBA")
    canvas = Image.new("RGB", icon.size, "black")
    canvas.paste(icon, (0, 0), icon)
    canvas.resize((768, 768), Image.Resampling.NEAREST).save(destination)
print("Preserved three exact atlas correction references")
