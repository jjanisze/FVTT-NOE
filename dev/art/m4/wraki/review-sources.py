"""Read-only contact sheet of the thirteen accepted base tokens for wreck edits."""
from pathlib import Path
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
ids=['hammer','motocykl','rower','buggy','ciezarowka','autobus','traktor','woz-strazacki','buldozer','bwp','czolg','motorower','deskorolka']
sheet=Image.new('RGB',(1680,2520),'#59635b');draw=ImageDraw.Draw(sheet)
for i,key in enumerate(ids):
    x=(i%4)*420;y=(i//4)*630
    im=Image.open(ROOT/f'tokens/pojazdy/{key}.webp').convert('RGBA');im.thumbnail((390,580),Image.Resampling.LANCZOS)
    sheet.paste(im,(x+(420-im.width)//2,y+30+(580-im.height)//2),im)
    draw.text((x+12,y+10),key,fill='white')
sheet.save(HERE/'source-contact.jpg',quality=90)
