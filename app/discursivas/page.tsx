"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingPanel from "@/components/LoadingPanel";
import { loadDiscursivas, shuffle, subjectSort, SUBJECT_COLOR } from "@/lib/data";
import { loadNotes, saveNote } from "@/lib/store";
import type { Discursiva } from "@/lib/types";

export default function Page() {
  const [items, setItems] = useState<Discursiva[] | null>(null);
  const [subject, setSubject] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [i, setI] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    loadDiscursivas().then((d) => setItems(d));
    setNotes(loadNotes());
  }, []);

  const subjects = useMemo(
    () => (items ? [...new Set(items.map((d) => d.subject))].sort(subjectSort) : []),
    [items]
  );
  const allYears = useMemo(
    () => (items ? [...new Set(items.map((d) => d.year))].sort((a, b) => b - a) : []),
    [items]
  );

  const pool = useMemo(() => {
    if (!items) return [];
    return items.filter(
      (d) =>
        (!subject.length || subject.includes(d.subject)) && (!years.length || years.includes(d.year))
    );
  }, [items, subject, years]);

  useEffect(() => {
    setOrder(shuffle(pool.map((p) => p.id)));
    setI(0);
  }, [pool]);

  const current = useMemo(() => pool.find((p) => p.id === order[i]) ?? pool[i], [pool, order, i]);

  function toggle<T>(list: T[], v: T, set: (x: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  if (!items)
    return <LoadingPanel label="Carregando questões discursivas…" />;

  const answer = current ? notes[current.id] ?? "" : "";

  return (
    <div className="anim-stagger space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold tracking-tight">Discursivas</h1>
        <p className="mt-1.5 text-sm muted">
          Questões abertas das provas específicas de 2.ª fase (2014–2017 e 2023–2026). A UFPR não
          publica gabarito dessas provas, então aqui você escreve a resposta e compara com o
          enunciado original — o rascunho fica salvo no seu navegador.
        </p>
      </div>

      <div className="panel space-y-4 p-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Matéria</span>
            <button className="text-xs muted hover:underline" onClick={() => setSubject([])}>
              todas
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Ano</span>
            <button className="text-xs muted hover:underline" onClick={() => setYears([])}>
              todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
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
        </div>
        <p className="text-sm">
          <b>{pool.length}</b> questões nessa seleção.
        </p>
      </div>

      {current ? (
        <>
          <div className="panel anim-slide p-4 sm:p-5" key={current.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <span className="chip" style={{ color: SUBJECT_COLOR[current.subject] }}>
                  {current.subject}
                </span>
                <span className="chip">UFPR {current.year}</span>
                <span className="chip">questão {current.number}</span>
                {current.points != null && <span className="chip">{current.points} pontos</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="muted text-xs">
                  {i + 1} / {pool.length}
                </span>
                <button className="chip" onClick={() => setShowText((s) => !s)}>
                  {showText ? "ver original" : "ver como texto"}
                </button>
              </div>
            </div>

            {showText ? (
              <p className="prose-q text-[15px]">{current.text}</p>
            ) : (
              <div className="space-y-2">
                {current.images.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={`/d/${src}`}
                    alt={`Questão ${current.number} de ${current.subject}, UFPR ${current.year}`}
                    className="w-full rounded-[10px] bg-white transition duration-200 hover:brightness-105"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="panel p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Sua resposta</span>
              <span className="text-xs muted">
                {answer.trim() ? `${answer.trim().split(/\s+/).length} palavras` : "rascunho salvo automaticamente"}
              </span>
            </div>
            <textarea
              value={answer}
              onChange={(e) => {
                const v = e.target.value;
                setNotes((n) => ({ ...n, [current.id]: v }));
                saveNote(current.id, v);
              }}
              rows={8}
              placeholder="Escreva aqui como se fosse na folha de versão definitiva…"
              className="w-full resize-y rounded-lg border p-3 text-sm outline-none"
              style={{ background: "var(--panel-2)", borderColor: "var(--line)", color: "var(--text)" }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button className="btn" disabled={i === 0} onClick={() => setI((n) => n - 1)}>
              ← Anterior
            </button>
            <button className="btn" onClick={() => setOrder(shuffle(pool.map((p) => p.id)))}>
              Embaralhar
            </button>
            <button
              className="btn btn-primary"
              disabled={i + 1 >= pool.length}
              onClick={() => setI((n) => n + 1)}
            >
              Próxima →
            </button>
          </div>
        </>
      ) : (
        <div className="panel p-6 text-center muted">Nenhuma questão nessa seleção.</div>
      )}
    </div>
  );
}
