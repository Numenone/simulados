# -*- coding: utf-8 -*-
"""Parse 2nd-phase discursive exams (per subject) and CPT (redação) papers.

Discursive questions have no published answer key, so the whole question region
can be rendered verbatim — nothing to hide.
"""
import pymupdf, json, os, re, glob, collections
from parse_coords import cells_for, clean

OUT = '../public/d'
os.makedirs(OUT, exist_ok=True)

SUBMAP = {'biologia': 'Biologia', 'filosofia': 'Filosofia', 'fisica': 'Física',
          'geografia': 'Geografia', 'historia': 'História', 'matematica': 'Matemática',
          'quimica': 'Química', 'sociologia': 'Sociologia', 'musica': 'Música',
          'design': 'Design', 'arquitetura': 'Arquitetura e Urbanismo',
          'arquitetura_urbanismo': 'Arquitetura e Urbanismo',
          'compreensao_texto': 'Compreensão e Produção de Textos',
          'compreensao': 'Compreensão e Produção de Textos'}

QSTART = re.compile(r'^\s*(\d{1,2})\s*[-–]\s*(?:Valor\s*:?\s*([\d,\.]+)\s*pontos?)?\s*(.*)$', re.S)
VALOR = re.compile(r'Valor\s*:?\s*([\d,\.]+)\s*pontos?', re.I)
LINHAS = re.compile(r'ter de\s*(\d{1,2})\s*a\s*(\d{1,2})\s*linhas|at[ée]\s*(\d{1,2})\s*linhas', re.I)
SKIP = re.compile(r'INSTRU[ÇC][ÕO]ES|INSCRI[ÇC][ÃA]O|NOME DO CANDIDATO|PROCESSO SELETIVO|'
                  r'Edital|RASCUNHO|folha de vers[ãa]o definitiva|Confira, acima', re.I)

MAT = pymupdf.Matrix(1.7, 1.7)


def subject_of(base):
    b = base.lower()
    for k in sorted(SUBMAP, key=len, reverse=True):
        if re.search(r'(^|_)%s($|_|\.)' % k, b):
            return SUBMAP[k]
    if b.startswith('cpt_'):
        return 'Compreensão e Produção de Textos'
    return None


def body_start(cells):
    """Index of the first cell after the instruction pages."""
    for i, c in enumerate(cells):
        t = c['t']
        m = QSTART.match(t)
        if m and (VALOR.search(t) or (i > 20 and len(t.strip()) > 45 and not SKIP.search(t))):
            return i
    return 0


def render_region(doc, pg0, y0, pg1, y1, prefix):
    names = []
    for pg in range(pg0, pg1 + 1):
        page = doc[pg]
        W, H = page.rect.width, page.rect.height
        a = (y0 - 7) if pg == pg0 else 36
        b = (y1 + 6) if pg == pg1 else H - 36
        a, b = max(0, a), min(H, b)
        if b - a < 20:
            continue
        pix = page.get_pixmap(matrix=MAT, clip=pymupdf.Rect(26, a, W - 22, b))
        nm = '%s_p%d.webp' % (prefix, pg)
        open(os.path.join(OUT, nm), 'wb').write(pix.pil_tobytes(format="WEBP", quality=78, method=4))
        names.append(nm)
    return names


items = []
for f in sorted(glob.glob('lines/d2_*.json')) + sorted(glob.glob('lines/cpt_*.json')):
    src = os.path.basename(f)[:-5]
    year = int(src.split('_')[1])
    subj = subject_of(src)
    if not subj:
        continue
    doc = json.load(open(f, encoding='utf-8'))
    C = cells_for(doc)
    T = [c['t'] for c in C]
    start = body_start(C)
    pdf = pymupdf.open('pdfs/%s.pdf' % src)

    starts = []
    for i in range(start, len(T)):
        m = QSTART.match(T[i])
        if not m:
            continue
        if SKIP.search(T[i]):
            continue
        has_valor = bool(VALOR.search(T[i]))
        rest = (m.group(3) or '').strip()
        if has_valor or len(rest) > 45:
            n = int(m.group(1))
            if starts and n <= starts[-1][1]:
                continue
            if not starts and n > 3:
                continue
            starts.append((i, n))

    if not starts:
        continue

    for si, (i, n) in enumerate(starts):
        end = starts[si + 1][0] if si + 1 < len(starts) else len(T)
        txt = clean('\n'.join(x for x in T[i:end] if not SKIP.search(x)))
        a, b = C[i], C[end - 1]
        qid = '%s-%d' % (src, n)
        imgs = render_region(pdf, a['pg'], a['y0'], b['pg'], b['y1'], qid)
        pts = VALOR.search(T[i])
        lm = LINHAS.search(txt)
        items.append(dict(
            id=qid, year=year, subject=subj, number=n, source=src,
            kind='redacao' if src.startswith('cpt_') else 'discursiva',
            points=float(pts.group(1).replace(',', '.')) if pts else None,
            lines=(int(lm.group(2) or lm.group(3)) if lm else None),
            text=txt[:6000], images=imgs,
            pdf='https://servicos.nc.ufpr.br' if src.startswith('d2_2') else '',
        ))

json.dump(items, open('discursivas.json', 'w', encoding='utf-8'), ensure_ascii=False)
tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print("discursive items:", len(items))
print("by kind:", dict(collections.Counter(i['kind'] for i in items)))
print("by subject:", dict(collections.Counter(i['subject'] for i in items).most_common()))
print("by year:", dict(sorted(collections.Counter(i['year'] for i in items).items())))
print("images MB:", round(tot / 1e6, 2))
