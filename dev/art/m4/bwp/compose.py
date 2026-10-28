"""Register the Bradley roof to the cutaway; keep one canonical exterior and alpha."""
import sys
from PIL import Image, ImageDraw, ImageChops
sys.dont_write_bytecode = True
from frame import HERE, frame, register_edit

# Generator shifted the turret hatches forward of the basket. Move the entire upper
# turret assembly together, never the seats. The rear roof panel extends to meet it.
TURRET_DX, TURRET_DY = -25, 115
TURRET = [(154,498),(466,498),(498,479),(582,479),(592,542),(592,792),
          (538,792),(540,822),(479,899),(333,899),(330,930),(325,1022),
          (325,1044),(321,1083),(315,1089),(304,1088),(295,1080),
          (295,1054),(299,1028),(306,930),(308,900),(204,900),(117,820),(114,645)]
ROOF = (131,101,578,1148)
FEATHER = 5
# A tighter cut follows the barrel, leaving the engine grille on the hull.
EXTRACT = TURRET[:9] + [(333,899),(326,912),(323,950),(320,1018),
    (322,1046),(322,1074),(318,1084),(309,1089),(301,1087),(295,1080),
    (294,1063),(298,1040),(301,1018),(307,930),(307,911),(302,899)] + TURRET[-4:]

def region_mask(size, box, feather=FEATHER):
    mask = Image.new('L',size)
    draw = ImageDraw.Draw(mask)
    x0,y0,x1,y1 = box
    for inset in range(feather+1):
        draw.rectangle((x0+inset,y0+inset,x1-inset-1,y1-inset-1),fill=round(255*inset/max(1,feather)))
    return mask

def compose_layers():
    opened = frame()
    registered = register_edit(HERE/'roof-on-bradley-v1.png',opened)
    roof = registered.copy()
    # A plain armor panel supplies the roof around the translated assembly.
    patch = registered.crop((185,354,526,475)).resize((445,550),Image.Resampling.LANCZOS)
    roof.paste(patch,(132,600))
    cargo = registered.crop((140,108,576,495)).resize((436,510),Image.Resampling.LANCZOS)
    roof.paste(cargo,(140,104))
    # The already covered engine stays pixel-identical to the cutaway.
    engine = (148,951,416,1144)
    roof.paste(opened.crop(engine),engine[:2])
    driver = (429,904,572,1145)
    roof.paste(registered.crop(driver),driver[:2])
    turret_mask = Image.new('L',opened.size)
    ImageDraw.Draw(turret_mask).polygon(TURRET,fill=255)
    translated = Image.new('RGBA',opened.size)
    translated.paste(registered,(TURRET_DX,TURRET_DY))
    moved_mask = Image.new('L',opened.size)
    moved_mask.paste(turret_mask,(TURRET_DX,TURRET_DY))
    # Keep the clean deck before replacing it with the approved upper assembly.
    deck = roof.copy()
    roof = Image.composite(translated,roof,moved_mask)
    mask = region_mask(opened.size,ROOF)
    mask = ImageChops.lighter(mask,moved_mask)
    closed = Image.composite(roof,opened,mask)
    closed.putalpha(opened.getchannel('A'))
    # Tile an unscaled patch of the original roof paint beneath the removable turret.
    # This hidden region no longer uses the stretched draft texture.
    paint = registered.crop((205,155,330,320))
    for py in range(600,1150,paint.height):
        for px in range(132,577,paint.width):
            box=(px,py,min(px+paint.width,577),min(py+paint.height,1150))
            deck.paste(paint.crop((0,0,box[2]-box[0],box[3]-box[1])),box[:2])
    deck.paste(opened.crop(engine),engine[:2])
    deck.paste(registered.crop(driver),driver[:2])
    hull = Image.composite(deck,opened,region_mask(opened.size,ROOF))
    # Reuse the painted bearing rim; no furniture belongs in the closed hull layer.
    bearing = Image.new('L',opened.size)
    ImageDraw.Draw(bearing).ellipse((135,625,465,955),fill=255)
    recess = Image.new('RGBA',opened.size,(35,40,30,255))
    rim = Image.new('L',opened.size)
    draw = ImageDraw.Draw(rim)
    draw.ellipse((135,625,465,955),fill=255)
    draw.ellipse((150,640,450,940),fill=0)
    recess = Image.composite(opened,recess,rim)
    hull = Image.composite(recess,hull,bearing)
    extraction = Image.new('L',opened.size)
    ImageDraw.Draw(extraction).polygon(EXTRACT,fill=255)
    moved_mask = Image.new('L',opened.size)
    moved_mask.paste(extraction,(TURRET_DX,TURRET_DY))
    # Every exposed pixel stays identical to the approved complete token at zero angle.
    hull = Image.composite(hull,closed,moved_mask)
    hull.putalpha(opened.getchannel('A'))
    turret = closed.copy()
    turret.putalpha(ImageChops.multiply(closed.getchannel('A'),moved_mask))
    # Eight clear pixels around the authored mask; this crop must never be trimmed later.
    x0,y0,x1,y1 = moved_mask.getbbox()
    crop = (x0-8,y0-8,x1+8,y1+8)
    return opened,closed,mask,registered,hull,turret.crop(crop),crop,moved_mask

def compose():
    return compose_layers()[:4]

if __name__ == '__main__':
    opened,closed,mask,registered,hull,turret,crop,turret_mask = compose_layers()
    opened.save(HERE/'roof-off-native.png')
    closed.save(HERE/'roof-on-native.png')
    mask.save(HERE/'roof-mask.png')
    registered.save(HERE/'roof-on-registered.png')
    opened.save(HERE.parent/'in/wnetrza/bwp.png')
    closed.save(HERE.parent/'in/pojazdy/bwp.png')
    for folder in ['kadluby','wieze']:
        (HERE.parent/'in'/folder).mkdir(exist_ok=True)
    hull.save(HERE/'hull-native.png')
    turret.save(HERE/'turret-native.png')
    turret_mask.save(HERE/'turret-mask.png')
    hull.save(HERE.parent/'in/kadluby/bwp.png')
    turret.save(HERE.parent/'in/wieze/bwp.png')
    print({'turretCrop':crop,'turretSize':turret.size,'pivotInHull':[300,790],
           'pivotInCrop':[300-crop[0],790-crop[1]]})
