"""Measure the painted bearing center using opposite points on its bright steel rim."""
from pathlib import Path
from PIL import Image
from math import cos,sin,radians
from statistics import median
im=Image.open(Path(__file__).with_name('roof-off-native.png')).convert('RGB')
center=(390,875)
for iteration in range(4):
    points=[]
    for angle in range(0,360,5):
        c,s=cos(radians(angle)),sin(radians(angle))
        candidates=[]
        for radius in range(185,219):
            x,y=round(center[0]+c*radius),round(center[1]+s*radius)
            rgb=im.getpixel((x,y));score=sum(rgb)/3-abs(radius-201)*.1
            candidates.append((score,x,y))
        _,x,y=max(candidates);points.append((x,y))
    pairs=[((points[i][0]+points[i+36][0])/2,(points[i][1]+points[i+36][1])/2)for i in range(36)]
    center=(median(x for x,y in pairs),median(y for x,y in pairs))
print({'paintedBearingEstimate':center,'oppositePairSpread':[max(x for x,y in pairs)-min(x for x,y in pairs),max(y for x,y in pairs)-min(y for x,y in pairs)]})
