"""Calibrate generated padding/proportions into the authored bus frame.

The generator emits a wider canvas than the requested 1:4 layout. These are
framing/resampling operations only; no painting or alpha extraction.
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
SIZE = (600,2400)
DEST = (12,48,588,2352)
BODY_X_MAP = [(0,0),(60,42),(540,558),(600,600)]


def frame(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    bounds = image.getchannel("A").point(lambda value:255 if value > 8 else 0).getbbox()
    if not bounds:
        raise ValueError("Empty source")
    fitted = image.crop(bounds).resize((DEST[2]-DEST[0],DEST[3]-DEST[1]),Image.Resampling.LANCZOS)
    result = Image.new("RGBA",SIZE)
    result.paste(fitted,DEST[:2])
    # Restore the drawn body's 2.58 m width without clipping its mirrors:
    # expand the body region and compress only the outer mirror margins.
    calibrated = Image.new("RGBA",SIZE)
    for (src_left,dst_left),(src_right,dst_right) in zip(BODY_X_MAP,BODY_X_MAP[1:]):
        band = result.crop((src_left,0,src_right,SIZE[1]))
        band = band.resize((dst_right-dst_left,SIZE[1]),Image.Resampling.LANCZOS)
        calibrated.paste(band,(dst_left,0))
    print({"input":source.name,"size":image.size,"crop":bounds,"destination":DEST})
    return calibrated


def register_edit(source: Path, reference: Image.Image) -> Image.Image:
    """An edit of a calibrated frame needs registration, not a second body warp."""
    image = Image.open(source).convert("RGBA")
    bounds = image.getchannel("A").point(lambda value:255 if value > 8 else 0).getbbox()
    target = reference.getchannel("A").point(lambda value:255 if value > 8 else 0).getbbox()
    fitted = image.crop(bounds).resize((target[2]-target[0],target[3]-target[1]),Image.Resampling.LANCZOS)
    result = Image.new("RGBA",reference.size)
    result.paste(fitted,target[:2])
    print({"edit":source.name,"crop":bounds,"destination":target})
    return result


if __name__ == "__main__":
    frame(HERE / "roof-off-v2.png").save(HERE / "roof-off-native.png")
