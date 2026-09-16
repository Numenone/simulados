# -*- coding: utf-8 -*-
"""Split an auto-labelled 'Português' block into Português + Literatura.

UFPR prints these as two consecutive blocks, so the decision is *where the
boundary is*, not question-by-question — deciding per question produced an
alternating Português/Literatura mess.
"""
import re

WORK = re.compile(
    r'\b(romance|novela|poema|poesia|soneto|conto|crônica|peça teatral|obra teatral|'
    r'narrador|eu[- ]l[íi]rico|verso|versos|estrofe|estrofes|rima|'
    r'literatura|liter[áa]ri[ao]s?|personagens?|protagonista|enredo|'
    r'modernis(mo|ta)|romantis(mo|ta)|realis(mo|ta)|parnasian|simbolis(mo|ta)|'
    r'barroc[ao]|arcadis(mo|ta)|naturalis(mo|ta)|trovadoris(mo|ta)|vanguard)\b', re.I)

# "de Machado de Assis", "de Carolina Maria de Jesus", ...
BY_AUTHOR = re.compile(r'\bde\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ÿ]+(?:\s+(?:de|da|do|dos|das)?\s*'
                       r'[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ÿ]+){1,3}\b')
TITLE_ITAL = re.compile(r'[“"][^”"]{3,60}[”"]')

# language-analysis vocabulary: evidence *against* Literatura
LANG = re.compile(
    r'\b(ortografia|acentua|crase|concord[âa]ncia|reg[êe]ncia|pontua|v[íi]rgula|'
    r'sujeito|predicado|or[aç][ãa]o|conjun[çc][ãa]o|pronome|verbal|nominal|'
    r'coes[ãa]o|coer[êe]ncia|par[áa]grafo|linha[s]?\s+\d|refer[êe]ncia do termo|'
    r'sin[ôo]nimo|ant[ôo]nimo|morfolog|sint[áa]tic|sem[âa]ntic|conectivo|'
    r'g[êe]nero textual|tipo textual|argumenta[çc][ãa]o do autor|tese)\b', re.I)


def lit_score(q):
    t = q['statement'] + ' ' + ' '.join(q['options'].values())
    s = 0.0
    s += 1.0 * len(WORK.findall(t))
    s += 0.6 * min(2, len(BY_AUTHOR.findall(q['statement'])))
    s += 0.35 * min(2, len(TITLE_ITAL.findall(q['statement'])))
    s -= 1.1 * len(LANG.findall(t))
    return s


def split_literatura(block, min_len=3, max_len=9, theta=0.3, min_total=3.0):
    """block: ordered questions currently labelled Português.

    Returns (start, end) of the contiguous Literatura run, or None.
    Maximum-subarray over (lit_score - theta): a question only extends the run
    if it carries literature signal, so the run grows to the real block instead
    of collapsing onto the two or three strongest items.
    """
    n = len(block)
    if n < min_len + 2:
        return None
    sc = [lit_score(q) - theta for q in block]

    best = None
    for i in range(n):
        run = 0.0
        for j in range(i, min(n, i + max_len)):
            run += sc[j]
            L = j - i + 1
            if L < min_len:
                continue
            if best is None or run > best[0]:
                best = (run, i, j + 1)

    if not best or best[0] < min_total:
        return None
    return best[1], best[2]
