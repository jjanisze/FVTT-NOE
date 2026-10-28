"""Fit generated alpha into the catalog frame and restore the planned body width.

Only cropping and resampling; no painting or alpha extraction. Both variants
share this transform. The edited roof is registered to the calibrated cutaway.
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SIZE = (600,1800)
DEST = (12,36,588,1764)
X_MAP = [(0,0),(100,50),(500,550),(600,600)]

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
    result = Image.new("RGBA",SIZE)
    for (a,x),(b,y) in zip(X_MAP,X_MAP[1:]):
        band = fitted.crop((a,0,b,SIZE[1])).resize((y-x,SIZE[1]),Image.Resampling.LANCZOS)
        result.paste(band,(x,0))
    return result

def register_edit(source, reference):
    return fit(source,bounds(reference))

if __name__ == "__main__":
    frame(HERE / "roof-off-v2.png").save(HERE / "roof-off-native.png")
