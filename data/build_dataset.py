# -*- coding: utf-8 -*-
import json, re, os, glob, math, collections, hashlib
from classify2 import NB, segment, toks
from literatura import split_literatura

LE = 'Língua Estrangeira'
ALLSUB = ['Português', 'Literatura', 'Matemática', 'Física', 'Química', 'Biologia',
          'História', 'Geografia', 'Filosofia', 'Sociologia']

Q = json.load(open('raw_objetivas.json', encoding='utf-8'))
for q in Q:
    q['id'] = '%s-%d' % (q['source'], q['idx'])


def body(q):
    return q['statement'] + ' ' + ' '.join(q['options'].values())


# ---------- 1. subject classification for unlabeled years ----------
labeled = [q for q in Q if q['subject'] and q['subject'] != LE]
SUBMAP = {'biologia': 'Biologia', 'filosofia': 'Filosofia', 'fisica': 'Física',
          'geografia': 'Geografia', 'historia': 'História', 'matematica': 'Matemática',
          'quimica': 'Química', 'sociologia': 'Sociologia'}
extra = []
for f in glob.glob('txt/d2_*.txt'):
    b = os.path.basename(f)
    for k, v in SUBMAP.items():
        if re.search(r'_%s(\.|_)' % k, b) and '_e_' not in b:
            extra.append((open(f, encoding='utf-8').read(), v))
            break
# every 2nd-phase discursive question is a labelled example: the exam it came
# from is single-subject, so this is ground truth, not a guess
if os.path.exists('discursivas.json'):
    for d in json.load(open('discursivas.json', encoding='utf-8')):
        if d['subject'] in ALLSUB and len(d['text']) > 120:
            extra.append((d['text'], d['subject']))
print("training: %d labelled questions + %d extra docs" % (len(labeled), len(extra)))

nb = NB()
nb.fit([(body(q), q['subject']) for q in labeled] + extra)
for q in Q:
    q['subjectSource'] = 'oficial' if q['subject'] else 'auto'

bysrc = collections.defaultdict(list)
for q in Q:
    if not q['subject']:
        bysrc[q['source']].append(q)
for src, qs in bysrc.items():
    qs.sort(key=lambda q: q['idx'])
    sc = [nb.scores(body(q)) for q in qs]
    seg_subjects = [x for x in ALLSUB if x != 'Literatura']
    lab = segment(sc, seg_subjects, min_len=4, max_len=20)
    if lab is None:
        for q in qs:
            sc_q = {k: v for k, v in nb.scores(body(q)).items() if k != 'Literatura'}
            q['subject'] = max(sc_q.items(), key=lambda x: x[1])[0]
    else:
        for q, l in zip(qs, lab):
            q['subject'] = l
    print("  %s -> %s" % (src, dict(collections.Counter(q['subject'] for q in qs))))

# Literatura. Most UFPR booklets print it folded into "LÍNGUA PORTUGUESA";
# only 2024 gave it its own header, and the 2026 format lists it as a separate
# discipline with 5 questions. So we always derive the boundary from the
# Português run — deciding *where the block starts*, never question by question,
# which is what used to produce an alternating Português/Literatura mess.
# Questions moved this way are marked "auto" so the UI can flag them.
allsrc = collections.defaultdict(list)
for q in Q:
    allsrc[q['source']].append(q)
for src, qs in allsrc.items():
    ordered = sorted(qs, key=lambda q: q['idx'])
    run = [i for i, q in enumerate(ordered) if q['subject'] == 'Português']
    if not run:
        continue
    a, b = run[0], run[-1] + 1
    if b - a != len(run):
        continue
    pt = ordered[a:b]
    r = split_literatura(pt)
    if r:
        for q in pt[r[0]:r[1]]:
            q['subject'] = 'Literatura'
            q['subjectSource'] = 'auto'
        print("  %s -> Literatura: %d de %d questões de Português"
              % (src, r[1] - r[0], len(pt)))

# ---------- 2. shared contexts ----------
RANGE_RE = re.compile(r'quest[õo]es\s*(?:de\s*)?(?:n[ºo°]?\s*)?(\d{1,2})\s*(?:a|e|à|até|-|/)\s*(\d{1,2})', re.I)
RANGE_FL = re.compile(r'(?:pytania|preguntas|questions|domande|fragen)\s*(?:od\s*)?(\d{1,2})\s*(?:do|a|to|e|à|-)\s*(\d{1,2})', re.I)


def strip_noise(t):
    out = []
    for l in t.split('\n'):
        s = l.strip()
        if not s:
            out.append('')
            continue
        if re.fullmatch(r'\d{1,3}(/\d{1,3})?', s):
            continue
        if re.fullmatch(r'[A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{4,20}', s):
            continue
        out.append(s)
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(out)).strip()


Q.sort(key=lambda q: (q['source'], q['idx']))
docs = collections.defaultdict(list)
for q in Q:
    docs[q['source']].append(q)

contexts = {}
for src, qs in docs.items():
    for i, q in enumerate(qs):
        q.setdefault('contextId', None)
    for i, q in enumerate(qs):
        pre = q.get('pre') or ''
        m = RANGE_RE.search(pre) or RANGE_FL.search(pre)
        span = 1
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            if 1 <= a <= b <= 99 and b - a <= 9:
                span = b - a + 1
        cp = strip_noise(pre)
        if len(cp) < 200 and span == 1:
            continue
        if len(cp) < 60:
            continue
        cid = hashlib.md5((src + str(q['idx'])).encode()).hexdigest()[:10]
        # No explicit "questões X a Y"? For foreign-language blocks the text is
        # shared by every following question until the next text appears, so
        # extend it there (elsewhere we stay conservative and attach to one).
        if span == 1 and q['subject'] == LE:
            j = i + 1
            while (j < len(qs) and len(strip_noise(qs[j].get('pre') or '')) < 60
                   and qs[j]['subject'] == LE and qs[j].get('lang') == q.get('lang')
                   and qs[j]['number'] == qs[j - 1]['number'] + 1 and j - i < 9):
                j += 1
            span = j - i
        contexts[cid] = {'id': cid, 'text': cp, 'year': q['year'], 'source': src,
                         'shared': span > 1}
        for j in range(i, min(i + span, len(qs))):
            if qs[j]['contextId'] is None:
                qs[j]['contextId'] = cid

# ---------- 3. estimated difficulty (heuristic, NOT official statistics) ----------
def difficulty(q):
    s = q['statement']
    opts = ' '.join(q['options'].values())
    v = 0.0
    v += min(len(s), 1800) / 1800 * 2.2
    v += min(len(opts), 1200) / 1200 * 1.0
    v += 1.4 if re.search(r'afirmativas?|assertivas?|itens', s, re.I) else 0
    v += 0.9 if re.search(r'^\s*[1-5]\.\s|\bI{2,3}\b', s, re.M) else 0
    v += 1.1 if len(re.findall(r'\d', s + opts)) > 25 else 0
    v += 0.8 if re.search(r'calcul|determine|obtenha|valor de|equaç|fórmula|assinale a alternativa que corresponde', s, re.I) else 0
    v += 0.6 if q.get('contextId') else 0
    v += 0.7 if re.search(r'somente as afirmativas', opts, re.I) else 0
    v += 0.5 if q['needsImage'] else 0
    return v


vals = sorted(difficulty(q) for q in Q)
t1, t2 = vals[len(vals) // 3], vals[2 * len(vals) // 3]
for q in Q:
    d = difficulty(q)
    q['difficultyScore'] = round(d, 2)
    q['difficulty'] = 'facil' if d <= t1 else ('media' if d <= t2 else 'dificil')

# ---------- 4. tf-idf similarity ----------
corpus = []
for q in Q:
    ctx = contexts.get(q.get('contextId'), {}).get('text', '')[:700]
    corpus.append(toks(body(q) + ' ' + ctx))
df = collections.Counter()
for t in corpus:
    df.update(set(t))
N = len(corpus)
idf = {w: math.log(N / (1 + d)) for w, d in df.items() if 2 <= d <= N * 0.35}
vecs = []
for t in corpus:
    c = collections.Counter(w for w in t if w in idf)
    v = {w: (1 + math.log(f)) * idf[w] for w, f in c.items()}
    nrm = math.sqrt(sum(x * x for x in v.values())) or 1.0
    vecs.append({w: x / nrm for w, x in v.items()})
inv = collections.defaultdict(list)
tops = []
for i, v in enumerate(vecs):
    tp = sorted(v.items(), key=lambda kv: -kv[1])[:45]
    tops.append(tp)
    for w, x in tp:
        inv[w].append((i, x))
for i, q in enumerate(Q):
    sims = collections.defaultdict(float)
    for w, x in tops[i]:
        for j, y in inv[w]:
            if j != i:
                sims[j] += x * y
    # A "similar question" is only useful if it is actually about the same thing.
    # Same-subject matches pass at a normal threshold; cross-subject ones have to
    # be clearly strong, otherwise we would suggest a biology item next to a
    # geometry item just because both mention numbers.
    cand = []
    for j, sc in sims.items():
        same = Q[j]['subject'] == q['subject']
        if sc < (0.11 if same else 0.30):
            continue
        cand.append((0 if same else 1, -sc, j, sc))
    cand.sort()
    q['similar'] = [{'id': Q[j]['id'], 's': round(sc, 3)} for _, _, j, sc in cand[:6]]

# ---------- 5. emit ----------
for q in Q:
    for k in ('pre', 'idx', 'region', 'stemRegion', 'optRects', 'figRects', 'hasFigure'):
        q.pop(k, None)

out = {
    'meta': {
        'generated': 'UFPR vestibular corpus',
        'years': sorted({q['year'] for q in Q}),
        'difficultyNote': 'Dificuldade é uma estimativa heurística (estrutura, tamanho, '
                          'carga numérica, dependência de texto/figura). A UFPR não publica '
                          'índice de acerto por questão.',
        'subjectNote': 'subjectSource="oficial" vem do cabeçalho do caderno; "auto" foi '
                       'classificado automaticamente (provas antigas não trazem divisão por matéria).',
    },
    'contexts': contexts,
    'questions': Q,
}
json.dump(out, open('questions.json', 'w', encoding='utf-8'), ensure_ascii=False)

print("\nquestions:", len(Q), " contexts:", len(contexts))
print("by subject:", dict(collections.Counter(q['subject'] for q in Q).most_common()))
print("by difficulty:", dict(collections.Counter(q['difficulty'] for q in Q)))
print("by year:", dict(sorted(collections.Counter(q['year'] for q in Q).items())))
print("with context:", sum(1 for q in Q if q['contextId']),
      " with image:", sum(1 for q in Q if q['needsImage']),
      " with similars:", sum(1 for q in Q if q['similar']))
print("size MB:", round(os.path.getsize('questions.json') / 1e6, 2))
