"use client";

import { useEffect, useState } from "react";
import type { Ctx, Question } from "@/lib/types";
import { DIFF_LABEL, SUBJECT_COLOR } from "@/lib/data";

const LETTERS = ["a", "b", "c", "d", "e"];

export function SubjectTag({ q }: { q: Question }) {
  const color = SUBJECT_COLOR[q.subject] ?? "#8aa0c0";
  return (
    <span
      className="chip"
      style={{ borderColor: `${color}55`, background: `${color}1a`, color }}
      title={
        q.subjectSource === "oficial"
          ? "Matéria indicada no caderno oficial da prova"
          : "Matéria inferida automaticamente (provas antigas não traziam divisão por matéria)"
      }
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {q.subject}
      {q.lang ? ` · ${q.lang}` : ""}
      {q.subjectSource === "auto" && <span style={{ opacity: 0.6 }}>~</span>}
    </span>
  );
}

export function QuestionMeta({ q }: { q: Question }) {
  const diffColor =
    q.difficulty === "facil" ? "var(--ok)" : q.difficulty === "media" ? "var(--warn)" : "var(--bad)";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SubjectTag q={q} />
      <span className="chip">UFPR {q.year}</span>
      <span className="chip">questão {q.number}</span>
      <span
        className="chip"
        style={{ color: diffColor, borderColor: `${diffColor}44` }}
        title="Estimativa heurística — a UFPR não publica índice de acerto por questão"
      >
        {DIFF_LABEL[q.difficulty]} (est.)
      </span>
      {q.contextId && <span className="chip">texto de apoio</span>}
    </div>
  );
}

export function ContextBox({ ctx, defaultOpen = true }: { ctx: Ctx; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel panel-2 mb-4 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-white/[0.02]"
      >
        <span className="label">
          Texto de apoio {ctx.shared && "· compartilhado por mais de uma questão"}
        </span>
        <span
          className="muted text-xs transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          className="ctx-scroll anim-pop border-t px-4 py-3 text-[13.5px] prose-q"
          style={{ borderColor: "var(--line)" }}
        >
          {ctx.text}
        </div>
      )}
    </div>
  );
}

interface Props {
  q: Question;
  ctx?: Ctx | null;
  order: string[];
  chosen?: string | null;
  revealed: boolean;
  disabled?: boolean;
  onChoose: (letter: string) => void;
}

export default function QuestionCard({ q, ctx, order, chosen, revealed, disabled, onChoose }: Props) {
  const [showText, setShowText] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const hasStemImg = q.stemImages.length > 0;

  useEffect(() => setShowText(false), [q.id]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZoom(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      {ctx && <ContextBox ctx={ctx} defaultOpen={!hasStemImg} />}

      <div className="panel p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <QuestionMeta q={q} />
          {hasStemImg && (
            <button className="chip" onClick={() => setShowText((s) => !s)}>
              {showText ? "ver original" : "ver como texto"}
            </button>
          )}
        </div>

        {hasStemImg && !showText ? (
          <div className="space-y-2">
            {q.stemImages.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={`/q/${src}`}
                alt={`Enunciado da questão ${q.number} (UFPR ${q.year})`}
                onClick={() => setZoom(`/q/${src}`)}
                className="w-full cursor-zoom-in rounded-[10px] bg-white transition duration-200 hover:brightness-105"
              />
            ))}
          </div>
        ) : (
          <p className="prose-q text-[15px]">{q.statement}</p>
        )}

        {hasStemImg && showText && (
          <p className="mt-2 text-xs muted">
            Esta questão depende de imagem/gráfico — o texto sozinho pode estar incompleto.
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {order.map((letter, i) => {
            const isChosen = chosen === letter;
            const isCorrect = q.correct === letter;
            let border = "var(--line)";
            let bg = "var(--panel-2)";
            let anim = "";
            if (revealed && isCorrect) {
              border = "var(--ok)";
              bg = "rgba(52,201,138,.13)";
              anim = "anim-ok";
            } else if (revealed && isChosen && !isCorrect) {
              border = "var(--bad)";
              bg = "rgba(242,88,95,.12)";
              anim = "anim-bad";
            } else if (isChosen) {
              border = "var(--accent)";
              bg = "rgba(91,147,255,.12)";
            }
            const img = q.optImages?.[letter];
            return (
              <li key={letter} className="opt-enter" style={{ animationDelay: `${i * 45}ms` }}>
                <button
                  disabled={disabled}
                  onClick={() => onChoose(letter)}
                  className={`opt ${anim} disabled:cursor-default`}
                  style={{ borderColor: border, background: bg }}
                >
                  <span
                    className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[7px] text-xs font-bold transition-colors duration-200"
                    style={{
                      background: isChosen || (revealed && isCorrect) ? border : "#20252f",
                      color: isChosen || (revealed && isCorrect) ? "#07101c" : "var(--muted)",
                    }}
                  >
                    {LETTERS[i]?.toUpperCase() ?? letter.toUpperCase()}
                  </span>
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/q/${img}`}
                      alt={`Alternativa ${LETTERS[i] ?? letter}`}
                      className="max-h-52 rounded bg-white"
                    />
                  ) : (
                    <span className="prose-q text-[14.5px]">{q.options[letter]}</span>
                  )}
                  {revealed && isCorrect && (
                    <span
                      className="anim-pop ml-auto shrink-0 self-center text-xs font-semibold"
                      style={{ color: "var(--ok)" }}
                    >
                      ✓ correta
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {zoom && (
        <div
          className="anim-pop fixed inset-0 z-50 grid cursor-zoom-out place-items-center overflow-auto p-4"
          style={{ background: "rgba(4,6,10,.93)" }}
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Enunciado ampliado" className="max-w-[1100px] rounded-lg bg-white" />
        </div>
      )}
    </div>
  );
}
