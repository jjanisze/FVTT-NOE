"""M1A1: one canonical cutaway, covered hull and exact extracted upper assembly."""
import json
from PIL import Image,ImageDraw,ImageChops
from frame import HERE,SIZE,BODY,frame,register_closed

PIVOT=(389,884)
UPPER=[(127,466),(650,466),(655,606),(668,715),(699,982),(646,1094),
 (646,1144),(595,1230),(580,1260),(560,1298),(520,1307),(484,1288),
 (451,1281),(431,1260),(345,1260),(300,1245),(131,1144),(142,1100),
 (78,980),(101,713),(122,605)]
BARREL=[(350,1240),(434,1240),(421,1265),(415,1290),(415,1405),
 (411,1430),(410,1510),(417,1535),(425,1555),(426,1635),(421,1658),
 (358,1658),(349,1635),(348,1555),(355,1535),(361,1510),
 (362,1430),(358,1405),(356,1290),(351,1265)]

def rectmask(boxes):
    m=Image.new('L',SIZE);d=ImageDraw.Draw(m)
    for box in boxes:d.rectangle(box,fill=255)
    return m

def compose():
    opened=frame()
    generated=register_closed(HERE/'roof-on-v1.png',opened)
    generated.putalpha(generated.getchannel('A').point(lambda p:0 if p<=8 else 255 if p>128 else p))
    # Calibrate the unsupported forward part of the barrel to the 9.83 m overall reference.
    end=generated.getchannel('A').crop((300,1658,480,2100)).getbbox()
    if not end:raise ValueError('No forward projection in generated art')
    original_end=1658+end[3]
    lower=generated.crop((300,1658,480,original_end)).resize((180,2038-1658),Image.Resampling.LANCZOS)
    generated.paste(Image.new('RGBA',(180,442)),(300,1658));generated.paste(lower,(300,1658))
    upper=Image.new('L',SIZE);draw=ImageDraw.Draw(upper)
    draw.polygon(UPPER,fill=255);draw.polygon(BARREL,fill=255)
    lower_mask=generated.getchannel('A').crop((300,1658,480,2100))
    upper.paste(lower_mask,(300,1658))
    # Close only the exposed cabin and driver well, preserving every exterior/engine pixel.
    roof_mask=rectmask([(149,640,631,1090),(302,1080,477,1400)])
    roof=opened.copy();paint=opened.crop((180,1120,275,1280))
    for y in range(640,1401,paint.height):
        for x in range(149,632,paint.width):
            box=(x,y,min(x+paint.width,632),min(y+paint.height,1401))
            roof.paste(paint.crop((0,0,box[2]-box[0],box[3]-box[1])),box[:2])
    hull=Image.composite(roof,opened,roof_mask)
    bearing=Image.new('L',SIZE);bd=ImageDraw.Draw(bearing)
    bd.ellipse((184,679,594,1089),fill=255)
    recess=Image.new('RGBA',SIZE,(38,42,31,255))
    rim=bearing.copy();ImageDraw.Draw(rim).ellipse((200,695,578,1073),fill=0)
    recess=Image.composite(opened,recess,rim)
    hull=Image.composite(recess,hull,bearing)
    # The generator left the driver well open beneath the barrel. Reuse its closed,
    # painted hatch fittings to construct the closed hull lid, below the barrel layer.
    driver=Image.new('L',SIZE)
    ImageDraw.Draw(driver).rounded_rectangle((328,1208,457,1394),radius=12,fill=255)
    lid=generated.crop((448,761,580,935)).resize((130,187),Image.Resampling.LANCZOS)
    driver_paint=hull.copy();driver_paint.paste(lid,(328,1208))
    hull=Image.composite(driver_paint,hull,driver)
    hull.putalpha(opened.getchannel('A'))
    turret=generated.copy()
    turret.putalpha(ImageChops.multiply(generated.getchannel('A'),upper))
    # Remove invisible RGB payload; the visible approved pixels are kept unchanged.
    visible=turret.getchannel('A').point(lambda p:255 if p else 0)
    turret=Image.composite(turret,Image.new('RGBA',SIZE),visible)
    closed=Image.alpha_composite(hull,turret)
    box=turret.getchannel('A').getbbox()
    crop=(box[0]-8,box[1]-8,box[2]+8,box[3]+8)
    cut=turret.crop(crop)
    change=ImageChops.lighter(roof_mask,upper)
    change=ImageChops.lighter(change,driver)
    change=ImageChops.lighter(change,bearing)
    return opened,closed,hull,cut,crop,change,generated

if __name__=='__main__':
    opened,closed,hull,turret,crop,mask,generated=compose()
    for name,im in [('roof-off-native',opened),('roof-on-native',closed),('hull-native',hull),
                    ('turret-native',turret),('roof-mask',mask),('roof-on-registered',generated)]:im.save(HERE/(name+'.png'))
    for folder,im in [('wnetrza',opened),('pojazdy',closed),('kadluby',hull),('wieze',turret)]:
        (HERE.parent/'in'/folder).mkdir(exist_ok=True);im.save(HERE.parent/'in'/folder/'czolg.png')
    data={'kadr':list(SIZE),'os':list(PIVOT),'wycinek':[crop[0],crop[1],turret.width,turret.height],
          'pivotInCrop':[PIVOT[0]-crop[0],PIVOT[1]-crop[1]]}
    (HERE/'turret-geometry.json').write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print(data)
