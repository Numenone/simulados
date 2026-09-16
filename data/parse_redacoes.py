# -*- coding: utf-8 -*-
"""Parse CPT (Compreensão e Produção de Textos) papers -> one item per exam,
with full page images plus the extracted writing prompts."""
import pymupdf, json, os, re, glob, collections
from parse_coords import cells_for, clean

OUT = '../public/r'
os.makedirs(OUT, exist_ok=True)

PROMPT = re.compile(r'(escreva um|escreva, |produza um|redija|elabore um|'
                    r'construa um texto|apresente, em um texto|fa[çc]a um resumo)', re.I)
DEVE = re.compile(r'seu texto deve|sua resposta deve|o texto deve|'
                  r'dever[áa] atender|que dever[áa]|seguintes crit[ée]rios', re.I)
LINHAS = re.compile(r'(?:ter )?de\s*(\d{1,2})\s*a\s*(\d{1,2})\s*linhas|'
                    r'm[áa]ximo de\s*(\d{1,2})\s*linhas|at[ée]\s*(\d{1,2})\s*linhas', re.I)
SKIP = re.compile(r'INSTRU[ÇC][ÕO]ES|INSCRI[ÇC][ÃA]O|NOME DO CANDIDATO|Confira, acima|'
                  r'RASCUNHO|folha de vers[ãa]o definitiva|Edital n', re.I)
MAT = pymupdf.Matrix(1.55, 1.55)

out = []
for f in sorted(glob.glob('lines/cpt_*.json')):
    src = os.path.basename(f)[:-5]
    year = int(src.split('_')[1])
    doc = json.load(open(f, encoding='utf-8'))
    C = cells_for(doc)
    T = [c['t'] for c in C]
    pdf = pymupdf.open('pdfs/%s.pdf' % src)

    # skip instruction pages: first page whose text is mostly exam content
    first = 0
    for p in doc['pages']:
        joined = ' '.join(l['t'] for l in p['lines'])
        if len(joined) > 400 and not SKIP.search(joined[:400]):
            first = p['n']
            break

    pages = []
    for pg in range(first, len(pdf)):
        page = pdf[pg]
        pix = page.get_pixmap(matrix=MAT)
        nm = '%s_p%d.webp' % (src, pg)
        open(os.path.join(OUT, nm), 'wb').write(
            pix.pil_tobytes(format="WEBP", quality=76, method=4))
        pages.append(nm)

    prompts = []
    for i, t in enumerate(T):
        if not PROMPT.search(t) or SKIP.search(t):
            continue
        blk = [t]
        for j in range(i + 1, min(i + 14, len(T))):
            s = T[j].strip()
            if not s or SKIP.search(s):
                continue
            if PROMPT.search(s) and len(s) > 60:
                break
            blk.append(s)
            if LINHAS.search(s):
                break
        txt = clean(' '.join(blk))
        if len(txt) < 60:
            continue
        if not (DEVE.search(txt) or LINHAS.search(txt)):
            continue
        lm = LINHAS.search(txt)
        lines = None
        if lm:
            lines = int(next(g for g in (lm.group(2), lm.group(3), lm.group(4)) if g))
        if any(abs(len(txt) - len(p['text'])) < 30 and txt[:60] == p['text'][:60] for p in prompts):
            continue
        prompts.append({'n': len(prompts) + 1, 'text': txt[:1500], 'lines': lines})

    out.append({'id': src, 'year': year, 'source': src,
                'subject': 'Redação / Compreensão e Produção de Textos',
                'pages': pages, 'prompts': prompts})
    print(src, 'pages', len(pages), 'prompts', len(prompts),
          [p['lines'] for p in prompts])

json.dump(out, open('redacoes.json', 'w', encoding='utf-8'), ensure_ascii=False)
tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print("exams:", len(out), "prompts:", sum(len(o['prompts']) for o in out),
      "MB:", round(tot / 1e6, 2))
