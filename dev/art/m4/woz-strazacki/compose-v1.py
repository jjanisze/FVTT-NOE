"""Composite only the cab roof over a canonical cutaway; share all other pixels."""
import sys
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
from frame import HERE, frame, register_edit

CAB = (60,1207,544,1684)
FEATHER = 6

def compose():
    opened = frame(HERE / "roof-off-v2.png")
    roof = register_edit(HERE / "roof-on-v1.png",opened)
    glass = register_edit(HERE / "roof-on-glass-v2.png",opened)
    # Keep the original roof; use the revised opaque glass only in its panes.
    roof.paste(glass.crop((65,1500,535,1615)),(65,1500))
    # Register the generated cab to the canonical cutaway's rear wall and nose.
    # This also excludes the generated front elevation from the roof overlay.
    cab = roof.crop((60,1148,544,1638)).resize((484,477),Image.Resampling.LANCZOS)
    roof.paste(cab,(60,1207))
    mask = Image.new("L",opened.size)
    draw = ImageDraw.Draw(mask)
    x0,y0,x1,y1 = CAB
    for inset in range(FEATHER+1):
        draw.rounded_rectangle((x0+inset,y0+inset,x1-inset-1,y1-inset-1),
                               radius=max(1,15-inset),fill=round(255*inset/FEATHER))
    # The exhaust stack beside the cab belongs to the common exterior.
    draw.rectangle((503,1185,542,1280),fill=0)
    closed = Image.composite(roof,opened,mask)
    closed.putalpha(opened.getchannel("A"))
    return opened,closed,mask

if __name__ == "__main__":
    opened,closed,mask = compose()
    opened.save(HERE / "roof-off-native.png")
    closed.save(HERE / "roof-on-native.png")
    mask.save(HERE / "roof-mask.png")
    opened.save(HERE.parent / "in/wnetrza/woz-strazacki.png")
    closed.save(HERE.parent / "in/pojazdy/woz-strazacki.png")
