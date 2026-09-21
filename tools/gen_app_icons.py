# مولّد أيقونات MATRIX الأصلية (2026-09-21) — يستبدل أيقونات قالب Expo الافتراضية.
# الهوية: خلفية كحلية #0B1220 + حرف M كخط سعر بتيل #2DD4BF (تدرّج) + نقطة كهرمانية دافئة (آخر قمة).
# التشغيل (يحتاج Pillow، يُشغَّل من داخل مجلد فارغ ثم تُنسخ الملفات):
#   python3 gen_app_icons.py
#   -> icon.png, adaptive-icon.png, android-icon-{foreground,background,monochrome}.png,
#      splash-icon.png, favicon.png  => mobile/assets/
#   -> icon.ico, icon.icns           => desktop/build/
from PIL import Image, ImageDraw, ImageFilter
import math
S=4096
NAVY=(11,18,32); NAVY2=(22,32,51)
TEAL_T=(94,234,212); TEAL_B=(20,184,166)
AMBER=(251,191,36)
# M price-line points, normalized to box [-1,1], scaled by `scale` around center
PTS=[(-0.66,0.52),(-0.38,-0.36),(-0.04,0.22),(0.30,-0.36),(0.58,0.52)]
def mark_mask(scale, S=S, width_frac=0.155):
    m=Image.new('L',(S,S),0); d=ImageDraw.Draw(m)
    c=S/2; r=S/2*scale
    P=[(c+x*r, c+y*r) for x,y in PTS]
    w=int(r*width_frac*2)
    d.line(P, fill=255, width=w, joint='curve')
    for p in (P[0],P[-1]):
        d.ellipse([p[0]-w/2,p[1]-w/2,p[0]+w/2,p[1]+w/2], fill=255)
    return m, P, w
def dot_mask(P,w,scale,S=S):
    m=Image.new('L',(S,S),0); d=ImageDraw.Draw(m)
    # amber "latest high" dot above the right peak
    px,py=P[3]; rad=w*0.46; cx=px+w*1.05; cy=py-w*0.95
    d.ellipse([cx-rad,cy-rad,cx+rad,cy+rad], fill=255); return m
def grad(top,bot,S=S):
    g=Image.new('RGB',(1,S))
    for y in range(S):
        t=y/(S-1); g.putpixel((0,y),tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(3)))
    return g.resize((S,S))
def bg(S=S):
    im=Image.new('RGB',(S,S),NAVY); 
    # soft radial glow
    glow=Image.new('L',(S,S),0); d=ImageDraw.Draw(glow)
    d.ellipse([S*0.1,S*0.05,S*0.9,S*0.85],fill=255)
    glow=glow.filter(ImageFilter.GaussianBlur(S*0.12))
    im=Image.composite(Image.new('RGB',(S,S),NAVY2),im,glow)
    return im
def compose(base, scale, mono=False, with_dot=True):
    m,P,w=mark_mask(scale)
    if mono:
        base.paste((255,255,255,255),(0,0),m)
        if with_dot: base.paste((255,255,255,255),(0,0),dot_mask(P,w,scale))
        return base
    # teal glow
    glow=m.filter(ImageFilter.GaussianBlur(S*0.02)).point(lambda v:int(v*0.35))
    base.paste(TEAL_B+((255,) if base.mode=='RGBA' else ()),(0,0),glow)
    t=grad(TEAL_T,TEAL_B)
    if base.mode=='RGBA': t=t.convert('RGBA')
    base.paste(t,(0,0),m)
    if with_dot: base.paste(AMBER+((255,) if base.mode=='RGBA' else ()),(0,0),dot_mask(P,w,scale))
    return base
def save(im,size,name): im.resize((size,size),Image.LANCZOS).save(name, optimize=True)
# iOS / general icon: full bleed opaque
icon=compose(bg(),0.72); save(icon,1024,'icon.png')
# Android adaptive foreground: transparent, mark inside 66% safe zone
fg=compose(Image.new('RGBA',(S,S),(0,0,0,0)),0.50); save(fg,1024,'adaptive-icon.png')
save(fg,512,'android-icon-foreground.png')
Image.new('RGB',(512,512),NAVY).save('android-icon-background.png')
mono=compose(Image.new('RGBA',(S,S),(0,0,0,0)),0.50,mono=True); save(mono,432,'android-icon-monochrome.png')
# splash: mark on transparent, small in canvas (bg navy from app.json)
sp=compose(Image.new('RGBA',(S,S),(0,0,0,0)),0.30); save(sp,1024,'splash-icon.png')
# favicon
save(icon,48,'favicon.png')
# desktop
i1024=Image.open('icon.png')
i1024.save('icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
i1024.save('icon.icns')
