# -*- coding: utf-8 -*-
"""Audit subject labels: find questions whose content clearly contradicts the label."""
import json, re, collections, unicodedata

D = json.load(open('questions.json', encoding='utf-8'))
Q = D['questions']
CTX = D['contexts']

# --- crude but effective language ID from function words
LANG_WORDS = {
    'pt': set('de que para com uma não como mais sobre pelo pela ser está são foi seu sua entre quando '
              'ele ela isso esse essa pelos das dos aos nas nos até então porque também muito já'.split()),
    'en': set('the of and to in that is was for with are as it by be this from at which have has not '
              'they their you would there were been their its who'.split()),
    'es': set('el la los las de que para con una no como más sobre por ser está son fue su entre cuando '
              'pero también porque muy ya donde hacia'.split()),
    'fr': set('le la les des que pour avec une ne pas comme plus sur par être est sont dans son ses '
              'qui mais aussi parce très où vers cette'.split()),
    'it': set('il lo la gli le di che per con una non come più su per essere sono nel suo nei ma anche '
              'perché molto già dove verso questa'.split()),
    'de': set('der die das den dem des und zu in ist sind nicht als auch für mit auf eine einen von '
              'wird werden sich aber oder wenn durch'.split()),
    'pl': set('i w na z do nie że to się jest są jak ale oraz przez dla od po za tym który która które '
              'bardzo tylko może'.split()),
}


def words(s):
    s = unicodedata.normalize('NFKD', s.lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.findall(r"[a-z']+", s)


def lang_of(text):
    w = words(text)
    if len(w) < 12:
        return None, 0.0
    cnt = {k: sum(1 for x in w if x in v) for k, v in LANG_WORDS.items()}
    tot = sum(cnt.values())
    if tot < 5:
        # CJK / cyrillic?
        if re.search(r'[぀-ヿ一-鿿]', text):
            return 'ja', 1.0
        return None, 0.0
    best = max(cnt, key=cnt.get)
    return best, cnt[best] / tot


def full_text(q):
    t = q['statement'] + ' ' + ' '.join(q['options'].values())
    if q.get('contextId') and q['contextId'] in CTX:
        t = CTX[q['contextId']]['text'][:1200] + ' ' + t
    return t


problems = collections.Counter()
examples = collections.defaultdict(list)

for q in Q:
    txt = full_text(q)
    lg, conf = lang_of(txt)
    is_le = q['subject'] == 'Língua Estrangeira'

    # 1. foreign-language text not labelled LE
    if not is_le and lg and lg not in ('pt',) and conf > 0.55:
        problems['foreign text, not LE'] += 1
        examples['foreign text, not LE'].append((q, f"lang={lg} conf={conf:.2f}"))

    # 2. LE labelled but clearly Portuguese
    if is_le and lg == 'pt' and conf > 0.75:
        problems['LE but portuguese'] += 1
        examples['LE but portuguese'].append((q, f"conf={conf:.2f}"))

print("=== contradictions found")
for k, v in problems.most_common():
    print(f"  {k}: {v}")
for k, lst in examples.items():
    print(f"\n--- {k} (showing 6 of {len(lst)})")
    for q, why in lst[:6]:
        print(f"  [{q['source']} q{q['number']}] {q['subject']}/{q.get('lang')} ({q['subjectSource']}) {why}")
        print(f"      {q['statement'][:110]}")

print("\n=== subject distribution by source")
bysrc = collections.defaultdict(collections.Counter)
for q in Q:
    bysrc[q['source']][q['subject']] += 1
for src in sorted(bysrc):
    src_auto = any(x['subjectSource'] == 'auto' for x in Q if x['source'] == src)
    print(f"  {src} ({'auto' if src_auto else 'oficial'}): "
          + ", ".join(f"{k}={v}" for k, v in sorted(bysrc[src].items())))
