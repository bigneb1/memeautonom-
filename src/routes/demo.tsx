import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { AgentStatusWidget } from "@/components/AgentStatusWidget";
import { ContractHealthPanel } from "@/components/ContractHealthPanel";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { NodeGraph } from "@/components/NodeGraph";
import { Tag } from "@/components/Tag";
import { useOnchainAgentStatus } from "@/hooks/useOnchainAgentStatus";
import { getConfig } from "@/lib/config";
import { useEconomyStats, useLatestExecutions, useLeaderboard } from "@/lib/api";
import { useContractHealth } from "@/hooks/useContractHealth";

export const Route = createFileRoute("/demo")({
  component: Demo,
  head: () => ({
    meta: [
      { title: "Demo · MemeAutonom" },
      {
        name: "description",
        content: "Presentation demo for MemeAutonom's on-chain agent wallet workflow.",
      },
    ],
  }),
});

function Demo() {
  const { address, isConnected } = useAccount();
  const cfg = getConfig();
  const onchain = useOnchainAgentStatus(address);
  const contractHealth = useContractHealth();
  const { data: stats } = useEconomyStats();
  const { data: wallets = [] } = useLeaderboard(6);
  const { data: executions = [] } = useLatestExecutions(8);
  const readyChecks = [
    isConnected,
    onchain.chainId === cfg.mantleChainId,
    contractHealth.ready,
    Boolean(cfg.indexerUrl),
    Boolean(cfg.agentUrl),
  ];
  const readyCount = readyChecks.filter(Boolean).length;

  return (
    <div className="space-y-6">
      <section className="panel scanline overflow-hidden p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Tag color="green" dot>
            PRESENTATION MODE
          </Tag>
          <Tag color="cyan">REAL RPC READS</Tag>
          <Tag color="red">NO GENERIC EXECUTE</Tag>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <h1 className="font-display text-4xl leading-[0.95] text-foreground sm:text-5xl md:text-6xl">
              Agent wallets with{" "}
              <span className="font-serif-italic font-normal text-yellow">proof</span>, not trust.
            </h1>
            <p className="mt-4 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
              Use this screen for a live walkthrough: connect wallet, verify chain and contracts,
              activate an agent wallet, install a bounded skill, run the agent, and inspect indexed
              execution history.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Big label="READINESS" value={`${readyCount}/5`} color="text-yellow" />
            <Big
              label="NETWORK"
              value={cfg.mantleChainId === 5000 ? "MAINNET" : "SEPOLIA"}
              color={cfg.mantleChainId === 5000 ? "text-red" : "text-cyan"}
            />
            <Big
              label="CONTRACTS"
              value={`${contractHealth.passed}/${contractHealth.total}`}
              color={contractHealth.ready ? "text-green" : "text-orange"}
            />
            <Big
              label="INDEXED WALLETS"
              value={(stats?.activeWallets ?? wallets.length).toLocaleString()}
              color="text-green"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <Check
          title="Connect"
          ok={isConnected}
          value={isConnected ? short(address) : "waiting"}
          cta={<span>Wallet identity is read from the connected address.</span>}
        />
        <Check
          title="Network"
          ok={onchain.chainId === cfg.mantleChainId}
          value={`wallet ${onchain.chainId} · target ${cfg.mantleChainId}`}
          cta={<span>Switch to the configured Mantle chain before presenting live writes.</span>}
        />
        <Check
          title="Contracts"
          ok={contractHealth.ready}
          value={`${contractHealth.passed}/${contractHealth.total} checks`}
          cta={<span>Build-time contract envs are verified by the production health panel.</span>}
        />
        <Check
          title="Indexer"
          ok={Boolean(cfg.indexerUrl)}
          value={cfg.indexerUrl ? "configured" : "not configured"}
          cta={<span>Railway Envio service should expose GraphQL for public views.</span>}
        />
        <Check
          title="Runtime"
          ok={Boolean(cfg.agentUrl)}
          value={cfg.agentUrl ? "configured" : "not configured"}
          cta={<span>Railway agent runtime should expose health and decisions endpoints.</span>}
        />
      </section>

      <ContractHealthPanel />

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-5 sm:p-6">
          <Head label="LIVE_WALLET_READS" hint="connected wallet · Mantle RPC" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Mini label="Wallet" value={address ?? "connect wallet"} />
            <Mini
              label="MNT balance"
              value={
                onchain.balance
                  ? `${Number(onchain.balance.formatted).toFixed(4)} ${onchain.balance.symbol}`
                  : "—"
              }
            />
            <Mini
              label="ERC-8004 identity"
              value={onchain.hasIdentity ? `#${onchain.identityId.toString()}` : "not registered"}
            />
            <Mini label="Controller" value={onchain.controller ?? "not set"} />
            <Mini
              label="Reputation"
              value={
                onchain.score === undefined
                  ? "not readable"
                  : `${onchain.score.toString()} score · ${onchain.recordCount?.toString() ?? "0"} records`
              }
            />
            <Mini
              label="Predicted agent wallet"
              value={onchain.predictedWallet ?? "factory missing"}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/activate" className="tag border-yellow/60 text-yellow hover:bg-yellow/10">
              ACTIVATE_AGENT_WALLET
            </Link>
            <Link to="/bootstrap" className="tag border-cyan/60 text-cyan hover:bg-cyan/10">
              BOOTSTRAP_POLICY
            </Link>
            <Link to="/economy" className="tag text-muted-foreground hover:text-yellow">
              OPEN_ECONOMY_VIEW
            </Link>
          </div>
        </div>

        <div className="panel p-5 sm:p-6">
          <Head label="DEMO_SCRIPT" hint="4 minute product walkthrough" />
          <ol className="mt-4 space-y-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
            <Step
              n="01"
              text="Connect the presenter wallet and show real MNT balance, block, identity, and reputation reads."
            />
            <Step
              n="02"
              text="Open Activate, deploy or predict an agent wallet, then verify the emitted identity in the indexer."
            />
            <Step
              n="03"
              text="Open Bootstrap, install one skill and set target, selector, max-call, and daily spend policy."
            />
            <Step
              n="04"
              text="Run the Railway agent runtime, show decisions, then open wallet detail from graph or leaderboard."
            />
          </ol>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="panel p-5 sm:p-6">
          <Head label="WALLET_GRAPH" hint="click nodes for Arkham-style wallet detail" />
          <div className="mt-4 aspect-[16/10] overflow-hidden border border-border bg-black/40">
            <NodeGraph highlight={address} wallets={wallets} />
          </div>
        </div>
        <div className="panel p-5 sm:p-6">
          <Head label="RECENT_EXECUTIONS" hint="indexed on-chain events" />
          <div className="mt-4 max-h-[360px] space-y-1.5 overflow-y-auto">
            {executions.length === 0 ? (
              <Empty text="No indexed executions yet. Start Envio on Railway after contracts are deployed." />
            ) : (
              executions.map((event, i) => (
                <div
                  key={`${event.wallet}-${event.t}-${i}`}
                  className="border-b border-border/40 py-2"
                >
                  <div className="flex items-center justify-between gap-3 font-mono text-[10px]">
                    <span className="text-cyan">{event.action}</span>
                    <span className="text-muted-foreground">{event.t}</span>
                  </div>
                  <Link
                    to="/wallet/$address"
                    params={{ address: event.wallet }}
                    className="mt-1 block break-all font-mono text-[10px] text-foreground hover:text-yellow"
                  >
                    {event.wallet}
                  </Link>
                  <div className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
                    {event.detail}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <AgentStatusWidget />
        <DiagnosticsPanel />
      </section>
    </div>
  );
}

function Check({
  title,
  ok,
  value,
  cta,
}: {
  title: string;
  ok: boolean;
  value: string;
  cta: ReactNode;
}) {
  return (
    <div className={`panel p-4 ${ok ? "border-green/50" : "border-orange/50"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-base text-foreground">{title}</div>
        <span className={`h-2 w-2 rounded-full ${ok ? "bg-green" : "bg-orange"}`} />
      </div>
      <div className="mt-2 break-all font-mono text-[11px] text-cyan">{value}</div>
      <div className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">{cta}</div>
    </div>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex gap-3 border-b border-border/40 pb-3 last:border-b-0">
      <span className="font-display text-xl text-yellow">{n}</span>
      <span>{text}</span>
    </li>
  );
}

function Big({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-border bg-black/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl ${color}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-black/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-all font-mono text-[11px] text-foreground">{value}</div>
    </div>
  );
}

function Head({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        {">"} {label}
      </div>
      {hint && (
        <div className="hidden text-right font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
          {hint}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-border py-8 text-center font-mono text-[11px] text-muted-foreground">
      {text}
    </div>
  );
}

function short(address?: string) {
  if (!address) return "waiting";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
