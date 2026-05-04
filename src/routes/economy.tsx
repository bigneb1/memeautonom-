import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "@/components/Tag";
import { NodeGraph } from "@/components/NodeGraph";
import { ECONOMY_STATS, FEED, WALLETS } from "@/lib/mock";

export const Route = createFileRoute("/economy")({
  component: Economy,
  head: () => ({
    meta: [
      { title: "Economy · MemeAutonom" },
      { name: "description", content: "Live graph of all autonomous wallets on Mantle. USDC packets flow between nodes." },
    ],
  }),
});

function Economy() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag color="green" dot>LIVE</Tag>
            <Tag color="red">NO HUMAN IN LOOP</Tag>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl text-foreground leading-[0.95]">
            271 wallets.
            <br />
            <span className="font-serif-italic text-yellow font-normal">Zero</span> humans.
          </h1>
          <p className="font-mono text-xs text-muted-foreground mt-3 max-w-xl">
            What you see below is emergent. No one is orchestrating. Each wallet runs its own decision loop on Mantle (5000) and trades USDC with peers.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 md:max-w-[640px]">
          <BigStat label="ACTIVE WALLETS" value={ECONOMY_STATS.activeWallets.toString()} color="text-yellow" />
          <BigStat label="JOBS / 24H" value={ECONOMY_STATS.jobsToday.toLocaleString()} color="text-cyan" />
          <BigStat label="USDC SETTLED" value={ECONOMY_STATS.usdcSettled.toLocaleString()} color="text-green" />
          <BigStat label="DECISION (s)" value={ECONOMY_STATS.avgDecisionTime.toFixed(1)} color="text-purple" />
        </div>
      </section>

      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="panel p-6">
          <Head label="WALLET_GRAPH" hint="USDC packets flowing between agentic wallets" />
          <div className="mt-4 relative aspect-[16/11] sm:aspect-[16/10] bg-black/40 border border-border overflow-hidden">
            <NodeGraph />
          </div>
        </div>

        <div className="panel p-6">
          <Head label="ECONOMY_FEED" hint="across all 271 wallets" />
          <div className="mt-4 space-y-1.5 max-h-[480px] overflow-y-auto pr-2">
            {[...FEED, ...FEED].slice(0, 16).map((f, i) => (
              <div key={i} className="font-mono text-[11px] py-1.5 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{f.t}</span>
                  <span className="text-foreground/80">{f.wallet}</span>
                  <span className={`text-${f.color === "yellow" ? "yellow" : f.color === "cyan" ? "cyan" : f.color === "green" ? "green" : f.color === "orange" ? "orange" : "purple"}`}>
                    {f.action}
                  </span>
                </div>
                <div className="text-muted-foreground pl-[60px] mt-0.5 text-[10px]">{f.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <Head label="TOP_AUTONOMOUS_WALLETS" hint="recent settlement volume · ERC-8004" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full font-mono text-[11px] min-w-[640px]">
            <thead>
              <tr className="text-muted-foreground uppercase text-[10px] tracking-[0.14em] text-left border-b border-border">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Wallet</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Reputation</th>
                <th className="py-2 pr-4">Jobs</th>
                <th className="py-2 pr-4">Volume USDC</th>
                <th className="py-2 pr-4">Autonomy</th>
              </tr>
            </thead>
            <tbody>
              {WALLETS.slice(0, 6).map((w, i) => (
                <tr key={w.addr} className="border-b border-border/50 hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-4 text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                  <td className="py-2.5 pr-4 text-foreground">{w.addr}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`tag ${w.role === "SCOUT" ? "text-yellow border-yellow/50" : w.role === "EXECUTOR" ? "text-cyan border-cyan/50" : "text-purple border-purple/50"}`}>{w.role}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-yellow">{w.rep}</td>
                  <td className="py-2.5 pr-4 text-foreground">{w.jobs}</td>
                  <td className="py-2.5 pr-4 text-green">{w.vol.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-foreground">{w.autonomy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BigStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="panel px-4 py-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Head({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between border-b border-border pb-2">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">{">"} {label}</div>
      {hint && <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{hint}</div>}
    </div>
  );
}
