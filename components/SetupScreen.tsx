"use client";

import { useEffect, useMemo, useState } from "react";
import FilterPanel from "./FilterPanel";
import LoadingPanel from "./LoadingPanel";
import Runner from "./Runner";
import { applyFilters, buildRun, loadDataset } from "@/lib/data";
import { deriveHistory, loadAttempts, useConfig } from "@/lib/store";
import type { Dataset, RunConfig } from "@/lib/types";

interface Props {
  mode: "treino" | "simulado";
  title: string;
  intro: string;
}

export default function SetupScreen({ mode, title, intro }: Props) {
  const [data, setData] = useState<Dataset | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cfg, set] = useConfig();
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState({ seen: new Set<string>(), errors: new Set<string>() });

  useEffect(() => {
    loadDataset().then(setData).catch((e) => setErr(String(e.message ?? e)));
    setHistory(deriveHistory(loadAttempts()));
  }, []);

  useEffect(() => {
    set({ mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const pool = useMemo(
    () => (data ? applyFilters(data.questions, cfg, history.seen, history.errors) : []),
    [data, cfg, history]
  );

  const runCfg: RunConfig = useMemo(
    () => ({
      ...cfg,
      mode,
      ...(mode === "simulado"
        ? { instantFeedback: false, autoAdvance: cfg.autoAdvance, timed: cfg.timed }
        : {}),
    }),
    [cfg, mode]
  );

  const [queue, setQueue] = useState<ReturnType<typeof buildRun>>([]);

  function start() {
    const n = Math.min(cfg.count, pool.length);
    setQueue(buildRun(pool, n, mode === "simulado"));
    setRunning(true);
  }

  if (err)
    return (
      <div className="panel p-6">
        <p className="font-semibold">Não consegui carregar o banco de questões.</p>
        <p className="mt-1 text-sm muted">{err}</p>
      </div>
    );

  if (!data) return <LoadingPanel label="Carregando banco de questões…" />;

  if (running)
    return (
      <Runner
        data={data}
        queue={queue}
        cfg={runCfg}
        onExit={() => {
          setRunning(false);
          setHistory(deriveHistory(loadAttempts()));
        }}
      />
    );

  return (
    <div className="anim-stagger space-y-5">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm muted">{intro}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="panel p-5">
          <FilterPanel data={data} cfg={cfg} set={set} available={pool.length} />
        </div>

        <div className="space-y-4">
          {mode === "simulado" && (
            <div className="panel p-5 space-y-3">
              <span className="label">Cronômetro</span>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.timed}
                  onChange={(e) => set({ timed: e.target.checked })}
                  className="h-4 w-4"
                />
                <span>Provar com tempo limite</span>
              </label>
              {cfg.timed && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs muted">
                    <span>Duração</span>
                    <span>
                      {Math.floor(cfg.minutes / 60)}h{String(cfg.minutes % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={330}
                    step={5}
                    value={cfg.minutes}
                    onChange={(e) => set({ minutes: Number(e.target.value) })}
                    className="w-full"
                  />
                  <button className="chip mt-2" onClick={() => set({ minutes: 330 })}>
                    5h30 (tempo oficial)
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="panel sticky top-20 p-5">
            <div className="flex items-baseline justify-between">
              <span className="label">Pronto?</span>
              <span className="text-sm">
                <b>{Math.min(cfg.count, pool.length)}</b> questões
              </span>
            </div>
            {mode === "simulado" && (
              <p className="mt-2 text-xs muted">
                A distribuição por matéria segue o novo formato de fase única.
              </p>
            )}
            <button
              className="btn btn-primary mt-4 w-full"
              disabled={pool.length === 0}
              onClick={start}
            >
              {pool.length === 0 ? "Nenhuma questão nesse filtro" : "Começar"}
            </button>
            {pool.length > 0 && pool.length < cfg.count && (
              <p className="mt-2 text-xs muted">
                Só há {pool.length} questões com esses filtros — o simulado virá com essa quantidade.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
