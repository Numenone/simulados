"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/treino", label: "Treino" },
  { href: "/simulado", label: "Simulado" },
  { href: "/discursivas", label: "Discursivas" },
  { href: "/redacao", label: "Redação" },
  { href: "/explorar", label: "Explorar" },
  { href: "/desempenho", label: "Desempenho" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ borderColor: "var(--line)", background: "rgba(8,10,15,.78)" }}>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg text-[13px] font-bold transition-transform duration-300 hover:rotate-[8deg] hover:scale-110"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "#06121f",
              boxShadow: "0 6px 18px -8px rgba(91,147,255,.9)",
            }}
          >
            U
          </span>
          <span className="hidden sm:inline">Simulado UFPR</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {LINKS.slice(1).map((l) => {
            const on = path === l.href || (l.href !== "/" && path.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className="relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 hover:text-[var(--text)]"
                style={{
                  background: on ? "rgba(91,147,255,.14)" : "transparent",
                  color: on ? "#cfe0ff" : "var(--muted)",
                  boxShadow: on ? "inset 0 0 0 1px rgba(91,147,255,.25)" : "none",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
