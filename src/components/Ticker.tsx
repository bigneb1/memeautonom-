export function Ticker() {
  // Demo ticker items removed. Wire real-time stats from your indexer or
  // on-chain subscription here (e.g. recent jobs, settlements, decisions).
  const items: string[] = [];

  if (items.length === 0) {
    return (
      <div className="border-y border-border bg-panel">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="w-1 h-1 bg-yellow rounded-full" />
          live ticker · awaiting indexer feed
        </div>
      </div>
    );
  }

  const doubled = [...items, ...items];
  return (
    <div className="border-y border-border bg-panel overflow-hidden">
      <div className="ticker flex whitespace-nowrap py-2">
        {doubled.map((t, i) => (
          <span
            key={i}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground px-6 flex items-center gap-3"
          >
            <span className="w-1 h-1 bg-yellow rounded-full" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
