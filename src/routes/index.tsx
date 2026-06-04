import { createFileRoute } from "@tanstack/react-router";
import { useAccount, useChainId } from "wagmi";
import { Tag } from "@/components/Tag";
import { NodeGraph } from "@/components/NodeGraph";
import { ContractHealthPanel } from "@/components/ContractHealthPanel";
import { type FeedColor, type FeedItem } from "@/lib/types";
import { WalletSkillsPanel } from "@/components/WalletSkillsPanel";
import { useAgentDecisions, useLatestExecutions, useWalletDetail } from "@/lib/api";
import { useOnchainAgentStatus } from "@/hooks/useOnchainAgentStatus";

export const Route = createFileRoute("/")({
  component: MyWallet,
  head: () => ({
    meta: [
      { title: "My Wallet · MemeAutonom" },
      {
        name: "description",
        content:
          "Watch an agent wallet build identity, skill history, execution records, and reputation on Mantle.",
      },
    ],
  }),
});

function shortAddr(a?: string) {
  if (!a) return "—";
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

function MyWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const onchain = useOnchainAgentStatus(address);
  const { data: wallet } = useWalletDetail(address);
  const { data: feed = [] } = useLatestExecutions(20);
  const { data: decisions = [] } = useAgentDecisions();

  const displayAddr = shortAddr(address);
  const ercId = wallet ? `AGENT-ID · ${wallet.addr}` : "AGENT-ID · —";
  const walletRole = wallet?.role ?? "—";
  const networkLabel =
    chainId === 5000 ? "Mantle 5000" : chainId === 5003 ? "Mantle Sepolia 5003" : "Mantle";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="panel scanline relative p-5 sm:p-8 md:p-10 overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-5">
          <Tag color="green" dot>
            LIVE
          </Tag>
          <Tag color="cyan">{ercId}</Tag>
          <Tag color="red">POLICY-LIMITED</Tag>
          <Tag color="yellow">{walletRole}</Tag>
          {isConnected && <Tag color="green">CONNECTED</Tag>}
        </div>

        <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 md:gap-10 md:items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              your agentic wallet · activated {wallet?.since ?? "—"}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-6xl leading-[0.95] text-foreground">
              Give agents an{" "}
              <span className="font-serif-italic text-yellow font-normal">identity</span>.
              <br />
              Record what they <span className="font-serif-italic text-yellow font-normal">do</span>
              .
              <br />
              <span className="text-muted-foreground">Rank them by proof.</span>
            </h1>
            <div className="font-mono text-xs text-muted-foreground mt-5 max-w-lg leading-relaxed">
              MemeAutonom turns each agent wallet into a verifiable record: identity metadata,
              installed skills, bounded executions, event history, and reputation from indexed
              Mantle activity.
            </div>
          </div>

          <div className="space-y-3">
            <Stat label="ADDRESS" value={displayAddr} mono color="text-foreground" small />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="REPUTATION" value={(wallet?.rep ?? 0).toString()} color="text-yellow" />
              <Stat label="JOBS DONE" value={(wallet?.jobs ?? 0).toString()} color="text-cyan" />
              <Stat
                label="EARNED USDC"
                value={(wallet?.vol ?? 0).toLocaleString()}
                color="text-green"
              />
              <Stat
                label={isConnected ? "NETWORK" : "BALANCE"}
                value={isConnected ? networkLabel : "0 USDC"}
                sub={
                  isConnected
                    ? onchain.balance
                      ? `${Number(onchain.balance.formatted).toFixed(4)} ${onchain.balance.symbol}`
                      : "—"
                    : "0 MNT"
                }
                color="text-foreground"
              />
            </div>
          </div>
        </div>
      </section>

      {isConnected && <OnchainStatusPanel status={onchain} />}

      <ContractHealthPanel compact />

      {/* Skills row */}
      <section className="panel p-5 sm:p-6">
        <SectionHead label="SKILLS_INSTALLED" hint="bounded modules · runtime-executed" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-4">
          {(wallet?.skills ?? []).length === 0 ? (
            <div className="col-span-full font-mono text-[11px] text-muted-foreground py-8 text-center border border-dashed border-border">
              no installed skills indexed for this wallet yet
            </div>
          ) : (
            wallet!.skills.map((s) => (
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
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {s.fires} fires
                  </span>
                </div>
                <div className="font-display text-sm sm:text-base text-foreground break-all">
                  {s.name}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1.5 uppercase tracking-[0.12em]">
                  policy-bound
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Live skills + reputation from indexer */}
      <section className="panel p-5 sm:p-6">
        <SectionHead label="WALLET_SKILLS_LIVE" hint="indexer · agent reputation" />
        <div className="mt-4">
          <WalletSkillsPanel mode="me" />
        </div>
      </section>

      {/* Node graph + timeline */}
      <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="panel p-5 sm:p-6">
          <SectionHead label="WALLET_NODE_GRAPH" hint="USDC packets · highlighted = your wallet" />
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
          <SectionHead label="EXECUTION_TIMELINE" hint="indexed actions · wallet history" />
          <Timeline feed={feed} />
        </div>
      </section>

      {/* Decision log */}
      <section className="panel p-5 sm:p-6">
        <SectionHead label="DECISION_LOG" hint="runtime reasoning · policy checks" />
        <div className="mt-4 max-h-[420px] overflow-y-auto font-mono text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
          {decisions.length === 0 ? (
            <div className="border border-dashed border-border py-8 text-center">
              no runtime decisions yet · configure VITE_AGENT_URL and start agent:runtime
            </div>
          ) : (
            decisions.map((d, i) => (
              <div key={`${d.ts}-${i}`} className="border-b border-border/40 py-1">
                <span className="text-cyan">[{d.ts}]</span>{" "}
                <span className="text-foreground">{d.phase ?? "decision"}</span>
                {d.source && <span> · {d.source}</span>}
                {d.wallet && <span> · wallet={d.wallet}</span>}
                {d.skillId && <span> · skill={d.skillId}</span>}
                {d.actionHash && <span> · action={d.actionHash}</span>}
                {d.txHash && <span className="text-green"> · tx={d.txHash}</span>}
                {d.error && <span className="text-red"> · {d.error}</span>}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 3 actions reminder */}
      <section className="panel p-5 sm:p-6">
        <SectionHead label="AGENT_WALLET_SETUP" hint="minimum beta flow" />
        <div className="grid md:grid-cols-3 gap-px mt-4 bg-border">
          {[
            {
              n: "01",
              t: "ACTIVATE",
              d: "Deploy an agent wallet on Mantle and register identity metadata for indexing.",
            },
            {
              n: "02",
              t: "INSTALL SKILL",
              d: "Install one bounded skill with explicit targets, limits, and runtime policy checks.",
            },
            {
              n: "03",
              t: "FUND",
              d: "Fund with capped MNT or USDC, run the agent, and index every emitted execution event.",
            },
          ].map((s) => (
            <div key={s.n} className="bg-background p-5 sm:p-6">
              <div className="font-display text-yellow text-3xl">{s.n}</div>
              <div className="font-display text-foreground mt-2 text-base sm:text-lg">{s.t}</div>
              <div className="font-mono text-[11px] text-muted-foreground mt-2 leading-relaxed">
                {s.d}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type OnchainStatus = ReturnType<typeof useOnchainAgentStatus>;

function OnchainStatusPanel({ status }: { status: OnchainStatus }) {
  const chainName =
    status.chainId === 5000
      ? "Mantle Mainnet"
      : status.chainId === 5003
        ? "Mantle Sepolia"
        : `Chain ${status.chainId}`;
  const contractsReady = status.hasConfiguredContracts;
  const identityStatus = status.hasIdentity ? `#${status.identityId.toString()}` : "not registered";

  return (
    <section className="panel p-5 sm:p-6">
      <SectionHead
        label="ONCHAIN_WALLET_STATUS"
        hint="direct RPC reads · no mocked connected-wallet data"
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="CHAIN" value={chainName} color="text-cyan" small />
        <Stat
          label="LATEST BLOCK"
          value={status.blockNumber ? status.blockNumber.toLocaleString() : "—"}
          color="text-foreground"
        />
        <Stat
          label="MNT BALANCE"
          value={
            status.balance
              ? `${Number(status.balance.formatted).toFixed(4)} ${status.balance.symbol}`
              : "—"
          }
          color="text-green"
          small
        />
        <Stat
          label="CONTRACTS"
          value={contractsReady ? "configured" : "missing env"}
          color={contractsReady ? "text-green" : "text-red"}
          small
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <StatusLine label="ERC-8004 identity" value={identityStatus} ok={status.hasIdentity} />
        <StatusLine
          label="Controller"
          value={status.controller ?? "not set"}
          ok={Boolean(status.controller)}
        />
        <StatusLine
          label="Reputation"
          value={
            status.score === undefined
              ? "not readable"
              : `${status.score.toString()} · ${status.recordCount?.toString() ?? "0"} records`
          }
          ok={status.score !== undefined}
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <StatusLine
          label="Identity registry"
          value={status.identityAddress ?? "VITE_IDENTITY_ADDRESS missing"}
          ok={Boolean(status.identityAddress)}
        />
        <StatusLine
          label="Reputation registry"
          value={status.reputationAddress ?? "VITE_REPUTATION_ADDRESS missing"}
          ok={Boolean(status.reputationAddress)}
        />
        <StatusLine
          label="Factory predicted wallet"
          value={status.predictedWallet ?? "VITE_WALLET_FACTORY_ADDRESS missing"}
          ok={Boolean(status.predictedWallet)}
        />
      </div>
    </section>
  );
}

function StatusLine({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="border border-border bg-black/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ok ? "bg-green" : "bg-orange"}`} />
      </div>
      <div className="mt-1 break-all font-mono text-[11px] text-foreground">{value}</div>
    </div>
  );
}

function Timeline({ feed }: { feed: FeedItem[] }) {
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
      {feed.length === 0 ? (
        <li className="font-mono text-[11px] text-muted-foreground py-8 text-center">
          no indexed executions yet
        </li>
      ) : (
        feed.map((f, i) => (
          <li
            key={i}
            className="feed-item relative pl-6 py-2.5 border-b border-border/40 last:border-b-0"
          >
            <span
              className={`absolute left-0 top-3.5 w-[15px] h-[15px] border-2 ${colorClass[f.color as FeedColor]} bg-background rounded-full`}
              style={{ boxShadow: "0 0 0 3px var(--background)" }}
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`font-mono text-[11px] font-medium ${colorClass[f.color as FeedColor].split(" ")[0]}`}
              >
                {f.action}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{f.t}</span>
            </div>
            <div className="font-mono text-[10px] text-foreground/80 mt-1">{f.wallet}</div>
            <div className="font-mono text-[10px] text-muted-foreground mt-0.5 break-all">
              {f.detail}
            </div>
          </li>
        ))
      )}
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
      {sub && (
        <div className="font-mono text-[10px] text-muted-foreground mt-0.5 break-all">{sub}</div>
      )}
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
