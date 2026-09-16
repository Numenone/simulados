"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import QuestionCard from "@/components/QuestionCard";
import Calculator, { CalcToggle, CALC_SUBJECTS } from "@/components/Calculator";
import { SUBJECT_COLOR, loadDataset } from "@/lib/data";
import LoadingPanel from "@/components/LoadingPanel";
import { pushAttempts } from "@/lib/store";
import type { Dataset, Question } from "@/lib/types";

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const [data, setData] = useState<Dataset | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  useEffect(() => {
    loadDataset().then(setData);
  }, []);
  useEffect(() => {
    setChosen(null);
    setRevealed(false);
    setCalcOpen(false);
  }, [id]);

  const q = useMemo(() => data?.questions.find((x) => x.id === id) ?? null, [data, id]);
  const byId = useMemo(() => new Map((data?.questions ?? []).map((x) => [x.id, x])), [data]);

  if (!data) return <LoadingPanel label="Carregando questão…" />;
  if (!q)
    return (
      <div className="panel p-6">
        <p>Questão não encontrada.</p>
        <Link className="btn mt-4" href="/explorar">
          Voltar à busca
        </Link>
      </div>
    );

  const ctx = q.contextId ? data.contexts[q.contextId] : null;
  const sameCtx = q.contextId
    ? data.questions.filter((x) => x.contextId === q.contextId && x.id !== q.id)
    : [];
  const sims = q.similar.map((s) => byId.get(s.id)).filter(Boolean) as Question[];
  const calcRelevant = CALC_SUBJECTS.has(q.subject);

  function choose(letter: string) {
    if (chosen) return;
    setChosen(letter);
    setRevealed(true);
    pushAttempts([
      {
        qid: q!.id,
        chosen: letter,
        correct: letter === q!.correct,
        at: Date.now(),
        subject: q!.subject,
        ms: 0,
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <Link href="/explorar" className="link-underline text-sm muted">
        ← voltar à busca
      </Link>

      <QuestionCard
        q={q}
        ctx={ctx}
        order={Object.keys(q.options).sort()}
        chosen={chosen}
        revealed={revealed}
        disabled={!!chosen}
        onChoose={choose}
      />

      {!revealed && (
        <button className="btn w-full" onClick={() => setRevealed(true)}>
          Revelar gabarito
        </button>
      )}
      {revealed && (
        <div
          className="panel p-4"
          style={{
            borderColor: chosen ? (chosen === q.correct ? "#2f9e63" : "#d05353") : "var(--line)",
          }}
        >
          <p className="font-semibold">
            Gabarito oficial: <b>{q.correct?.toUpperCase()}</b>
            {chosen && (chosen === q.correct ? " — você acertou" : " — você errou")}
          </p>
        </div>
      )}

      {sameCtx.length > 0 && (
        <div className="panel p-4">
          <span className="label">Outras questões do mesmo texto</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sameCtx.map((s) => (
              <Link key={s.id} href={`/questao/${s.id}`} className="chip hover:underline">
                {s.year} · q{s.number} · {s.subject}
              </Link>
            ))}
          </div>
        </div>
      )}

      {calcRelevant && (
        <>
          <CalcToggle open={calcOpen} onToggle={() => setCalcOpen((o) => !o)} />
          <Calculator open={calcOpen} onClose={() => setCalcOpen(false)} />
        </>
      )}

      {sims.length > 0 && (
        <div className="panel p-4">
          <span className="label">Questões parecidas</span>
          <div className="mt-2 space-y-1.5">
            {sims.map((s) => (
              <Link
                key={s.id}
                href={`/questao/${s.id}`}
                className="block rounded-md px-3 py-2 text-[13.5px] transition hover:underline"
                style={{ background: "var(--panel-2)" }}
              >
                <span style={{ color: SUBJECT_COLOR[s.subject] }}>{s.subject}</span>{" "}
                <span className="muted">· UFPR {s.year} · q{s.number}</span>
                <br />
                {s.statement.slice(0, 140)}…
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
