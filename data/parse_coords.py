# -*- coding: utf-8 -*-
import re, os, glob, json, unicodedata, collections

ARROW = '►'
ALT_RE = re.compile(r'^\s*(' + ARROW + r'?)\s*([a-eA-E])\)\s*(.*)$', re.S)
QHEAD_RE = re.compile(r'^\s*(\d{1,2})\s*[-–]\s+(.*)$', re.S)
LANGNAME = {'ALEMAO': 'Alemão', 'ESPANHOL': 'Espanhol', 'FRANCES': 'Francês',
            'INGLES': 'Inglês', 'ITALIANO': 'Italiano', 'JAPONES': 'Japonês',
            'POLONES': 'Polonês'}
SUBJ = {'MATEMATICA': 'Matemática', 'FISICA': 'Física', 'QUIMICA': 'Química',
        'BIOLOGIA': 'Biologia', 'GEOGRAFIA': 'Geografia', 'HISTORIA': 'História',
        'LINGUA PORTUGUESA': 'Português', 'PORTUGUES': 'Português',
        'FILOSOFIA': 'Filosofia', 'SOCIOLOGIA': 'Sociologia', 'LITERATURA': 'Literatura'}


def norm(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', s).strip().upper()


def clean(s):
    s = s.replace('­', '').replace('﻿', '')
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def cells_for(doc):
    """Merge line fragments into reading-order cells: rows by baseline, columns by x-gap."""
    out = []
    for p in doc['pages']:
        L = sorted(p['lines'], key=lambda l: (l['y0'], l['x0']))
        rows = []
        for l in L:
            yc = (l['y0'] + l['y1']) / 2
            if rows and abs(yc - rows[-1][0]) <= 3.6:
                rows[-1][1].append(l)
            else:
                rows.append([yc, [l]])
        for yc, frags in rows:
            frags.sort(key=lambda l: l['x0'])
            cur = None
            for f in frags:
                if cur is not None and f['x0'] - cur['x1'] < 22:
                    cur['t'] = cur['t'].rstrip() + ' ' + f['t'].strip()
                    cur['x1'] = max(cur['x1'], f['x1'])
                    cur['y1'] = max(cur['y1'], f['y1'])
                else:
                    if cur:
                        out.append(cur)
                    cur = dict(pg=p['n'], t=f['t'], x0=f['x0'], x1=f['x1'],
                               y0=f['y0'], y1=f['y1'])
            if cur:
                out.append(cur)
    return out


def parse(src, year):
    doc = json.load(open('lines/%s.json' % src, encoding='utf-8'))
    pages = {p['n']: p for p in doc['pages']}
    C = cells_for(doc)
    T = [c['t'] for c in C]

    cand = [i for i, t in enumerate(T) if QHEAD_RE.match(t)]
    starts = []
    for ci, i in enumerate(cand):
        nxt = cand[ci + 1] if ci + 1 < len(cand) else len(T)
        letters = set()
        for j in range(i + 1, min(nxt, i + 160)):
            m = ALT_RE.match(T[j])
            if m:
                letters.add(m.group(2).lower())
        if len(letters) >= 4:
            starts.append((i, int(QHEAD_RE.match(T[i]).group(1))))
    if not starts:
        return []

    q0 = starts[0][0]
    marks = []
    for i, t in enumerate(T):
        if i < q0 - 80:
            continue
        n = norm(t)
        if not n or len(n) > 20:
            continue
        if n in SUBJ:
            marks.append((i, 'subj', SUBJ[n]))
        elif n in LANGNAME:
            marks.append((i, 'lang', LANGNAME[n]))

    out = []
    ends = {}
    for si, (li, qnum) in enumerate(starts):
        end = starts[si + 1][0] if si + 1 < len(starts) else len(T)
        alt_at = {}
        for j in range(li + 1, end):
            m = ALT_RE.match(T[j])
            if m:
                L = m.group(2).lower()
                if L not in alt_at:
                    alt_at[L] = (j, m.group(1) == ARROW, m.group(3))
        if len(alt_at) < 4:
            continue
        first_alt = min(v[0] for v in alt_at.values())
        stmt = [T[li]] + [T[k] for k in range(li + 1, first_alt)]
        stmt[0] = QHEAD_RE.match(stmt[0]).group(2)

        order = sorted(alt_at.items(), key=lambda kv: kv[1][0])
        opts = {}
        correct = None
        for oi, (L, (j, isc, txt)) in enumerate(order):
            nxt_j = order[oi + 1][1][0] if oi + 1 < len(order) else end
            body = [txt] + [T[k] for k in range(j + 1, nxt_j) if not ALT_RE.match(T[k])]
            opts[L] = clean(' '.join(body))
            if isc:
                correct = L

        last = max(v[0] for v in alt_at.values())
        tail = last
        for k in range(last + 1, end):
            if C[k]['pg'] != C[last]['pg'] or C[k]['y0'] - C[tail]['y1'] > 30:
                break
            tail = k
        ends[si] = tail
        pstart = ends.get(si - 1, li - 1) + 1 if si > 0 else 0

        mk = None
        for mi, k, v in marks:
            if mi <= li:
                mk = (k, v)
            else:
                break

        a, b = C[li], C[tail]
        fig = False
        figrects = []
        for pg in range(a['pg'], b['pg'] + 1):
            P = pages.get(pg)
            if not P:
                continue
            ya = a['y0'] if pg == a['pg'] else 0
            yb = b['y1'] if pg == b['pg'] else P['h']
            for r in P['images'] + P['draws']:
                if not (r[3] < ya - 2 or r[1] > yb + 2) and (r[2] - r[0]) > 40 and (r[3] - r[1]) > 30:
                    fig = True
                    figrects.append([pg] + r)

        fa = C[first_alt]
        opt_rects = {}
        for oi, (L, (j, isc, txt)) in enumerate(order):
            nxt_j = order[oi + 1][1][0] if oi + 1 < len(order) else None
            cj = C[j]
            ytop = cj['y0']
            if nxt_j is not None and C[nxt_j]['pg'] == cj['pg'] and C[nxt_j]['y0'] > cj['y0']:
                ybot = C[nxt_j]['y0']
            else:
                ybot = cj['y1'] + 4
            opt_rects[L] = dict(pg=cj['pg'], x0=cj['x0'], y0=ytop, x1=cj['x1'], y1=ybot)

        out.append(dict(year=year, source=src, number=qnum, idx=li,
                        statement=clean('\n'.join(stmt)),
                        options=dict(sorted(opts.items())),
                        correct=correct, pre=clean('\n'.join(T[pstart:li])),
                        region=dict(pg0=a['pg'], y0=a['y0'], pg1=b['pg'], y1=b['y1']),
                        stemRegion=dict(pg0=a['pg'], y0=a['y0'], pg1=fa['pg'], y1=fa['y0'] - 3),
                        optRects=opt_rects,
                        hasFigure=fig, figRects=figrects[:8], mark=mk))

    lang_idx = [i for i, q in enumerate(out) if q['mark'] and q['mark'][0] == 'lang']
    if lang_idx:
        last_val = out[lang_idx[-1]]['mark'][1]
        run = [i for i in lang_idx if out[i]['mark'][1] == last_val]
        others = [out[i]['number'] for i in lang_idx if out[i]['mark'][1] != last_val]
        cut = None
        if others:
            lo, hi = min(others), max(others)
            for i in run:
                if out[i]['number'] > hi or out[i]['number'] < lo:
                    cut = i
                    break
        if cut is None:
            for x, y in zip(run, run[1:]):
                if out[y]['number'] <= out[x]['number']:
                    cut = y
                    break
        if cut is not None:
            for i in range(cut, len(out)):
                out[i]['mark'] = None

    for q in out:
        m = q.pop('mark')
        if m and m[0] == 'lang':
            q['subject'] = 'Língua Estrangeira'
            q['lang'] = m[1]
        elif m:
            q['subject'] = m[1]
            q['lang'] = None
        else:
            q['subject'] = None
            q['lang'] = None
    return out


if __name__ == '__main__':
    allq = []
    for f in sorted(glob.glob('lines/cg_*.json')) + sorted(glob.glob('lines/gab_*.json')):
        src = os.path.basename(f)[:-5]
        y = int(src.split('_')[1])
        qs = parse(src, y)
        allq += qs
        c = collections.Counter(q['subject'] for q in qs)
        parts = ", ".join("%s=%d" % (k or 'UNLAB', v) for k, v in
                          sorted(c.items(), key=lambda x: (x[0] is not None, -x[1])))
        print("%s: %4d fig=%3d noans=%2d  %s" % (
            src, len(qs), sum(1 for q in qs if q['hasFigure']),
            sum(1 for q in qs if not q['correct']), parts))
    json.dump(allq, open('raw_objetivas.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print("TOTAL", len(allq), "fig:", sum(1 for q in allq if q['hasFigure']),
          "answered:", sum(1 for q in allq if q['correct']))
