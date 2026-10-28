"""Crop generated alpha and fit uniformly into the catalog frame; no painting."""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SIZE = (750,1200)
MARGIN = 20

def frame():
    image = Image.open(HERE / "token-v1.png").convert("RGBA")
    crop = image.getchannel("A").point(lambda v:255 if v > 8 else 0).getbbox()
    cropped = image.crop(crop)
    cropped.thumbnail((SIZE[0]-MARGIN*2,SIZE[1]-MARGIN*2),Image.Resampling.LANCZOS)
    result = Image.new("RGBA",SIZE)
    at = ((SIZE[0]-cropped.width)//2,(SIZE[1]-cropped.height)//2)
    result.paste(cropped,at)
    print({"source":image.size,"crop":crop,"fitted":cropped.size,"at":at})
    return result

if __name__ == "__main__":
    framed = frame()
    framed.save(HERE / "token-native.png")
    framed.save(HERE.parent / "in/pojazdy/buldozer.png")
