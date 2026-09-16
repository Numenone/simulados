# -*- coding: utf-8 -*-
"""Leave-one-year-out evaluation of the subject classifier + segmentation,
measured on the four years whose exam booklets carry official subject headers."""
import json, re, os, glob, collections
from classify2 import NB, segment
from literatura import split_literatura

LE = 'Língua Estrangeira'
ALLSUB = ['Português', 'Literatura', 'Matemática', 'Física', 'Química', 'Biologia',
          'História', 'Geografia', 'Filosofia', 'Sociologia']

Q = json.load(open('raw_objetivas.json', encoding='utf-8'))
labeled = [q for q in Q if q['subject'] and q['subject'] != LE]


def body(q):
    return q['statement'] + ' ' + ' '.join(q['options'].values())


# extra training data: 628 discursive questions with a known subject
extra = []
if os.path.exists('discursivas.json'):
    for d in json.load(open('discursivas.json', encoding='utf-8')):
        if d['subject'] in ALLSUB and len(d['text']) > 120:
            extra.append((d['text'], d['subject']))

# and whole second-phase papers
SUBMAP = {'biologia': 'Biologia', 'filosofia': 'Filosofia', 'fisica': 'Física',
          'geografia': 'Geografia', 'historia': 'História', 'matematica': 'Matemática',
          'quimica': 'Química', 'sociologia': 'Sociologia'}
for f in glob.glob('txt/d2_*.txt'):
    b = os.path.basename(f)
    for k, v in SUBMAP.items():
        if re.search(r'_%s(\.|_)' % k, b) and '_e_' not in b:
            extra.append((open(f, encoding='utf-8').read(), v))
            break

print("labeled questions:", len(labeled), " extra docs:", len(extra))
print("extra by subject:", dict(collections.Counter(v for _, v in extra)))

years = sorted({q['year'] for q in labeled})
tot_raw = tot_seg = tot_n = 0
for yr in years:
    tr = [q for q in labeled if q['year'] != yr]
    te = sorted([q for q in labeled if q['year'] == yr], key=lambda q: q['idx'])
    m = NB()
    m.fit([(body(q), q['subject']) for q in tr] + extra)

    sc = [m.scores(body(q)) for q in te]
    raw_ok = sum(1 for s, q in zip(sc, te) if max(s, key=s.get) == q['subject'])

    # mirror the production pipeline: Literatura is derived from the Português
    # block afterwards, so the segmenter must not spend a block on it
    present = [s for s in ALLSUB if s != 'Literatura' and any(q['subject'] == s for q in te)]
    lab = segment(sc, present, min_len=4, max_len=20)
    if lab:
        idx = [i for i, l in enumerate(lab) if l == 'Português']
        if idx and idx[-1] - idx[0] + 1 == len(idx):
            a, b = idx[0], idx[-1] + 1
            r = split_literatura(te[a:b])
            if r:
                for k in range(a + r[0], a + r[1]):
                    lab[k] = 'Literatura'
    seg_ok = sum(1 for a, q in zip(lab, te) if a == q['subject']) if lab else 0

    tot_raw += raw_ok
    tot_seg += seg_ok
    tot_n += len(te)
    print(f"  {yr}: raw {raw_ok}/{len(te)} ({raw_ok/len(te):.0%})   "
          f"segmented {seg_ok}/{len(te)} ({seg_ok/len(te):.0%})")
    if lab:
        for a, q in zip(lab, te):
            if a != q['subject']:
                print(f"      q{q['number']:3} true={q['subject']:12} pred={a:12} "
                      f"{q['statement'][:64]!r}")

print(f"\nTOTAL raw {tot_raw}/{tot_n} ({tot_raw/tot_n:.1%})   "
      f"segmented {tot_seg}/{tot_n} ({tot_seg/tot_n:.1%})")
