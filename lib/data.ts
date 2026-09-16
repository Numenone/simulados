"use client";

import type { Dataset, Discursiva, Question, Redacao, RunConfig } from "./types";

let cache: Dataset | null = null;
let cachePromise: Promise<Dataset> | null = null;

export async function loadDataset(): Promise<Dataset> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetch("/data/questions.json")
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao carregar o banco de questões");
        return r.json();
      })
      .then((d: Dataset) => {
        cache = d;
        return d;
      });
  }
  return cachePromise;
}

let dCache: Discursiva[] | null = null;
export async function loadDiscursivas(): Promise<Discursiva[]> {
  if (dCache) return dCache;
  const r = await fetch("/data/discursivas.json");
  dCache = await r.json();
  return dCache!;
}

let rCache: Redacao[] | null = null;
export async function loadRedacoes(): Promise<Redacao[]> {
  if (rCache) return rCache;
  const r = await fetch("/data/redacoes.json");
  rCache = await r.json();
  return rCache!;
}

export const SUBJECT_ORDER = [
  "Português",
  "Literatura",
  "Língua Estrangeira",
  "Matemática",
  "Física",
  "Química",
  "Biologia",
  "História",
  "Geografia",
  "Filosofia",
  "Sociologia",
];

/** Official weighting of the single-phase exam from 2026 onwards (80 questions). */
export const NEW_FORMAT_BLUEPRINT: Record<string, number> = {
  Português: 10,
  Literatura: 5,
  "Língua Estrangeira": 7,
  Matemática: 8,
  Física: 8,
  Química: 8,
  Biologia: 8,
  História: 8,
  Geografia: 8,
  Filosofia: 5,
  Sociologia: 5,
};

export const SUBJECT_COLOR: Record<string, string> = {
  Português: "#6ea8ff",
  Literatura: "#a78bfa",
  "Língua Estrangeira": "#22d3ee",
  Matemática: "#f59e0b",
  Física: "#fb7185",
  Química: "#34d399",
  Biologia: "#4ade80",
  História: "#e879a9",
  Geografia: "#38bdf8",
  Filosofia: "#c084fc",
  Sociologia: "#facc15",
};

export const DIFF_LABEL: Record<string, string> = {
  facil: "Fácil",
  media: "Média",
  dificil: "Difícil",
};

export function subjectSort(a: string, b: string) {
  const ia = SUBJECT_ORDER.indexOf(a);
  const ib = SUBJECT_ORDER.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], seed = Date.now()): T[] {
  const rnd = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function applyFilters(
  questions: Question[],
  cfg: Pick<
    RunConfig,
    | "subjects"
    | "difficulties"
    | "years"
    | "langs"
    | "onlyWithContext"
    | "onlyUnseen"
    | "excludeCorrect"
    | "onlyErrors"
  >,
  seen: Set<string>,
  errors: Set<string>
): Question[] {
  return questions.filter((q) => {
    if (!q.correct) return false;
    if (cfg.subjects.length && !cfg.subjects.includes(q.subject)) return false;
    if (cfg.difficulties.length && !cfg.difficulties.includes(q.difficulty)) return false;
    if (cfg.years.length && !cfg.years.includes(q.year)) return false;
    if (q.subject === "Língua Estrangeira" && cfg.langs.length && q.lang && !cfg.langs.includes(q.lang))
      return false;
    if (cfg.onlyWithContext && !q.contextId) return false;
    if (cfg.onlyUnseen && seen.has(q.id)) return false;
    if (cfg.excludeCorrect && seen.has(q.id) && !errors.has(q.id)) return false;
    if (cfg.onlyErrors && !errors.has(q.id)) return false;
    return true;
  });
}

/**
 * Build a run. In "simulado" mode the subject mix follows the official
 * 2026 blueprint (80 questions) scaled to the requested size, so a mock exam
 * looks like the real thing instead of a random pile.
 */
export function buildRun(
  pool: Question[],
  count: number,
  useBlueprint: boolean,
  seed = Date.now()
): Question[] {
  if (!useBlueprint) return shuffle(pool, seed).slice(0, count);

  const bySubject = new Map<string, Question[]>();
  for (const q of pool) {
    const list = bySubject.get(q.subject) ?? [];
    list.push(q);
    bySubject.set(q.subject, list);
  }
  const present = [...bySubject.keys()];
  const totalWeight = present.reduce((s, k) => s + (NEW_FORMAT_BLUEPRINT[k] ?? 1), 0);
  if (!totalWeight) return shuffle(pool, seed).slice(0, count);

  const picked: Question[] = [];
  const leftovers: Question[] = [];
  present.forEach((subj, i) => {
    const w = NEW_FORMAT_BLUEPRINT[subj] ?? 1;
    const want = Math.round((w / totalWeight) * count);
    const list = shuffle(bySubject.get(subj)!, seed + i * 7919);
    picked.push(...list.slice(0, want));
    leftovers.push(...list.slice(want));
  });

  const extra = shuffle(leftovers, seed + 13);
  let i = 0;
  while (picked.length < count && i < extra.length) picked.push(extra[i++]);
  return shuffle(picked, seed + 29).slice(0, count);
}

export function optionOrder(q: Question, shuffleOpts: boolean, seed: number): string[] {
  const keys = Object.keys(q.options).sort();
  if (!shuffleOpts || q.graphicalOptions) return keys;
  return shuffle(keys, seed);
}
