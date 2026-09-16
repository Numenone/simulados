"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { evaluate, formatResult, type AngleMode } from "@/lib/calc";

const KEYS_BASIC: string[][] = [
  ["7", "8", "9", "(", ")"],
  ["4", "5", "6", "×", "÷"],
  ["1", "2", "3", "+", "−"],
  ["0", ".", "^", "%", "="],
];

const KEYS_SCI: [string, string][] = [
  ["sin", "sin("],
  ["cos", "cos("],
  ["tan", "tan("],
  ["√", "sqrt("],
  ["ln", "ln("],
  ["log", "log("],
  ["x²", "^2"],
  ["xʸ", "^"],
  ["π", "pi"],
  ["e", "e"],
  ["n!", "!"],
  ["Ans", "ans"],
];

const INSERT: Record<string, string> = { "×": "*", "÷": "/", "−": "-" };

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Calculator({ open, onClose }: Props) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [mode, setMode] = useState<AngleMode>("deg");
  const [sci, setSci] = useState(true);
  const [history, setHistory] = useState<{ e: string; r: string }[]>([]);
  const [ans, setAns] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // remember where the user parked it
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ufpr.calcPos");
      if (raw) setPos(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (!pos) return;
    try {
      window.localStorage.setItem("ufpr.calcPos", JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // live preview
  useEffect(() => {
    if (!expr.trim()) {
      setResult("");
      setError("");
      return;
    }
    try {
      setResult(formatResult(evaluate(expr, mode, ans)));
      setError("");
    } catch (e) {
      setResult("");
      setError((e as Error).message);
    }
  }, [expr, mode, ans]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const commit = useCallback(() => {
    if (!expr.trim()) return;
    try {
      const v = evaluate(expr, mode, ans);
      const r = formatResult(v);
      setAns(v);
      setHistory((h) => [{ e: expr, r }, ...h].slice(0, 30));
      setExpr(r);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [expr, mode, ans]);

  const press = useCallback(
    (k: string) => {
      if (k === "=") return commit();
      setExpr((p) => p + (INSERT[k] ?? k));
      inputRef.current?.focus();
    },
    [commit]
  );

  // drag
  useEffect(() => {
    function move(e: MouseEvent) {
      if (!drag.current) return;
      setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy });
    }
    function up() {
      drag.current = null;
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const clamped = pos
    ? {
        x: Math.min(Math.max(0, pos.x), Math.max(0, window.innerWidth - 320)),
        y: Math.min(Math.max(0, pos.y), Math.max(0, window.innerHeight - 120)),
      }
    : null;
  const style: React.CSSProperties = clamped
    ? { left: clamped.x, top: clamped.y, right: "auto", bottom: "auto" }
    : { right: 20, bottom: 88 };

  return (
    <div
      ref={panelRef}
      className="calc-panel fixed z-50 w-[310px] select-none rounded-2xl border shadow-2xl"
      style={{ ...style, background: "var(--panel)", borderColor: "var(--line)" }}
      role="dialog"
      aria-label="Calculadora"
    >
      <div
        className="flex cursor-grab items-center justify-between rounded-t-2xl border-b px-3 py-2 active:cursor-grabbing"
        style={{ borderColor: "var(--line)", background: "var(--panel-2)" }}
        onMouseDown={(e) => {
          const r = panelRef.current!.getBoundingClientRect();
          drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
          setPos({ x: r.left, y: r.top });
        }}
      >
        <span className="label">Calculadora</span>
        <div className="flex items-center gap-1">
          <button
            className="chip !px-2 !py-0.5"
            onClick={() => setMode((m) => (m === "deg" ? "rad" : "deg"))}
            title="Alternar graus/radianos"
          >
            {mode.toUpperCase()}
          </button>
          <button className="chip !px-2 !py-0.5" onClick={() => setSci((s) => !s)}>
            {sci ? "básica" : "científica"}
          </button>
          <button
            className="grid h-6 w-6 place-items-center rounded-md text-sm"
            style={{ color: "var(--muted)" }}
            onClick={onClose}
            aria-label="Fechar calculadora"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="px-3 pt-3">
        <input
          ref={inputRef}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="digite ou use os botões"
          inputMode="text"
          className="w-full rounded-lg border px-3 py-2 text-right font-mono text-[16px] outline-none"
          style={{ background: "var(--panel-2)", borderColor: "var(--line)", color: "var(--text)" }}
        />
        <div className="mt-1 flex h-5 items-center justify-end text-right font-mono text-sm">
          {error ? (
            <span style={{ color: "#ff9f9f" }}>{error}</span>
          ) : (
            <span className="calc-result" key={result} style={{ color: "#7fe0ae" }}>
              {result && `= ${result}`}
            </span>
          )}
        </div>
      </div>

      {sci && (
        <div className="grid grid-cols-6 gap-1 px-3 pt-2">
          {KEYS_SCI.map(([label, ins]) => (
            <button key={label} className="calc-key calc-key-fn" onClick={() => press(ins)}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-1 p-3">
        <button className="calc-key calc-key-alt" onClick={() => setExpr("")}>
          C
        </button>
        <button className="calc-key calc-key-alt" onClick={() => setExpr((p) => p.slice(0, -1))}>
          ⌫
        </button>
        <button className="calc-key calc-key-alt col-span-3 !text-[12px]" onClick={() => setHistory([])}>
          limpar histórico
        </button>
        {KEYS_BASIC.flat().map((k) => (
          <button
            key={k}
            className={`calc-key ${k === "=" ? "calc-key-eq" : /[0-9.]/.test(k) ? "" : "calc-key-alt"}`}
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <div
          className="max-h-32 overflow-y-auto border-t px-3 py-2 text-[12px]"
          style={{ borderColor: "var(--line)" }}
        >
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => setExpr(h.e)}
              className="flex w-full items-baseline justify-between gap-2 rounded px-1 py-0.5 text-left hover:bg-white/5"
            >
              <span className="truncate font-mono muted">{h.e}</span>
              <span className="shrink-0 font-mono">{h.r}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Floating toggle button — only shown where a calculator makes sense. */
export function CalcToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="calc-fab fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full text-lg shadow-xl transition"
      style={{
        background: open ? "var(--accent)" : "var(--panel-2)",
        color: open ? "#06121f" : "var(--text)",
        border: "1px solid var(--line)",
      }}
      title="Calculadora (tecla K)"
      aria-label="Abrir calculadora"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
        <rect x="7" y="5.5" width="10" height="3.5" rx="1" />
        <circle cx="8.5" cy="13" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="13" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="13" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="8.5" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

/** Subjects where UFPR problems routinely involve arithmetic. */
export const CALC_SUBJECTS = new Set(["Matemática", "Física", "Química", "Biologia", "Geografia"]);
