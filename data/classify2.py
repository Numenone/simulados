# -*- coding: utf-8 -*-
"""Subject classifier + contiguous-block segmentation.

Two fixes over the first version:
  * scores are averaged per token, so a long question no longer dominates the
    segmentation just by having more words;
  * the training set also uses the 628 second-phase discursive questions, whose
    subject is known exactly from the exam filename.
"""
import re, math, unicodedata, collections

STOP = set("""a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre
entre e ou mas que se ao aos a as como qual quais quando onde seu sua seus suas
este esta estes estas esse essa esses essas aquele aquela isso isto aquilo eh e sao sser
sendo tem tem ter havia ha ha mais menos muito muita muitos muitas pode podem deve devem assinale
alternativa alternativas correta correto incorreta afirmativa afirmativas verdadeira verdadeiras falsa
seguinte seguintes considere leia texto acima abaixo respeito base qual seja somente apenas
questao questao questoes questoes numero numero figura tabela grafico grafico item itens
seguir apresenta apresentam pode ser sao foi foram esta estao entao assim cada outro outra
partir forma modo caso ainda apenas tambem porque sobre qual respectivamente indique
alternativas segundo acordo relacao ponto pontos valor valores""".split())


def toks(s):
    s = unicodedata.normalize('NFKD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return [w for w in re.findall(r'[a-z]{4,}', s) if w not in STOP]


def feats(s):
    """unigrams + adjacent bigrams"""
    t = toks(s)
    return t + ['%s_%s' % (a, b) for a, b in zip(t, t[1:])]


class NB:
    """Multinomial naive Bayes returning *average* log-probability per token."""

    def __init__(self, alpha=0.25):
        self.alpha = alpha
        self.cls = {}
        self.prior = {}
        self.V = 1

    def fit(self, docs):
        cnt = collections.defaultdict(collections.Counter)
        n = collections.Counter()
        vocab = set()
        for text, lab in docs:
            f = feats(text)
            cnt[lab].update(f)
            n[lab] += 1
            vocab |= set(f)
        self.V = len(vocab) + 1
        for lab, c in cnt.items():
            tot = sum(c.values())
            m = {w: math.log((v + self.alpha) / (tot + self.alpha * self.V)) for w, v in c.items()}
            m['__default__'] = math.log(self.alpha / (tot + self.alpha * self.V))
            self.cls[lab] = m
        N = sum(n.values())
        self.prior = {lab: math.log(v / N) for lab, v in n.items()}

    def scores(self, text):
        f = feats(text)
        k = max(1, len(f))
        out = {}
        for lab, m in self.cls.items():
            d = m['__default__']
            # average per token: independent of how long the question is
            out[lab] = (self.prior[lab] + sum(m.get(w, d) for w in f)) / k
        return out


def segment(scores_list, subjects, min_len=4, max_len=20, size_prior=9.0, prior_w=0.012):
    """Split the ordered questions into contiguous blocks, one subject each.

    DP over (index, used-subjects bitmask). A mild prior pulls block sizes
    towards `size_prior`, which is what UFPR actually uses per discipline.
    """
    n = len(scores_list)
    S = len(subjects)
    if n == 0 or S == 0 or S > 20:
        return None

    pref = [[0.0] * S for _ in range(n + 1)]
    for i in range(n):
        for j, s in enumerate(subjects):
            pref[i + 1][j] = pref[i][j] + scores_list[i].get(s, -50.0)

    NEG = float('-inf')
    best = {(0, 0): 0.0}
    back = {}
    for i in range(n + 1):
        for mask in range(1 << S):
            v = best.get((i, mask))
            if v is None:
                continue
            if i == n:
                continue
            for j in range(S):
                if mask >> j & 1:
                    continue
                for L in range(min_len, max_len + 1):
                    k = i + L
                    if k > n:
                        break
                    penalty = prior_w * abs(L - size_prior)
                    sc = v + (pref[k][j] - pref[i][j]) - penalty
                    key = (k, mask | 1 << j)
                    if best.get(key, NEG) < sc:
                        best[key] = sc
                        back[key] = (i, mask, j, L)

    cand = [(v, m) for (i, m), v in best.items() if i == n]
    if not cand:
        return None
    cand.sort(key=lambda x: -x[0])
    key = (n, cand[0][1])
    labels = [None] * n
    while key in back:
        i, mask, j, L = back[key]
        for p in range(i, i + L):
            labels[p] = subjects[j]
        key = (i, mask)
    return labels
