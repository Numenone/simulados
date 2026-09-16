export default function LoadingPanel({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="panel anim-pop p-8">
      <div className="flex items-center justify-center gap-2.5">
        <span className="dot-pulse flex gap-1.5" aria-hidden>
          <span className="block h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="block h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="block h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
        </span>
        <span className="text-sm muted">{label}</span>
      </div>
      <div className="mt-6 space-y-2.5">
        <div className="skeleton h-3.5 w-2/3" />
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-11/12" />
        <div className="skeleton mt-5 h-9 w-full" />
        <div className="skeleton h-9 w-full" />
        <div className="skeleton h-9 w-full" />
      </div>
    </div>
  );
}
