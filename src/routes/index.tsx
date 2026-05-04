import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "@/components/Tag";
import { MY_WALLET, FEED, DECISION_LOG } from "@/lib/mock";

export const Route = createFileRoute("/")({
  component: MyWallet,
  head: () => ({
    meta: [
      { title: "My Wallet · MemeAutonom" },
      { name: "description", content: "Watch your autonomous wallet work. ERC-8004 identity, live feed, decision log." },
    ],
  }),
});

function MyWallet() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="panel scanline relative p-8 md:p-10 overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <Tag color="green" dot>LIVE</Tag>
          <Tag color="cyan">{MY_WALLET.ercId}</Tag>
          <Tag color="red">NO HUMAN IN LOOP</Tag>
          <Tag color="yellow">{MY_WALLET.role}</Tag>
        </div>

        <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              your agentic wallet · activated {MY_WALLET.activatedAt}
            </div>
            <h1 className="font-display text-4xl md:text-6xl leading-[0.95] text-foreground">
              Activate <span className="font-serif-italic text-yellow font-normal">once</span>.
              <br />
              Walk <span className="font-serif-italic text-yellow font-normal">away</span>.
              <br />
              <span className="text-muted-foreground">The wallet runs forever.</span>
            </h1>
            <div className="font-mono text-xs text-muted-foreground mt-6 max-w-lg">
              You don't post jobs. You don't approve actions. You don't trigger skills.
              Your wallet detects opportunity, decides, signs and broadcasts — every 5 seconds, indefinitely.
            </div>
          </div>

          <div className="space-y-3">
            <Stat label="ADDRESS" value={MY_WALLET.address} mono color="text-foreground" small />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="REPUTATION" value={MY_WALLET.reputation.toString()} color="text-yellow" />
              <Stat label="JOBS DONE" value={MY_WALLET.jobsCompleted.toString()} color="text-cyan" />
              <Stat label="EARNED USDC" value={MY_WALLET.totalEarned.toLocaleString()} color="text-green" />
              <Stat label="BALANCE" value={`${MY_WALLET.balance.usdc} USDC`} sub={`${MY_WALLET.balance.mnt} MNT`} color="text-foreground" />
            </div>
          </div>
        </div>
      </section>

      {/* Skills row */}
      <section className="panel p-6">
        <SectionHead label="SKILLS_INSTALLED" hint="configured via byreal cli · runs in decision loop" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {MY_WALLET.skills.map((s) => (
            <div
              key={s.name}
              className={`border ${s.status === "active" ? "border-cyan/50" : "border-orange/50"} p-4 bg-black/40`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`tag ${s.status === "active" ? "text-cyan border-cyan/60" : "text-orange border-orange/60"}`}>
                  {s.status === "active" && <span className="w-1 h-1 rounded-full bg-current live-dot" />}
                  {s.status}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{s.fires} fires</span>
              </div>
              <div className="font-display text-base text-foreground">{s.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground mt-2 uppercase tracking-[0.12em]">
                wallet-decided · autonomous
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feed + decision log */}
      <section className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="panel p-6">
          <SectionHead label="AUTONOMOUS_FEED" hint="t+offset · wallet · action · detail" />
          <div className="mt-4 space-y-1.5 max-h-[480px] overflow-y-auto pr-2">
            {FEED.map((f, i) => (
              <FeedRow key={i} {...f} />
            ))}
          </div>
        </div>

        <div className="panel p-6">
          <SectionHead label="DECISION_LOG" hint="wallet's reasoning · not human input" />
          <pre className="mt-4 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto">
            {DECISION_LOG.map((l, i) => (
              <div key={i} className="py-1 border-b border-border/40">
                <span className="text-cyan">{l.split("]")[0]}]</span>
                <span>{l.split("]").slice(1).join("]")}</span>
              </div>
            ))}
          </pre>
        </div>
      </section>

      {/* 3 actions reminder */}
      <section className="panel p-6">
        <SectionHead label="THE_ONLY_3_HUMAN_ACTIONS" hint="never anything more" />
        <div className="grid md:grid-cols-3 gap-px mt-4 bg-border">
          {[
            { n: "01", t: "ACTIVATE", d: "Deploy agentic wallet contract on Mantle. Mint ERC-8004 NFT. One tx. Never again." },
            { n: "02", t: "ASSIGN SKILLS", d: "Run `byreal skill add [name]`. Each skill = condition + action. Set thresholds once." },
            { n: "03", t: "FUND", d: "Send MNT + USDC to wallet. Operating capital. Wallet manages it autonomously." },
          ].map((s) => (
            <div key={s.n} className="bg-background p-6">
              <div className="font-display text-yellow text-3xl">{s.n}</div>
              <div className="font-display text-foreground mt-2 text-lg">{s.t}</div>
              <div className="font-mono text-[11px] text-muted-foreground mt-2 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color = "text-foreground",
  mono,
  small,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="border border-border bg-black/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 ${mono ? "font-mono" : "font-display"} ${small ? "text-sm" : "text-2xl"} ${color}`}>
        {value}
      </div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHead({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between border-b border-border pb-2">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        {">"} {label}
      </div>
      {hint && (
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

function FeedRow({ t, wallet, action, detail, color }: { t: string; wallet: string; action: string; detail: string; color: string }) {
  const colorClass: Record<string, string> = {
    yellow: "text-yellow",
    cyan: "text-cyan",
    green: "text-green",
    orange: "text-orange",
    red: "text-red",
    purple: "text-purple",
  };
  return (
    <div className="feed-item font-mono text-[11px] grid grid-cols-[60px_120px_140px_1fr] gap-3 py-1.5 border-b border-border/40 hover:bg-white/[0.02]">
      <span className="text-muted-foreground">{t}</span>
      <span className="text-foreground/80">{wallet}</span>
      <span className={`${colorClass[color]} font-medium`}>{action}</span>
      <span className="text-muted-foreground truncate">{detail}</span>
    </div>
  );
}
