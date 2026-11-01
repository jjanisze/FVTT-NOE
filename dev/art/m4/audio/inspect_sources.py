"""Render source energy envelopes for choosing intact vehicle sound events."""
import importlib.util
import json
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
spec = importlib.util.spec_from_file_location("m5_audio_measure", ROOT/"dev/art/m5/import_audio.py")
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)
sources = json.loads((HERE.parent/"audio-sources.json").read_text(encoding="utf-8"))["sources"]
canvas = Image.new("RGB", (1500, 220*len(sources)), "#202226")
draw = ImageDraw.Draw(canvas)
report = []
for row, source in enumerate(sources):
    file = next((HERE/"in").glob(source["key"]+".original.*"))
    samples = pipeline.read_samples(file, 8000)
    step = 400
    windows = [samples[i:i+step] for i in range(0,len(samples),step)]
    rms = [math.sqrt(sum(s*s for s in w)/len(w)) for w in windows]
    peak = [max(abs(s) for s in w) for w in windows]
    duration = len(samples)/8000
    top, left, width, height = row*220+35, 40, 1415, 155
    draw.text((left,row*220+8), source["key"]+" / "+source["title"]+" / "+str(round(duration,3))+" s", fill="white")
    for db in (-60,-40,-20,0):
        y=top+height*(1+db/70)
        draw.line((left,y,left+width,y),fill="#44484c")
        draw.text((2,y-5),str(db),fill="#a0a0a0")
    for values, color in ((peak,"#7295b2"),(rms,"#7fdf9b")):
        points=[(left+i*width/max(1,len(values)-1),top+height*(1+max(-70,20*math.log10(max(v,1e-9)))/70)) for i,v in enumerate(values)]
        draw.line(points,fill=color,width=2)
    for second in range(0,math.ceil(duration),max(1,math.ceil(duration/20))):
        x=left+second*width/duration
        draw.text((x,top+height+8),str(second),fill="white")
    bins=pipeline.inspect(file)
    report.append(dict(key=source["key"],duration=duration,quarterSecondRmsDb=bins["quarterSecondRmsDb"]))
canvas.save(HERE/"source-envelopes.png")
(HERE/"source-inspection.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print(json.dumps([dict(key=r["key"],duration=r["duration"],firstSeconds=r["quarterSecondRmsDb"][:48],lastSeconds=r["quarterSecondRmsDb"][-20:]) for r in report],indent=2))
