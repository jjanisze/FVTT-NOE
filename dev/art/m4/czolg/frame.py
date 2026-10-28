"""Register the M1A1 hull at physical scale; retain blank space for the barrel overhang."""
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
SIZE=(780,2100)
BODY=(25,72,755,1658)

def bounds(image):
    return image.getchannel('A').point(lambda p:255 if p>8 else 0).getbbox()

def frame():
    src=Image.open(HERE/'roof-off-v1.png').convert('RGBA')
    src.putalpha(src.getchannel('A').point(lambda p:0 if p<=8 else 255 if p>128 else p))
    box=bounds(src);x0,y0,x1,y1=BODY
    crop=src.crop(box).resize((x1-x0,y1-y0),Image.Resampling.LANCZOS)
    crop.putalpha(crop.getchannel('A').point(lambda p:255 if p>128 else p))
    result=Image.new('RGBA',SIZE);result.paste(crop,(x0,y0))
    print({'source':src.size,'crop':box,'targetBody':BODY,
           'aspectCorrection':((x1-x0)/(y1-y0))/((box[2]-box[0])/(box[3]-box[1]))})
    return result

def register_closed(path,reference):
    src=Image.open(path).convert('RGBA');a=src.getchannel('A')
    spans=[]
    for y in range(src.height):
        row=a.crop((0,y,src.width,y+1)).point(lambda p:255 if p>8 else 0).getbbox()
        if row:spans.append((y,row[0],row[2]))
    max_width=max(x1-x0 for _,x0,x1 in spans)
    body=[(y,x0,x1) for y,x0,x1 in spans if x1-x0>=max_width*.6]
    top,bottom=body[0][0],body[-1][0]+1
    left=min(x0 for _,x0,_ in body);right=max(x1 for _,_,x1 in body)
    target=bounds(reference);sx=(target[2]-target[0])/(right-left);sy=(target[3]-target[1])/(bottom-top)
    result=src.transform(SIZE,Image.Transform.AFFINE,
      (1/sx,0,left-target[0]/sx,0,1/sy,top-target[1]/sy),Image.Resampling.BICUBIC)
    print({'closedHullBounds':[left,top,right,bottom],'target':target,'scale':[sx,sy]})
    return result

if __name__=='__main__':frame().save(HERE/'roof-off-native.png')
