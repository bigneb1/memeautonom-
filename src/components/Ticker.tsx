const items = [
  "wallet 0x7Ae3 · POST_JOB · 3.00 USDC",
  "wallet 0x9F22 · EXECUTED · job#4821",
  "wallet 0xC112 · VERIFIED · payout released",
  "271 wallets active",
  "decision loop avg 1.4s",
  "USDC settled 24h · 18,472.91",
  "skill apy-scout fires 47x",
  "rep 847 · jobs 142 · vol 2,847 USDC",
  "no human in the loop",
];

export function Ticker() {
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
