# -*- coding: utf-8 -*-
"""Render spoiler-free crops for figure-dependent questions.

Two kinds of crop:
  stem  -> question header .. just above the first alternative (never shows the answer marker)
  opt_X -> one alternative, cropped to the right of the letter marker so the
           printed correct-answer arrow is never visible.
"""
import pymupdf, json, os, re, collections, shutil

OUT = '../public/q'
if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT, exist_ok=True)

Q = json.load(open('raw_objetivas.json', encoding='utf-8'))

FIGWORD = re.compile(
    r'figura|gr[áa]fico|imagem|esquema|mapa|tabela|charge|tirinha|quadro|ilustra|'
    r'ao lado|abaixo representa|a seguir representa|diagrama|f[óo]rmula estrutural|'
    r'estrutura abaixo|conforme a figura|circuito|represent[ae]d[ao] (a|na) seguir',
    re.I)

ZOOM = 1.7
MAT = pymupdf.Matrix(ZOOM, ZOOM)


def save(page, clip, name, q=78):
    if clip.height < 12 or clip.width < 12:
        return None
    pix = page.get_pixmap(matrix=MAT, clip=clip)
    data = pix.pil_tobytes(format="WEBP", quality=q, method=4)
    open(os.path.join(OUT, name), 'wb').write(data)
    return name


LINES = {}


def page_art(src, pg):
    """Image + drawing rects on a page, cached."""
    if src not in LINES:
        d = json.load(open('lines/%s.json' % src, encoding='utf-8'))
        LINES[src] = {p['n']: p for p in d['pages']}
    P = LINES[src].get(pg)
    if not P:
        return []
    return [r for r in P['images'] + P['draws']
            if (r[2] - r[0]) > 18 and (r[3] - r[1]) > 14]


def art_in(src, rc, pad=2):
    for r in page_art(src, rc['pg']):
        if not (r[3] < rc['y0'] - pad or r[1] > rc['y1'] + pad):
            if not (r[2] < rc['x0'] - 40 or r[0] > rc['x1'] + 220):
                return True
    return False


docs = {}
n_stem = n_opt = 0
for q in Q:
    short_opts = sum(1 for v in q['options'].values() if len(v.strip()) < 3)
    blank_opts = sum(1 for v in q['options'].values() if not v.strip())
    graphical = blank_opts >= 1 or (short_opts >= 2 and sum(
        1 for L, rc in q['optRects'].items()
        if len(q['options'].get(L, '').strip()) < 3 and art_in(q['source'], rc)) >= 2)
    kw = bool(FIGWORD.search(q['statement']))
    q['needsImage'] = bool(q['hasFigure'] or kw or graphical)
    q['graphicalOptions'] = graphical
    q['stemImages'] = []
    q['optImages'] = {}
    if not q['needsImage']:
        continue

    src = q['source']
    if src not in docs:
        docs[src] = pymupdf.open('pdfs/%s.pdf' % src)
    d = docs[src]
    qid = '%s-%d' % (src, q['idx'])

    r = q['stemRegion']
    for pg in range(r['pg0'], r['pg1'] + 1):
        page = d[pg]
        W, H = page.rect.width, page.rect.height
        y0 = (r['y0'] - 7) if pg == r['pg0'] else 38
        y1 = (r['y1'] + 2) if pg == r['pg1'] else H - 38
        y0, y1 = max(0, y0), min(H, y1)
        nm = save(page, pymupdf.Rect(28, y0, W - 24, y1), '%s_s%d.webp' % (qid, pg))
        if nm:
            q['stemImages'].append(nm)
            n_stem += 1

    if graphical:
        for L, rc in q['optRects'].items():
            page = d[rc['pg']]
            W = page.rect.width
            # start 4pt to the right of the marker so "►a)" is cropped away
            H = page.rect.height
            x0 = rc['x0'] + 15
            x1 = min(W - 22, max(rc['x1'] + 250, x0 + 210))
            y0 = rc['y0'] - 2
            # a graphical alternative is a picture, not a line of text: make sure
            # the crop is tall enough to actually contain it
            y1 = min(H - 20, max(rc['y1'] + 1, y0 + 115))
            nm = save(page, pymupdf.Rect(x0, y0, x1, y1), '%s_o%s.webp' % (qid, L), q=82)
            if nm:
                q['optImages'][L] = nm
                n_opt += 1

json.dump(Q, open('raw_objetivas.json', 'w', encoding='utf-8'), ensure_ascii=False)
tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
print("needsImage:", sum(1 for q in Q if q['needsImage']), "of", len(Q))
print("graphicalOptions:", sum(1 for q in Q if q['graphicalOptions']))
print("stem crops:", n_stem, " option crops:", n_opt)
print("total MB:", round(tot / 1e6, 2))
