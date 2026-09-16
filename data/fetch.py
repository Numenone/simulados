import re, os, urllib.request, concurrent.futures as cf, json
OUT="pdfs"; os.makedirs(OUT, exist_ok=True)
LEG="http://www.nc.ufpr.br/concursos_institucionais/ufpr/ps{y}/"
def get(u, t=45):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent':'Mozilla/5.0'}), timeout=t)
        return r.status, r.read()
    except Exception as e:
        return 0, str(e).encode()

targets=[]  # (name, url, kind, year)
# 1) legacy 1st phase objective
for y in range(2004,2019):
    targets.append((f"cg_{y}.pdf", LEG.format(y=y)+f"provas1fase/PS{y}_conhecimentos_gerais.pdf","objetiva",y))
# 2) legacy 2fase discursive pages -> enumerate
def leg2(y):
    s,b=get(LEG.format(y=y)+"provas2fase.htm")
    res=[]
    if s==200:
        h=b.decode('utf-8','replace')
        for l in set(re.findall(r'href="([^"]+\.pdf)"',h,re.I)):
            url=LEG.format(y=y)+l if not l.startswith('http') else l
            nm=re.sub(r'[^a-z0-9]+','_',l.lower().split('/')[-1][:-4])
            res.append((f"d2_{y}_{nm}.pdf",url,"discursiva",y))
    return res
with cf.ThreadPoolExecutor(10) as ex:
    for r in ex.map(leg2, range(2010,2019)): targets+=r
# 3) new portal 2fase (2018-2026)
def new2(y):
    res=[]
    idx=f"https://servicos.nc.ufpr.br/documentos/ps{y}/provas/2fase/provas_2fase.html"
    s,b=get(idx)
    if s==200:
        h=b.decode('utf-8','replace')
        for l in set(re.findall(r'href="([^"]+\.pdf)"',h,re.I)):
            url=l if l.startswith('http') else f"https://servicos.nc.ufpr.br/documentos/ps{y}/provas/2fase/"+l.lstrip('./')
            nm=re.sub(r'[^a-z0-9]+','_',url.lower().split('/')[-1][:-4])
            res.append((f"d2_{y}_{nm}.pdf",url,"discursiva",y))
    # CPT
    for pat in ["001-CPT.pdf","001-compreensao-texto.pdf","001-CPT-.pdf"]:
        res.append((f"cpt_{y}.pdf", f"https://servicos.nc.ufpr.br/documentos/ps{y}/provas/2fase/{pat}","cpt",y))
    # gabarito objetiva
    for pat in ["definitivo/Geral.pdf","Geral.pdf"]:
        res.append((f"gab_{y}.pdf", f"https://servicos.nc.ufpr.br/documentos/ps{y}/provas/{pat}","gabarito",y))
    return res
with cf.ThreadPoolExecutor(10) as ex:
    for r in ex.map(new2, range(2018,2027)): targets+=r

manifest=[]
def dl(t):
    nm,url,kind,y=t
    p=os.path.join(OUT,nm)
    if os.path.exists(p) and os.path.getsize(p)>20000: return (nm,url,kind,y,os.path.getsize(p))
    s,b=get(url)
    if s==200 and b[:4]==b'%PDF' and len(b)>20000:
        open(p,'wb').write(b); return (nm,url,kind,y,len(b))
    return None
with cf.ThreadPoolExecutor(8) as ex:
    for r in ex.map(dl, targets):
        if r: manifest.append(r); print("OK",r[4],r[0])
json.dump([{"file":a,"url":b,"kind":c,"year":d,"size":e} for a,b,c,d,e in manifest], open("manifest.json","w"), indent=1)
print("TOTAL",len(manifest))
