"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DIFF_LABEL, SUBJECT_COLOR, loadDataset, subjectSort } from "@/lib/data";
import { clearAttempts, loadAttempts, loadFlags } from "@/lib/store";
import type { Attempt, Dataset } from "@/lib/types";

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Page() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [data, setData] = useState<Dataset | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setAttempts(loadAttempts());
    setFlags(loadFlags());
    loadDataset().then(setData);
  }, []);

  const bySubject = useMemo(() => {
    const m = new Map<string, { n: number; ok: number }>();
    for (const a of attempts) {
      const e = m.get(a.subject) ?? { n: 0, ok: 0 };
      e.n++;
      if (a.correct) e.ok++;
      m.set(a.subject, e);
    }
    return [...m.entries()].sort((a, b) => subjectSort(a[0], b[0]));
  }, [attempts]);

  const byDay = useMemo(() => {
    const m = new Map<string, { n: number; ok: number }>();
    for (const a of attempts) {
      const k = dayKey(a.at);
      const e = m.get(k) ?? { n: 0, ok: 0 };
      e.n++;
      if (a.correct) e.ok++;
      m.set(k, e);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-21);
  }, [attempts]);

  const byDiff = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    const m = new Map<string, { n: number; ok: number }>();
    for (const a of attempts) {
      const q = byId.get(a.qid);
      if (!q) continue;
      const e = m.get(q.difficulty) ?? { n: 0, ok: 0 };
      e.n++;
      if (a.correct) e.ok++;
      m.set(q.difficulty, e);
    }
    return (["facil", "media", "dificil"] as const).map((d) => [d, m.get(d)] as const);
  }, [attempts, data]);

  const wrong = useMemo(() => {
    if (!data) return [];
    const last = new Map<string, Attempt>();
    for (const a of attempts) last.set(a.qid, a);
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    return [...last.values()]
      .filter((a) => !a.correct)
      .map((a) => byId.get(a.qid))
      .filter(Boolean)
      .reverse()
      .slice(0, 60);
  }, [attempts, data]);

  const flagged = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.questions.map((q) => [q.id, q]));
    return Object.keys(flags)
      .map((id) => byId.get(id))
      .filter(Boolean);
  }, [flags, data]);

  const total = attempts.length;
  const right = attempts.filter((a) => a.correct).length;
  const pct = total ? Math.round((right / total) * 100) : 0;
  const avgMs = total ? attempts.reduce((s, a) => s + (a.ms || 0), 0) / total : 0;

  if (!total)
    return (
      <div className="panel p-8 text-center">
        <p className="text-lg font-semibold">Você ainda não respondeu nenhuma questão.</p>
        <p className="mt-1.5 text-sm muted">
          Faça um treino e as estatísticas aparecem aqui. Tudo fica salvo só no seu navegador.
        </p>
        <Link className="btn btn-primary mt-5" href="/treino">
          Começar
        </Link>
      </div>
    );

  const maxDay = Math.max(...byDay.map(([, v]) => v.n), 1);

  return (
    <div className="anim-stagger space-y-4">
      <div className="panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="label">Aproveitamento geral</span>
            <p className="mt-1 text-4xl font-bold">{pct}%</p>
            <p className="mt-1 text-sm muted">
              {right} acertos em {total} respostas
              {avgMs > 0 && ` · ${Math.round(avgMs / 1000)}s por questão em média`}
            </p>
          </div>
          <button
            className="btn"
            onClick={() => {
              if (confirm("Apagar todo o histórico de respostas? Isso não pode ser desfeito.")) {
                clearAttempts();
                setAttempts([]);
              }
            }}
          >
            Apagar histórico
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5">
          <span className="label">Por matéria</span>
          <div className="mt-3 space-y-2.5">
            {bySubject.map(([s, v]) => {
              const p = Math.round((v.ok / v.n) * 100);
              return (
                <div key={s}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span style={{ color: SUBJECT_COLOR[s] }}>{s}</span>
                    <span className="muted">
                      {v.ok}/{v.n} · {p}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#181d27" }}>
                    <div
                      className="bar-fill h-full rounded-full"
                      style={{ width: `${p}%`, background: SUBJECT_COLOR[s] ?? "var(--accent)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <span className="label">Por dificuldade estimada</span>
            <div className="mt-3 space-y-2.5">
              {byDiff.map(([d, v]) =>
                v ? (
                  <div key={d}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span>{DIFF_LABEL[d]}</span>
                      <span className="muted">
                        {v.ok}/{v.n} · {Math.round((v.ok / v.n) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#181d27" }}>
                      <div
                        className="bar-fill h-full rounded-full"
                        style={{ width: `${(v.ok / v.n) * 100}%`, background: "var(--accent)" }}
                      />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>

          <div className="panel p-5">
            <span className="label">Últimos dias</span>
            <div className="mt-3 flex h-24 items-end gap-1">
              {byDay.map(([k, v]) => (
                <div key={k} className="flex flex-1 flex-col items-center gap-1" title={`${k}: ${v.ok}/${v.n}`}>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(v.n / maxDay) * 72}px`,
                      background: `linear-gradient(to top, var(--accent) ${(v.ok / v.n) * 100}%, #2a3142 ${
                        (v.ok / v.n) * 100
                      }%)`,
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] muted">
              Altura = questões respondidas; parte azul = acertos.
            </p>
          </div>
        </div>
      </div>

      {flagged.length > 0 && (
        <div className="panel p-5">
          <span className="label">Marcadas para revisar ({flagged.length})</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {flagged.map((q) => (
              <Link key={q!.id} href={`/questao/${q!.id}`} className="chip hover:underline">
                {q!.subject} · {q!.year} · q{q!.number}
              </Link>
            ))}
          </div>
        </div>
      )}

      {wrong.length > 0 && (
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="label">Questões que você errou ({wrong.length})</span>
            <Link href="/treino" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
              treinar só os erros →
            </Link>
          </div>
          <div className="mt-3 space-y-1.5">
            {wrong.map((q) => (
              <Link
                key={q!.id}
                href={`/questao/${q!.id}`}
                className="block rounded-md px-3 py-2 text-[13.5px] transition hover:translate-x-1"
                style={{ background: "var(--panel-2)" }}
              >
                <span style={{ color: SUBJECT_COLOR[q!.subject] }}>{q!.subject}</span>{" "}
                <span className="muted">· {q!.year} · q{q!.number}</span> — {q!.statement.slice(0, 120)}…
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
