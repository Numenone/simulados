"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QuestionCard, { QuestionMeta } from "./QuestionCard";
import Calculator, { CalcToggle, CALC_SUBJECTS } from "./Calculator";
import { DIFF_LABEL, SUBJECT_COLOR, optionOrder, subjectSort } from "@/lib/data";
import { pushAttempts, toggleFlag, loadFlags } from "@/lib/store";
import type { Dataset, Question, RunConfig } from "@/lib/types";

interface Props {
  data: Dataset;
  queue: Question[];
  cfg: RunConfig;
  onExit: () => void;
}

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Animated integer, used for the score reveal. */
function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export default function Runner({ data, queue, cfg, onExit }: Props) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [calcOpen, setCalcOpen] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const qStart = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seed = useRef(Math.floor(Math.random() * 1e9));

  useEffect(() => setFlags(loadFlags()), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    qStart.current = Date.now();
  }, [i]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const q = queue[i];
  const total = queue.length;
  const answeredCount = Object.keys(answers).length;
  const isTraining = cfg.mode === "treino";
  const showFeedback = isTraining && cfg.instantFeedback;
  const calcRelevant = !!q && CALC_SUBJECTS.has(q.subject);

  const finish = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setDone(true);
  }, []);

  const goTo = useCallback(
    (n: number) => {
      if (timer.current) clearTimeout(timer.current);
      if (n >= total) finish();
      else setI(Math.max(0, n));
    },
    [total, finish]
  );

  const choose = useCallback(
    (letter: string) => {
      if (!q || answers[q.id]) return;
      const ms = Date.now() - qStart.current;
      setAnswers((a) => ({ ...a, [q.id]: letter }));
      // persisted right away: leaving mid-run must not lose what was answered
      pushAttempts([
        {
          qid: q.id,
          chosen: letter,
          correct: letter === q.correct,
          at: Date.now(),
          subject: q.subject,
          ms,
        },
      ]);
      if (showFeedback) setRevealed((r) => ({ ...r, [q.id]: true }));
      if (cfg.autoAdvance) {
        const delay = showFeedback ? cfg.advanceDelay : 140;
        timer.current = setTimeout(() => goTo(i + 1), delay);
      }
    },
    [q, answers, showFeedback, cfg.autoAdvance, cfg.advanceDelay, goTo, i]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      // "c" is the letter of an alternative, so the calculator gets its own keys
      if ((k === "k" || e.key === "=") && calcRelevant) {
        e.preventDefault();
        setCalcOpen((o) => !o);
        return;
      }
      const order = q ? optionOrder(q, cfg.shuffleOptions, seed.current + i) : [];
      const idx = ["a", "b", "c", "d", "e"].indexOf(k);
      if (idx >= 0 && idx < order.length) {
        e.preventDefault();
        choose(order[idx]);
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        goTo(i + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(i - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, i, choose, goTo, cfg.shuffleOptions, done, calcRelevant]);

  const elapsed = now - startedAt;
  const remaining = cfg.timed ? cfg.minutes * 60000 - elapsed : 0;
  useEffect(() => {
    if (cfg.timed && remaining <= 0 && !done) finish();
  }, [cfg.timed, remaining, done, finish]);

  if (done) {
    return <Result data={data} queue={queue} answers={answers} elapsed={elapsed} onExit={onExit} />;
  }
  if (!q) {
    return (
      <div className="panel anim-page p-6 text-center">
        <p>Nenhuma questão nessa seleção.</p>
        <button className="btn mt-4" onClick={onExit}>
          Voltar
        </button>
      </div>
    );
  }

  const ctx = q.contextId ? data.contexts[q.contextId] : null;
  const order = optionOrder(q, cfg.shuffleOptions, seed.current + i);
  const isRevealed = !!revealed[q.id];
  const chosen = answers[q.id] ?? null;
  const pct = Math.round((answeredCount / total) * 100);
  const lowTime = cfg.timed && remaining < 60000;

  return (
    <div className="space-y-4">
      <div className="panel sticky top-[57px] z-20 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums">
              {i + 1} <span className="muted">/ {total}</span>
            </span>
            <span className="muted text-xs">{answeredCount} respondidas</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="chip tabular-nums"
              style={lowTime ? { borderColor: "var(--bad)", color: "#ffb0b4" } : undefined}
            >
              ⏱ {fmt(cfg.timed ? remaining : elapsed)}
            </span>
            <button
              className="chip"
              data-on={!!flags[q.id]}
              onClick={() => setFlags((f) => ({ ...f, [q.id]: toggleFlag(q.id) }))}
              title="Marcar para revisar depois"
            >
              {flags[q.id] ? "★" : "☆"}
            </button>
            <button className="btn !px-3 !py-1.5" onClick={finish}>
              Encerrar
            </button>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#181d27" }}>
          <div
            className="progress-shimmer h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div key={q.id} className="anim-slide">
        <QuestionCard
          q={q}
          ctx={ctx}
          order={order}
          chosen={chosen}
          revealed={isRevealed}
          disabled={!!chosen}
          onChoose={choose}
        />
      </div>

      {isRevealed && chosen && (
        <div
          className="panel anim-pop p-4"
          style={{
            borderColor: chosen === q.correct ? "var(--ok)" : "var(--bad)",
            background:
              chosen === q.correct ? "rgba(52,201,138,.07)" : "rgba(242,88,95,.06)",
          }}
        >
          <p className="font-semibold">
            {chosen === q.correct
              ? "✓ Acertou"
              : `✗ Errou — a resposta é ${q.correct?.toUpperCase()}`}
          </p>
          <p className="mt-1 text-xs muted">
            Gabarito oficial da UFPR {q.year}. A prova não publica resolução comentada.
          </p>
          <Similar data={data} q={q} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button className="btn" onClick={() => goTo(i - 1)} disabled={i === 0}>
          ← Anterior
        </button>
        <span className="hidden text-xs muted sm:block">
          A–E responder · ← → navegar{calcRelevant && " · K calculadora"}
        </span>
        <div className="flex gap-2">
          {!isRevealed && chosen && isTraining && (
            <button className="btn" onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}>
              Ver resposta
            </button>
          )}
          <button className="btn btn-primary" onClick={() => goTo(i + 1)}>
            {i + 1 >= total ? "Finalizar" : "Próxima →"}
          </button>
        </div>
      </div>

      {calcRelevant && (
        <>
          <CalcToggle open={calcOpen} onToggle={() => setCalcOpen((o) => !o)} />
          <Calculator open={calcOpen} onClose={() => setCalcOpen(false)} />
        </>
      )}
    </div>
  );
}

function Similar({ data, q }: { data: Dataset; q: Question }) {
  const byId = useMemo(() => new Map(data.questions.map((x) => [x.id, x])), [data]);
  const sims = q.similar.map((s) => byId.get(s.id)).filter(Boolean) as Question[];
  const sameCtx = q.contextId
    ? data.questions.filter((x) => x.contextId === q.contextId && x.id !== q.id)
    : [];
  if (!sims.length && !sameCtx.length) return null;
  return (
    <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--line)" }}>
      {sameCtx.length > 0 && (
        <div>
          <span className="label">Mesmas questões deste texto</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sameCtx.map((s) => (
              <Link key={s.id} href={`/questao/${s.id}`} className="chip">
                {s.year} · q{s.number}
              </Link>
            ))}
          </div>
        </div>
      )}
      {sims.length > 0 && (
        <div>
          <span className="label">Questões parecidas</span>
          <div className="mt-1 space-y-1">
            {sims.slice(0, 4).map((s) => (
              <Link
                key={s.id}
                href={`/questao/${s.id}`}
                className="block rounded-md px-2 py-1.5 text-[13px] transition hover:translate-x-1"
                style={{ background: "var(--panel-2)" }}
              >
                <span style={{ color: SUBJECT_COLOR[s.subject] }}>{s.subject}</span>{" "}
                <span className="muted">· {s.year} ·</span> {s.statement.slice(0, 90)}…
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Result({
  data,
  queue,
  answers,
  elapsed,
  onExit,
}: {
  data: Dataset;
  queue: Question[];
  answers: Record<string, string>;
  elapsed: number;
  onExit: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const answered = queue.filter((q) => answers[q.id]);
  const right = answered.filter((q) => answers[q.id] === q.correct);
  const pct = answered.length ? Math.round((right.length / answered.length) * 100) : 0;
  const shown = useCountUp(pct, 900);

  const bySubject = new Map<string, { n: number; ok: number }>();
  for (const q of answered) {
    const e = bySubject.get(q.subject) ?? { n: 0, ok: 0 };
    e.n++;
    if (answers[q.id] === q.correct) e.ok++;
    bySubject.set(q.subject, e);
  }
  const byDiff = new Map<string, { n: number; ok: number }>();
  for (const q of answered) {
    const e = byDiff.get(q.difficulty) ?? { n: 0, ok: 0 };
    e.n++;
    if (answers[q.id] === q.correct) e.ok++;
    byDiff.set(q.difficulty, e);
  }

  const ring = `conic-gradient(var(--accent) ${shown * 3.6}deg, #1b2130 0deg)`;

  return (
    <div className="anim-page space-y-4">
      <div className="panel p-6 text-center">
        <p className="label">Resultado</p>
        <div className="mx-auto mt-3 grid h-32 w-32 place-items-center rounded-full" style={{ background: ring }}>
          <div
            className="grid h-[104px] w-[104px] place-items-center rounded-full"
            style={{ background: "var(--panel)" }}
          >
            <span className="text-3xl font-bold tabular-nums">{shown}%</span>
          </div>
        </div>
        <p className="mt-3 muted">
          {right.length} de {answered.length} {answered.length === 1 ? "questão" : "questões"} ·{" "}
          {fmt(elapsed)}
          {answered.length < queue.length && ` · ${queue.length - answered.length} em branco`}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button className="btn btn-primary" onClick={onExit}>
            Novo treino
          </button>
          <Link className="btn" href="/desempenho">
            Ver desempenho
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-4">
          <span className="label">Por matéria</span>
          <div className="mt-3 space-y-2.5">
            {[...bySubject.entries()]
              .sort((a, b) => subjectSort(a[0], b[0]))
              .map(([s, v], n) => {
                const p = Math.round((v.ok / v.n) * 100);
                return (
                  <div key={s}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span style={{ color: SUBJECT_COLOR[s] }}>{s}</span>
                      <span className="muted tabular-nums">
                        {v.ok}/{v.n} · {p}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#181d27" }}>
                      <div
                        className="bar-fill h-full rounded-full"
                        style={{
                          width: `${p}%`,
                          background: SUBJECT_COLOR[s] ?? "var(--accent)",
                          animationDelay: `${n * 70}ms`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="panel p-4">
          <span className="label">Por dificuldade estimada</span>
          <div className="mt-3 space-y-2.5">
            {(["facil", "media", "dificil"] as const).map((d, n) => {
              const v = byDiff.get(d);
              if (!v) return null;
              const p = Math.round((v.ok / v.n) * 100);
              return (
                <div key={d}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span>{DIFF_LABEL[d]}</span>
                    <span className="muted tabular-nums">
                      {v.ok}/{v.n} · {p}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#181d27" }}>
                    <div
                      className="bar-fill h-full rounded-full"
                      style={{ width: `${p}%`, background: "var(--accent)", animationDelay: `${n * 70}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel p-4">
        <span className="label">Revisão questão a questão</span>
        <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
          {queue.map((q, n) => {
            const a = answers[q.id];
            const ok = a === q.correct;
            return (
              <button
                key={q.id}
                onClick={() => setOpenId(openId === q.id ? null : q.id)}
                className="grid h-9 place-items-center rounded-[8px] text-xs font-semibold transition hover:scale-105"
                style={{
                  background: !a ? "#181d27" : ok ? "rgba(52,201,138,.2)" : "rgba(242,88,95,.2)",
                  color: !a ? "var(--muted)" : ok ? "#7fe0ae" : "#ffb0b4",
                  outline: openId === q.id ? "2px solid var(--accent)" : "none",
                  animationDelay: `${Math.min(n * 12, 400)}ms`,
                }}
              >
                {n + 1}
              </button>
            );
          })}
        </div>

        {openId &&
          (() => {
            const q = queue.find((x) => x.id === openId)!;
            const ctx = q.contextId ? data.contexts[q.contextId] : null;
            return (
              <div className="anim-pop mt-4">
                <QuestionCard
                  q={q}
                  ctx={ctx}
                  order={Object.keys(q.options).sort()}
                  chosen={answers[q.id] ?? null}
                  revealed
                  disabled
                  onChoose={() => {}}
                />
              </div>
            );
          })()}
      </div>
    </div>
  );
}

export { QuestionMeta };
