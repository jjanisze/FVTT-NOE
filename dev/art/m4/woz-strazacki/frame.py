"""Fit generated alpha into the catalog frame and restore the planned body width.

Only cropping and resampling; no painting or alpha extraction. Both variants
share this transform. The edited roof is registered to the calibrated cutaway.
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SIZE = (600,1650)
DEST = (10,55,590,1595)
Y_MAP = [(55,55),(690,750),(915,975),(1595,1595)]

def bounds(image):
    return image.getchannel("A").point(lambda v:255 if v > 8 else 0).getbbox()

def fit(source, target):
    image = Image.open(source).convert("RGBA")
    crop = bounds(image)
    fitted = image.crop(crop).resize((target[2]-target[0],target[3]-target[1]),Image.Resampling.LANCZOS)
    result = Image.new("RGBA",SIZE)
    result.paste(fitted,target[:2])
    print({"source":source.name,"crop":crop,"target":target})
    return result

def frame(source):
    fitted = fit(source,DEST)
    result = fitted.copy()
    for (a,x),(b,y) in zip(Y_MAP,Y_MAP[1:]):
        band = fitted.crop((0,a,SIZE[0],b)).resize((SIZE[0],y-x),Image.Resampling.LANCZOS)
        result.paste(band,(0,x))
    return result

def register_edit(source, reference):
    return fit(source,bounds(reference))

if __name__ == "__main__":
    frame(HERE / "roof-off-v3.png").save(HERE / "roof-off-native.png")
