"use client";

import type { Dataset, Difficulty, RunConfig } from "@/lib/types";
import { DIFF_LABEL, SUBJECT_COLOR, subjectSort } from "@/lib/data";

interface Props {
  data: Dataset;
  cfg: RunConfig;
  set: (patch: Partial<RunConfig>) => void;
  available: number;
  showRunOptions?: boolean;
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function FilterPanel({ data, cfg, set, available, showRunOptions = true }: Props) {
  const subjects = [...new Set(data.questions.map((q) => q.subject))].sort(subjectSort);
  const years = [...new Set(data.questions.map((q) => q.year))].sort((a, b) => b - a);
  const langs = [...new Set(data.questions.filter((q) => q.lang).map((q) => q.lang!))].sort();

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Matérias</span>
          <button className="text-xs muted hover:underline" onClick={() => set({ subjects: [] })}>
            {cfg.subjects.length ? "limpar" : "todas"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {subjects.map((s) => {
            const on = cfg.subjects.includes(s);
            const c = SUBJECT_COLOR[s] ?? "#8aa0c0";
            return (
              <button
                key={s}
                className="chip"
                data-on={on}
                style={on ? { borderColor: c, background: `${c}22`, color: c } : undefined}
                onClick={() => set({ subjects: toggle(cfg.subjects, s) })}
              >
                {s}
              </button>
            );
          })}
        </div>
      </section>

      {(cfg.subjects.length === 0 || cfg.subjects.includes("Língua Estrangeira")) && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="label">Idioma (língua estrangeira)</span>
            <button className="text-xs muted hover:underline" onClick={() => set({ langs: [] })}>
              todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {langs.map((l) => (
              <button
                key={l}
                className="chip"
                data-on={cfg.langs.includes(l)}
                onClick={() => set({ langs: toggle(cfg.langs, l) })}
              >
                {l}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Dificuldade estimada</span>
          <button className="text-xs muted hover:underline" onClick={() => set({ difficulties: [] })}>
            todas
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["facil", "media", "dificil"] as Difficulty[]).map((d) => (
            <button
              key={d}
              className="chip"
              data-on={cfg.difficulties.includes(d)}
              onClick={() => set({ difficulties: toggle(cfg.difficulties, d) })}
            >
              {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] muted">
          Estimativa própria (tamanho, estrutura, carga numérica, dependência de texto/figura). A UFPR
          não divulga índice de acerto por questão.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="label">Anos</span>
          <button className="text-xs muted hover:underline" onClick={() => set({ years: [] })}>
            todos
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              className="chip"
              data-on={cfg.years.includes(y)}
              onClick={() => set({ years: toggle(cfg.years, y) })}
            >
              {y}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <span className="label">Refinar</span>
        {(
          [
            ["onlyWithContext", "Só questões com texto de apoio"],
            ["onlyUnseen", "Só questões que ainda não respondi"],
            ["excludeCorrect", "Esconder as que eu já acertei"],
            ["onlyErrors", "Só as que eu errei (revisão)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={cfg[key] as boolean}
              onChange={(e) => {
                const patch: Partial<RunConfig> = { [key]: e.target.checked } as Partial<RunConfig>;
                if (key === "onlyErrors" && e.target.checked) patch.excludeCorrect = false;
                if (key === "excludeCorrect" && e.target.checked) patch.onlyErrors = false;
                set(patch);
              }}
              className="h-4 w-4 rounded"
            />
            <span>{label}</span>
          </label>
        ))}
      </section>

      {showRunOptions && (
        <section className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label">Quantidade de questões</span>
              <span className="text-sm font-semibold">{cfg.count}</span>
            </div>
            <input
              type="range"
              min={5}
              max={Math.max(10, Math.min(120, available))}
              step={1}
              value={Math.min(cfg.count, Math.max(10, Math.min(120, available)))}
              onChange={(e) => set({ count: Number(e.target.value) })}
              className="w-full"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[10, 20, 30, 45, 80].map((n) => (
                <button
                  key={n}
                  className="chip"
                  data-on={cfg.count === n}
                  disabled={n > available}
                  onClick={() => set({ count: n })}
                >
                  {n}
                  {n === 80 && " (prova cheia)"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="label">Ritmo</span>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={cfg.instantFeedback}
                onChange={(e) => set({ instantFeedback: e.target.checked })}
                className="h-4 w-4"
              />
              <span>Mostrar se acertei na hora</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={cfg.autoAdvance}
                onChange={(e) => set({ autoAdvance: e.target.checked })}
                className="h-4 w-4"
              />
              <span>Avançar sozinho ao responder</span>
            </label>
            {cfg.autoAdvance && (
              <div className="pl-7">
                <div className="mb-1 flex items-center justify-between text-xs muted">
                  <span>Tempo até avançar</span>
                  <span>{(cfg.advanceDelay / 1000).toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4000}
                  step={100}
                  value={cfg.advanceDelay}
                  onChange={(e) => set({ advanceDelay: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={cfg.shuffleOptions}
                onChange={(e) => set({ shuffleOptions: e.target.checked })}
                className="h-4 w-4"
              />
              <span>Embaralhar alternativas</span>
            </label>
          </div>
        </section>
      )}

      <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--panel-2)" }}>
        <b>{available}</b> {available === 1 ? "questão disponível" : "questões disponíveis"} com esses
        filtros.
      </div>
    </div>
  );
}
