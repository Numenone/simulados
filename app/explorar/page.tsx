"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LoadingPanel from "@/components/LoadingPanel";
import { DIFF_LABEL, SUBJECT_COLOR, loadDataset, subjectSort } from "@/lib/data";
import type { Dataset } from "@/lib/types";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function Page() {
  const [data, setData] = useState<Dataset | null>(null);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [limit, setLimit] = useState(40);

  useEffect(() => {
    loadDataset().then(setData);
  }, []);

  const subjects = useMemo(
    () => (data ? [...new Set(data.questions.map((x) => x.subject))].sort(subjectSort) : []),
    [data]
  );
  const allYears = useMemo(
    () => (data ? [...new Set(data.questions.map((x) => x.year))].sort((a, b) => b - a) : []),
    [data]
  );

  const results = useMemo(() => {
    if (!data) return [];
    const needle = norm(q.trim());
    const terms = needle.split(/\s+/).filter(Boolean);
    return data.questions.filter((x) => {
      if (subject.length && !subject.includes(x.subject)) return false;
      if (years.length && !years.includes(x.year)) return false;
      if (!terms.length) return true;
      const hay = norm(
        x.statement +
          " " +
          Object.values(x.options).join(" ") +
          " " +
          (x.contextId ? data.contexts[x.contextId]?.text.slice(0, 900) ?? "" : "")
      );
      return terms.every((t) => hay.includes(t));
    });
  }, [data, q, subject, years]);

  useEffect(() => setLimit(40), [q, subject, years]);

  function toggle<T>(list: T[], v: T, set: (x: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  if (!data) return <LoadingPanel label="Carregando banco de questões…" />;

  return (
    <div className="anim-stagger space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold tracking-tight">Explorar</h1>
        <p className="mt-1.5 text-sm muted">
          Busca no enunciado, nas alternativas e nos textos de apoio das 1.303 questões objetivas.
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ex.: fotossíntese, Getúlio Vargas, função quadrática, Machado de Assis…"
          className="mt-4 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none"
          style={{ background: "var(--panel-2)", borderColor: "var(--line)", color: "var(--text)" }}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subjects.map((s) => {
            const on = subject.includes(s);
            const c = SUBJECT_COLOR[s] ?? "#8aa0c0";
            return (
              <button
                key={s}
                className="chip"
                data-on={on}
                style={on ? { borderColor: c, background: `${c}22`, color: c } : undefined}
                onClick={() => toggle(subject, s, setSubject)}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {allYears.map((y) => (
            <button
              key={y}
              className="chip"
              data-on={years.includes(y)}
              onClick={() => toggle(years, y, setYears)}
            >
              {y}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm">
          <b>{results.length}</b> {results.length === 1 ? "questão encontrada" : "questões encontradas"}
        </p>
      </div>

      <div className="anim-stagger space-y-2">
        {results.slice(0, limit).map((x) => (
          <Link key={x.id} href={`/questao/${x.id}`} className="panel panel-hover block p-4">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="chip" style={{ color: SUBJECT_COLOR[x.subject] }}>
                {x.subject}
                {x.lang ? ` · ${x.lang}` : ""}
                {x.subjectSource === "auto" && "~"}
              </span>
              <span className="chip">{x.year}</span>
              <span className="chip">q{x.number}</span>
              <span className="chip">{DIFF_LABEL[x.difficulty]}</span>
              {x.contextId && <span className="chip">texto</span>}
              {x.needsImage && <span className="chip">figura</span>}
            </div>
            <p className="line-clamp-3 text-[14px]">{x.statement.slice(0, 260)}</p>
          </Link>
        ))}
      </div>

      {results.length > limit && (
        <button className="btn w-full" onClick={() => setLimit((l) => l + 60)}>
          Mostrar mais ({results.length - limit} restantes)
        </button>
      )}
    </div>
  );
}
