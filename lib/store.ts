"use client";

import { useCallback, useEffect, useState } from "react";
import type { Attempt, RunConfig } from "./types";

const KEY_ATTEMPTS = "ufpr.attempts.v1";
const KEY_CONFIG = "ufpr.config.v1";
const KEY_NOTES = "ufpr.answers.v1";
const KEY_FLAGS = "ufpr.flags.v1";

export const DEFAULT_CONFIG: RunConfig = {
  subjects: [],
  difficulties: [],
  years: [],
  langs: ["Inglês"],
  onlyWithContext: false,
  onlyUnseen: false,
  excludeCorrect: false,
  onlyErrors: false,
  count: 20,
  mode: "treino",
  autoAdvance: true,
  advanceDelay: 900,
  instantFeedback: true,
  shuffleOptions: false,
  timed: false,
  minutes: 90,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function loadAttempts(): Attempt[] {
  return readArray<Attempt>(KEY_ATTEMPTS);
}

export function saveAttempts(list: Attempt[]) {
  try {
    window.localStorage.setItem(KEY_ATTEMPTS, JSON.stringify(list.slice(-4000)));
  } catch {
    /* storage full — non-fatal */
  }
}

export function pushAttempts(items: Attempt[]) {
  if (!items.length) return;
  saveAttempts([...loadAttempts(), ...items]);
}

export function clearAttempts() {
  try {
    window.localStorage.removeItem(KEY_ATTEMPTS);
  } catch {
    /* ignore */
  }
}

/** Question ids seen at least once, and ids whose most recent answer was wrong. */
export function deriveHistory(attempts: Attempt[]) {
  const seen = new Set<string>();
  const last = new Map<string, boolean>();
  for (const a of attempts) {
    seen.add(a.qid);
    last.set(a.qid, a.correct);
  }
  const errors = new Set<string>();
  last.forEach((ok, id) => {
    if (!ok) errors.add(id);
  });
  return { seen, errors };
}

export function useConfig(): [RunConfig, (patch: Partial<RunConfig>) => void, () => void] {
  const [cfg, setCfg] = useState<RunConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setCfg(read<RunConfig>(KEY_CONFIG, DEFAULT_CONFIG));
  }, []);

  const update = useCallback((patch: Partial<RunConfig>) => {
    setCfg((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(KEY_CONFIG, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCfg(DEFAULT_CONFIG);
    try {
      window.localStorage.setItem(KEY_CONFIG, JSON.stringify(DEFAULT_CONFIG));
    } catch {
      /* ignore */
    }
  }, []);

  return [cfg, update, reset];
}

/** Free-text answers for discursive questions and redações. */
export function loadNotes(): Record<string, string> {
  return read<Record<string, string>>(KEY_NOTES, {});
}

export function saveNote(id: string, text: string) {
  const all = loadNotes();
  if (text.trim()) all[id] = text;
  else delete all[id];
  try {
    window.localStorage.setItem(KEY_NOTES, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function loadFlags(): Record<string, boolean> {
  return read<Record<string, boolean>>(KEY_FLAGS, {});
}

export function toggleFlag(id: string): boolean {
  const all = loadFlags();
  const next = !all[id];
  if (next) all[id] = true;
  else delete all[id];
  try {
    window.localStorage.setItem(KEY_FLAGS, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return next;
}

export function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
