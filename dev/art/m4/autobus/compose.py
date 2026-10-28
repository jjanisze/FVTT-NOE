"""Copy a roof over the canonical cutaway; exterior pixels stay shared verbatim."""
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

sys.dont_write_bytecode = True
from frame import HERE, frame, register_edit

BASE_ROOF = (65,112,535,2225)
FRONT_EDIT = (62,1930,538,2260)
ROOF = (62,112,538,2260)
FEATHER = 6


def rounded_mask(size, bounds):
    mask = Image.new("L",size)
    draw = ImageDraw.Draw(mask)
    x0,y0,x1,y1 = bounds
    for inset in range(FEATHER+1):
        draw.rounded_rectangle((x0+inset,y0+inset,x1-inset-1,y1-inset-1),
                               radius=max(1,35-inset),fill=round(255*inset/FEATHER))
    return mask


def compose():
    opened = frame(HERE / "roof-off-v2.png")
    roof = frame(HERE / "roof-on-v1.png")
    base_mask = rounded_mask(opened.size,BASE_ROOF)
    closed = Image.composite(roof,opened,base_mask)
    # Keep the previously accepted roof/rear pixels; only the front architecture
    # comes from the Fishbowl-inspired windshield edit.
    front = register_edit(HERE / "roof-on-windshield-v2.png",closed)
    front_mask = rounded_mask(opened.size,FRONT_EDIT)
    closed = Image.composite(front,closed,front_mask)
    mask = ImageChops.lighter(base_mask,front_mask)
    # The roof edit varies nominally solid alpha by a few /255. Retain the
    # canonical cutaway's complete alpha map, including its original margins.
    closed.putalpha(opened.getchannel("A"))
    return opened,closed,mask


if __name__ == "__main__":
    opened,closed,mask = compose()
    opened.save(HERE / "roof-off-native.png")
    closed.save(HERE / "roof-on-native.png")
    mask.save(HERE / "roof-mask.png")
    opened.save(HERE.parent / "in/wnetrza/autobus.png")
    closed.save(HERE.parent / "in/pojazdy/autobus.png")
