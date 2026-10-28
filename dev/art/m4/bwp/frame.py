"""Fit generated art uniformly to the IFV catalog frame, preserving its alpha."""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SIZE = (720,1350)
MARGIN = 20

def bounds(image):
    return image.getchannel("A").point(lambda v:255 if v > 8 else 0).getbbox()

def frame():
    image = Image.open(HERE / "roof-off-bradley-v1.png").convert("RGBA")
    # The cutout has an almost-opaque (252/255) interior; make the solid vehicle
    # opaque while preserving its antialiased, transparent outer edge.
    image.putalpha(image.getchannel("A").point(lambda v:255 if v>128 else v))
    crop = bounds(image)
    fitted = image.crop(crop)
    fitted.thumbnail((SIZE[0]-MARGIN*2,SIZE[1]-MARGIN*2),Image.Resampling.LANCZOS)
    result = Image.new("RGBA",SIZE)
    at = ((SIZE[0]-fitted.width)//2,(SIZE[1]-fitted.height)//2)
    result.paste(fitted,at)
    result.putalpha(result.getchannel("A").point(lambda v:255 if v>128 else v))
    print({"source":image.size,"crop":crop,"fitted":fitted.size,"at":at})
    return result

def register_edit(source,reference):
    image = Image.open(source).convert("RGBA")
    crop,target = bounds(image),bounds(reference)
    fitted = image.crop(crop).resize((target[2]-target[0],target[3]-target[1]),Image.Resampling.LANCZOS)
    result = Image.new("RGBA",SIZE)
    result.paste(fitted,target[:2])
    print({"edit":source.name,"crop":crop,"target":target})
    return result

if __name__ == "__main__":
    frame().save(HERE / "roof-off-native.png")
