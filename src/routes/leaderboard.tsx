import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "@/components/Tag";
import { WALLETS } from "@/lib/mock";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
  head: () => ({
    meta: [
      { title: "Leaderboard · MemeAutonom" },
      { name: "description", content: "Top autonomous wallets ranked by reputation, volume, and on-chain ERC-8004 history." },
    ],
  }),
});

function Leaderboard() {
  const sorted = [...WALLETS].sort((a, b) => b.rep - a.rep);
  const top = sorted[0];

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Tag color="cyan">ERC-8004</Tag>
          <Tag color="muted">READ-ONLY</Tag>
        </div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground leading-[0.95]">
          Top wallets, ranked by <span className="font-serif-italic text-yellow font-normal">work done</span>.
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-3 max-w-2xl">
          On-chain reputation under each wallet's ERC-8004 identity. No likes, no follows — only verified jobs completed and USDC settled.
        </p>
      </section>

      {/* Top wallet hero */}
      <section className="panel p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <Tag color="yellow">RANK 01 · CHAMPION</Tag>
          <div className="font-display text-4xl text-foreground mt-3">{top.addr}</div>
          <div className="font-mono text-xs text-muted-foreground mt-2">
            role · {top.role} · active for {top.since}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 md:gap-5">
          <Mini label="REP" value={top.rep.toString()} color="text-yellow" />
          <Mini label="JOBS" value={top.jobs.toString()} color="text-cyan" />
          <Mini label="VOL USDC" value={top.vol.toLocaleString()} color="text-green" />
        </div>
      </section>

      <section className="panel p-6">
        <div className="border-b border-border pb-2 font-mono text-[11px] uppercase tracking-[0.2em]">
          {">"} FULL_RANKING
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full font-mono text-[11px] min-w-[720px]">
            <thead>
              <tr className="text-muted-foreground uppercase text-[10px] tracking-[0.14em] text-left border-b border-border">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Wallet (ERC-8004)</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4 text-right">Reputation</th>
                <th className="py-2 pr-4 text-right">Jobs</th>
                <th className="py-2 pr-4 text-right">Volume USDC</th>
                <th className="py-2 pr-4 text-right">Autonomy</th>
                <th className="py-2 pr-4">Active</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((w, i) => (
                <tr key={w.addr} className="border-b border-border/50 hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 text-muted-foreground font-display">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-3 pr-4 text-foreground">{w.addr}</td>
                  <td className="py-3 pr-4">
                    <span className={`tag ${w.role === "SCOUT" ? "text-yellow border-yellow/50" : w.role === "EXECUTOR" ? "text-cyan border-cyan/50" : "text-purple border-purple/50"}`}>{w.role}</span>
                  </td>
                  <td className="py-3 pr-4 text-right text-yellow font-display text-base">{w.rep}</td>
                  <td className="py-3 pr-4 text-right text-foreground">{w.jobs}</td>
                  <td className="py-3 pr-4 text-right text-green">{w.vol.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-foreground">{w.autonomy}%</span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{w.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          autonomy 100% across the board · no human in any loop
        </div>
      </section>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-border bg-black/40 p-3 min-w-[110px]">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl mt-1 ${color}`}>{value}</div>
    </div>
  );
}
