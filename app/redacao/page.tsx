"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingPanel from "@/components/LoadingPanel";
import { loadRedacoes } from "@/lib/data";
import { loadNotes, saveNote } from "@/lib/store";
import type { Redacao } from "@/lib/types";

/** The exam counts lines, so the editor does too. */
function countLines(text: string, perLine = 78) {
  if (!text.trim()) return 0;
  return text
    .split("\n")
    .reduce((n, p) => n + Math.max(1, Math.ceil(p.length / perLine)), 0);
}

export default function Page() {
  const [exams, setExams] = useState<Redacao[] | null>(null);
  const [sel, setSel] = useState(0);
  const [promptIdx, setPromptIdx] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRedacoes().then((r) => setExams(r.sort((a, b) => b.year - a.year)));
    setNotes(loadNotes());
  }, []);

  const exam = exams?.[sel];
  const prompt = exam?.prompts[promptIdx];
  const key = exam && prompt ? `${exam.id}-p${prompt.n}` : "";
  const text = key ? notes[key] ?? "" : "";
  const lines = useMemo(() => countLines(text), [text]);
  const limit = prompt?.lines ?? null;

  if (!exams) return <LoadingPanel label="Carregando provas de redação…" />;

  return (
    <div className="anim-stagger space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold tracking-tight">Redação</h1>
        <p className="mt-1.5 text-sm muted">
          Provas de Compreensão e Produção de Textos (CPT) — a parte discursiva que, no novo formato,
          é comum a todos os cursos. O caderno original aparece inteiro, com os textos-base; o editor
          conta linhas como a folha da prova.
        </p>
      </div>

      <div className="panel p-5">
        <span className="label">Prova</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {exams.map((e, n) => (
            <button
              key={e.id}
              className="chip"
              data-on={n === sel}
              onClick={() => {
                setSel(n);
                setPromptIdx(0);
              }}
            >
              UFPR {e.year}
            </button>
          ))}
        </div>
      </div>

      {exam && (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="panel p-4">
            <span className="label">Caderno original — UFPR {exam.year}</span>
            <div className="mt-3 space-y-2">
              {exam.pages.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p}
                  src={`/r/${p}`}
                  alt={`Página da prova de redação da UFPR ${exam.year}`}
                  className="w-full rounded-[10px] bg-white"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {exam.prompts.length > 0 ? (
              <>
                <div className="panel p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label">Proposta</span>
                    <div className="flex gap-1.5">
                      {exam.prompts.map((p, n) => (
                        <button
                          key={p.n}
                          className="chip"
                          data-on={n === promptIdx}
                          onClick={() => setPromptIdx(n)}
                        >
                          {n + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="prose-q text-sm">{prompt?.text}</p>
                </div>

                <div className="panel p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label">Seu texto</span>
                    <span
                      className="text-xs"
                      style={{
                        color: limit && lines > limit ? "#ff9f9f" : "var(--muted)",
                      }}
                    >
                      {lines} {lines === 1 ? "linha" : "linhas"}
                      {limit ? ` / ${limit}` : ""}
                    </span>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNotes((n) => ({ ...n, [key]: v }));
                      saveNote(key, v);
                    }}
                    rows={14}
                    placeholder="Escreva sua resposta…"
                    className="w-full resize-y rounded-lg border p-3 text-sm leading-relaxed outline-none"
                    style={{
                      background: "var(--panel-2)",
                      borderColor: limit && lines > limit ? "#d05353" : "var(--line)",
                      color: "var(--text)",
                    }}
                  />
                  {limit && lines > limit && (
                    <p className="mt-1.5 text-xs" style={{ color: "#ff9f9f" }}>
                      Passou do limite de {limit} linhas da proposta.
                    </p>
                  )}
                  <p className="mt-2 text-[11px] muted">
                    A contagem é uma aproximação (~78 caracteres por linha) para você calibrar a
                    extensão; na prova real quem conta é a folha de versão definitiva.
                  </p>
                </div>
              </>
            ) : (
              <div className="panel p-4 text-sm muted">
                Não consegui isolar o enunciado desta prova automaticamente — as propostas estão nas
                páginas ao lado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
