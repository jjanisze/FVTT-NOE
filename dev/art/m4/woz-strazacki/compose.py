"""Composite only the cab roof over a canonical cutaway; share all other pixels."""
import sys
from PIL import Image, ImageDraw, ImageChops

sys.dont_write_bytecode = True
from frame import HERE, frame, register_edit

CAB = (83,985,519,1480)
FRONT = (80,1390,523,1523)
FEATHER = 6

def region_mask(size, bounds):
    mask = Image.new("L",size)
    draw = ImageDraw.Draw(mask)
    x0,y0,x1,y1 = bounds
    for inset in range(FEATHER+1):
        draw.rounded_rectangle((x0+inset,y0+inset,x1-inset-1,y1-inset-1),
                               radius=max(1,15-inset),fill=round(255*inset/FEATHER))
    return mask

def compose():
    original = frame(HERE / "roof-off-v3.png")
    roof = register_edit(HERE / "roof-on-proportions-v2.png",original)
    roof_mask = region_mask(original.size,CAB)
    # The approved roof-on version remains exactly as previously delivered.
    closed = Image.composite(roof,original,roof_mask)
    front = register_edit(HERE / "roof-off-front-v1.png",original)
    front_mask = region_mask(original.size,FRONT)
    opened = Image.composite(front,original,front_mask)
    opened.putalpha(original.getchannel("A"))
    closed.putalpha(opened.getchannel("A"))
    return opened,closed,ImageChops.lighter(roof_mask,front_mask),front_mask

if __name__ == "__main__":
    opened,closed,mask,front_mask = compose()
    opened.save(HERE / "roof-off-native.png")
    closed.save(HERE / "roof-on-native.png")
    mask.save(HERE / "roof-mask.png")
    front_mask.save(HERE / "front-mask.png")
    opened.save(HERE.parent / "in/wnetrza/woz-strazacki.png")
    closed.save(HERE.parent / "in/pojazdy/woz-strazacki.png")
