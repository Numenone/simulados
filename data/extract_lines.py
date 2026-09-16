# -*- coding: utf-8 -*-
"""Extract line-level text with page + bbox coordinates using PyMuPDF."""
import pymupdf, glob, os, json, re, sys

os.makedirs('lines', exist_ok=True)
files=sorted(glob.glob('pdfs/*.pdf'))
for f in files:
    base=os.path.basename(f)[:-4]
    dst=f'lines/{base}.json'
    if os.path.exists(dst) and os.path.getsize(dst)>1000: continue
    try:
        d=pymupdf.open(f)
    except Exception as e:
        print("FAIL", base, e); continue
    pages=[]
    for pno, page in enumerate(d):
        pw, ph = page.rect.width, page.rect.height
        lines=[]
        td=page.get_text("dict")
        for b in td["blocks"]:
            if b["type"]!=0: continue
            for l in b["lines"]:
                txt="".join(s["text"] for s in l["spans"])
                if not txt.strip(): continue
                x0,y0,x1,y1=l["bbox"]
                lines.append({"t":txt,"x0":round(x0,1),"y0":round(y0,1),"x1":round(x1,1),"y1":round(y1,1)})
        lines.sort(key=lambda L:(round(L["y0"]/3), L["x0"]))
        imgs=[]
        for im in page.get_images(full=True):
            try:
                for r in page.get_image_rects(im[0]):
                    imgs.append([round(r.x0,1),round(r.y0,1),round(r.x1,1),round(r.y1,1)])
            except Exception: pass
        draws=[]
        try:
            for dr in page.get_drawings():
                r=dr["rect"]
                if (r.x1-r.x0)>25 and (r.y1-r.y0)>25:
                    draws.append([round(r.x0,1),round(r.y0,1),round(r.x1,1),round(r.y1,1)])
        except Exception: pass
        pages.append({"n":pno,"w":round(pw,1),"h":round(ph,1),"lines":lines,"images":imgs,"draws":draws})
    json.dump({"file":base,"pages":pages}, open(dst,'w',encoding='utf-8'), ensure_ascii=False)
    print(base, len(pages), sum(len(p['lines']) for p in pages))
