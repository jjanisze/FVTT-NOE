"""Original geometric top-down fixture art. Front points south; regenerate as WEBP."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2] / "ui" / "poscig" / "vehicles"
root.mkdir(parents=True, exist_ok=True)
for name, color, rotation in [("truck", "#ad7652", 0), ("scout", "#7e968f", 90), ("van", "#697d91", 180)]:
    im = Image.new("RGBA", (256, 256))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((62, 33, 198, 238), 22, fill=(0, 0, 0, 50))
    for y in [54, 171]:
        for x in [49, 181]:
            d.rounded_rectangle((x, y, x + 27, y + 46), 7, fill="#202329", outline="#4b4e50", width=3)
            for ty in range(y + 6, y + 42, 7):
                d.line((x + 3, ty, x + 24, ty), fill="#11151a", width=2)
    d.rounded_rectangle((69, 30, 188, 230), 14, fill="#303b40", outline="#171c21", width=4)
    d.rounded_rectangle((75, 35, 181, 221), 11, fill=color, outline="#d0b69b", width=2)
    d.rectangle((83, 45, 174, 115), fill="#4d5152", outline="#292e33", width=4)
    for x in range(92, 174, 13):
        d.line((x, 47, x, 111), fill="#717375", width=3)
    d.polygon([(84, 132), (172, 132), (178, 165), (79, 165)], fill="#253e49", outline="#adc2c6", width=3)
    d.line((91, 137, 117, 158), fill="#6a9aa4", width=3)
    d.rounded_rectangle((80, 170, 176, 206), 5, outline="#dec4a4", width=2)
    d.rectangle((73, 212, 183, 225), fill="#272e32")
    for x in [82, 157]:
        d.rectangle((x, 213, x + 18, 220), fill="#efe1af")
    d.rectangle((112, 216, 146, 224), fill="#161d22")
    for x in [67, 188]:
        d.rectangle((x - 7, 148, x + 6, 154), fill="#363f43")
    if rotation:
        im = im.rotate(rotation)
    im.save(root / f"{name}.webp", "WEBP", lossless=True)
