import { createFileRoute } from "@tanstack/react-router";
import { useAccount, useBalance, useChainId } from "wagmi";
import { Tag } from "@/components/Tag";
import { NodeGraph } from "@/components/NodeGraph";
import { MY_WALLET, FEED, DECISION_LOG, type FeedColor } from "@/lib/mock";
import { WalletSkillsPanel } from "@/components/WalletSkillsPanel";

export const Route = createFileRoute("/")({
  component: MyWallet,
  head: () => ({
    meta: [
      { title: "My Wallet · MemeAutonom" },
      {
        name: "description",
        content:
          "Watch your autonomous wallet work. ERC-8004 identity, live node graph, autonomous timeline feed, decision log.",
      },
    ],
  }),
});

function shortAddr(a?: string) {
  if (!a) return MY_WALLET.address;
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function MyWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address, chainId });

  const displayAddr = shortAddr(address);
  const networkLabel =
    chainId === 5000 ? "Mantle 5000" : chainId === 5003 ? "Mantle Sepolia 5003" : "Mantle";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="panel scanline relative p-5 sm:p-8 md:p-10 overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-5">
          <Tag color="green" dot>LIVE</Tag>
          <Tag color="cyan">{MY_WALLET.ercId}</Tag>
          <Tag color="red">NO HUMAN IN LOOP</Tag>
          <Tag color="yellow">{MY_WALLET.role}</Tag>
          {isConnected && <Tag color="green">CONNECTED</Tag>}
        </div>

        <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 md:gap-10 md:items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              your agentic wallet · activated {MY_WALLET.activatedAt}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-6xl leading-[0.95] text-foreground">
              Activate <span className="font-serif-italic text-yellow font-normal">once</span>.
              <br />
              Walk <span className="font-serif-italic text-yellow font-normal">away</span>.
              <br />
              <span className="text-muted-foreground">The wallet runs forever.</span>
            </h1>
            <div className="font-mono text-xs text-muted-foreground mt-5 max-w-lg leading-relaxed">
              You don't post jobs. You don't approve actions. You don't trigger skills.
              Your wallet detects opportunity, decides, signs and broadcasts — every 5 seconds, indefinitely.
            </div>
          </div>

          <div className="space-y-3">
            <Stat label="ADDRESS" value={displayAddr} mono color="text-foreground" small />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="REPUTATION" value={MY_WALLET.reputation.toString()} color="text-yellow" />
              <Stat label="JOBS DONE" value={MY_WALLET.jobsCompleted.toString()} color="text-cyan" />
              <Stat label="EARNED USDC" value={MY_WALLET.totalEarned.toLocaleString()} color="text-green" />
              <Stat
                label={isConnected ? "NETWORK" : "BALANCE"}
                value={
                  isConnected
                    ? networkLabel
                    : `${MY_WALLET.balance.usdc} USDC`
                }
                sub={
                  isConnected
                    ? balance
                      ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}`
                      : "—"
                    : `${MY_WALLET.balance.mnt} MNT`
                }
                color="text-foreground"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Skills row */}
      <section className="panel p-5 sm:p-6">
        <SectionHead label="SKILLS_INSTALLED" hint="byreal cli · runs in decision loop" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-4">
          {MY_WALLET.skills.map((s) => (
            <div
              key={s.name}
              className={`border ${s.status === "active" ? "border-cyan/50" : "border-orange/50"} p-3 sm:p-4 bg-black/40`}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                <span
                  className={`tag ${s.status === "active" ? "text-cyan border-cyan/60" : "text-orange border-orange/60"}`}
                >
                  {s.status === "active" && (
                    <span className="w-1 h-1 rounded-full bg-current live-dot" />
                  )}
                  {s.status}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{s.fires} fires</span>
              </div>
              <div className="font-display text-sm sm:text-base text-foreground break-all">
                {s.name}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground mt-1.5 uppercase tracking-[0.12em]">
                wallet-decided
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live skills + reputation from indexer */}
      <section className="panel p-5 sm:p-6">
        <SectionHead label="WALLET_SKILLS_LIVE" hint="indexer · ERC-8004 reputation" />
        <div className="mt-4">
          <WalletSkillsPanel mode="me" />
        </div>
      </section>

      {/* Node graph + timeline */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="panel p-5 sm:p-6">
          <SectionHead
            label="WALLET_NODE_GRAPH"
            hint="USDC packets · highlighted = your wallet"
          />
          <div className="mt-4 relative aspect-[16/11] sm:aspect-[16/10] bg-black/40 border border-border overflow-hidden">
            <NodeGraph highlight={displayAddr} />
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5 pointer-events-none">
              <Tag color="yellow">YOU</Tag>
              <Tag color="cyan">EXECUTOR</Tag>
              <Tag color="purple">VERIFIER</Tag>
              <Tag color="green">SETTLED</Tag>
            </div>
          </div>
        </div>

        <div className="panel p-5 sm:p-6">
          <SectionHead label="AUTONOMOUS_TIMELINE" hint="t+offset · wallet-decided" />
          <Timeline />
        </div>
      </section>

      {/* Decision log */}
      <section className="panel p-5 sm:p-6">
        <SectionHead label="DECISION_LOG" hint="wallet's reasoning · not human input" />
        <pre className="mt-4 font-mono text-[10px] sm:text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[420px] overflow-y-auto">
          {DECISION_LOG.map((l, i) => (
            <div key={i} className="py-1 border-b border-border/40">
              <span className="text-cyan">{l.split("]")[0]}]</span>
              <span>{l.split("]").slice(1).join("]")}</span>
            </div>
          ))}
        </pre>
      </section>

      {/* 3 actions reminder */}
      <section className="panel p-5 sm:p-6">
        <SectionHead label="THE_ONLY_3_HUMAN_ACTIONS" hint="never anything more" />
        <div className="grid md:grid-cols-3 gap-px mt-4 bg-border">
          {[
            { n: "01", t: "ACTIVATE", d: "Deploy agentic wallet contract on Mantle. Mint ERC-8004 NFT. One tx. Never again." },
            { n: "02", t: "ASSIGN SKILLS", d: "Run `byreal skill add [name]`. Each skill = condition + action. Set thresholds once." },
            { n: "03", t: "FUND", d: "Send MNT + USDC to wallet. Operating capital. Wallet manages it autonomously." },
          ].map((s) => (
            <div key={s.n} className="bg-background p-5 sm:p-6">
              <div className="font-display text-yellow text-3xl">{s.n}</div>
              <div className="font-display text-foreground mt-2 text-base sm:text-lg">{s.t}</div>
              <div className="font-mono text-[11px] text-muted-foreground mt-2 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Timeline() {
  const colorClass: Record<FeedColor, string> = {
    yellow: "text-yellow border-yellow",
    cyan: "text-cyan border-cyan",
    green: "text-green border-green",
    orange: "text-orange border-orange",
    red: "text-red border-red",
    purple: "text-purple border-purple",
  };

  return (
    <ol className="mt-4 relative max-h-[480px] overflow-y-auto pr-1">
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {FEED.map((f, i) => (
        <li key={i} className="feed-item relative pl-6 py-2.5 border-b border-border/40 last:border-b-0">
          <span
            className={`absolute left-0 top-3.5 w-[15px] h-[15px] border-2 ${colorClass[f.color as FeedColor]} bg-background rounded-full`}
            style={{ boxShadow: "0 0 0 3px var(--background)" }}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className={`font-mono text-[11px] font-medium ${colorClass[f.color as FeedColor].split(" ")[0]}`}>
              {f.action}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{f.t}</span>
          </div>
          <div className="font-mono text-[10px] text-foreground/80 mt-1">
            {f.wallet}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground mt-0.5 break-all">
            {f.detail}
          </div>
        </li>
      ))}
    </ol>
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
      <div
        className={`mt-1 ${mono ? "font-mono" : "font-display"} ${
          small ? "text-sm break-all" : "text-xl sm:text-2xl"
        } ${color}`}
      >
        {value}
      </div>
      {sub && <div className="font-mono text-[10px] text-muted-foreground mt-0.5 break-all">{sub}</div>}
    </div>
  );
}

function SectionHead({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        {">"} {label}
      </div>
      {hint && (
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hidden sm:block text-right">
          {hint}
        </div>
      )}
    </div>
  );
}
