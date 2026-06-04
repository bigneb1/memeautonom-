import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { isAddress, type Address } from "viem";
import { Tag } from "@/components/Tag";
import { NodeGraph } from "@/components/NodeGraph";
import { useOnchainAgentStatus } from "@/hooks/useOnchainAgentStatus";
import {
  configuredMantleChainId,
  mantleExplorerAddress,
  mantleExplorerTx,
  useWalletDetail,
} from "@/lib/api";

export const Route = createFileRoute("/wallet/$address")({
  component: WalletPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.address} · MemeAutonom` },
      {
        name: "description",
        content: "Indexed identity, skills, reputation, and execution history for an agent wallet.",
      },
    ],
  }),
});

function WalletPage() {
  const { address } = Route.useParams();
  const normalizedAddress = isAddress(address) ? (address as Address) : undefined;
  const onchain = useOnchainAgentStatus(normalizedAddress);
  const { data: wallet, isLoading } = useWalletDetail(address);
  const chainId = configuredMantleChainId();

  if (isLoading) {
    return <Empty title="LOADING WALLET" body="Querying indexed identity and execution history." />;
  }

  if (!wallet) return <UnindexedWallet address={address} onchain={onchain} chainId={chainId} />;

  const roleColor =
    wallet.role === "SCOUT" ? "yellow" : wallet.role === "EXECUTOR" ? "cyan" : "purple";

  return (
    <div className="space-y-6">
      <section className="panel scanline p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Tag color="green" dot>
            INDEXED
          </Tag>
          <Tag color={roleColor as "cyan"}>{wallet.role}</Tag>
          <Tag color="red">POLICY-LIMITED</Tag>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              agent wallet
            </div>
            <h1 className="mt-2 break-all font-display text-3xl leading-none text-foreground sm:text-5xl">
              {wallet.addr}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={mantleExplorerAddress(wallet.addr, chainId)}
                target="_blank"
                rel="noreferrer"
                className="tag border-yellow/60 text-yellow hover:bg-yellow/10"
              >
                MANTLESCAN ADDRESS
              </a>
              <Link to="/leaderboard" className="tag text-muted-foreground hover:text-yellow">
                BACK TO LEADERBOARD
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <Stat label="REPUTATION" value={wallet.rep.toLocaleString()} color="text-yellow" />
            <Stat label="AUTONOMY" value={`${wallet.autonomy}%`} color="text-cyan" />
            <Stat label="JOBS" value={wallet.jobs.toLocaleString()} color="text-green" />
            <Stat label="VOLUME USDC" value={wallet.vol.toLocaleString()} color="text-green" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-5 sm:p-6">
          <Head label="WALLET_GRAPH" hint="indexed wallet context" />
          <div className="mt-4 aspect-[16/10] border border-border bg-black/40">
            <NodeGraph highlight={wallet.addr} wallets={[wallet]} />
          </div>
        </div>
        <div className="panel p-5 sm:p-6">
          <Head label="SKILLS" hint={`${wallet.skills.length} installed`} />
          <div className="mt-4 space-y-2">
            {wallet.skills.length === 0 ? (
              <EmptyInline>No skills installed for this wallet.</EmptyInline>
            ) : (
              wallet.skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between gap-3 border border-border bg-black/40 p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-display text-base text-foreground">
                      {skill.name}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      indexed skill module
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`tag ${
                        skill.status === "active"
                          ? "border-cyan/60 text-cyan"
                          : "border-orange/60 text-orange"
                      }`}
                    >
                      {skill.status}
                    </span>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {skill.fires} fires
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <OnchainCard address={wallet.addr} onchain={onchain} chainId={chainId} />

      <section className="panel p-5 sm:p-6">
        <Head label="EXECUTION_HISTORY" hint="latest indexed events" />
        <div className="mt-4 overflow-x-auto">
          {wallet.recent.length === 0 ? (
            <EmptyInline>No executions indexed for this wallet.</EmptyInline>
          ) : (
            <table className="w-full min-w-[720px] font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border text-left uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Detail</th>
                  <th className="py-2 pr-4">Explorer</th>
                </tr>
              </thead>
              <tbody>
                {wallet.recent.map((event, i) => (
                  <tr key={`${event.tx}-${i}`} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-muted-foreground">{event.t}</td>
                    <td className={`py-2.5 pr-4 text-${event.color}`}>{event.action}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{event.detail}</td>
                    <td className="py-2.5 pr-4">
                      {event.tx ? (
                        <a
                          href={mantleExplorerTx(event.tx, chainId)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan hover:text-yellow"
                        >
                          {event.tx}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-border bg-black/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-xl ${color}`}>{value}</div>
    </div>
  );
}

type OnchainStatus = ReturnType<typeof useOnchainAgentStatus>;

function UnindexedWallet({
  address,
  onchain,
  chainId,
}: {
  address: string;
  onchain: OnchainStatus;
  chainId: number;
}) {
  return (
    <div className="space-y-6">
      <section className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Tag color="orange">NOT INDEXED</Tag>
          {onchain.hasIdentity && <Tag color="green">ONCHAIN IDENTITY</Tag>}
        </div>
        <h1 className="mt-4 break-all font-display text-3xl leading-none text-foreground sm:text-5xl">
          {address}
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
          This wallet is not present in the configured Envio indexer yet. Direct RPC reads below
          still show whether it has an ERC-8004 identity, reputation records, and a Mantle balance.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={mantleExplorerAddress(address, chainId)}
            target="_blank"
            rel="noreferrer"
            className="tag border-yellow/60 text-yellow hover:bg-yellow/10"
          >
            MANTLESCAN ADDRESS
          </a>
          <Link to="/demo" className="tag text-muted-foreground hover:text-yellow">
            OPEN DEMO
          </Link>
        </div>
      </section>
      <OnchainCard address={address} onchain={onchain} chainId={chainId} />
    </div>
  );
}

function OnchainCard({
  address,
  onchain,
  chainId,
}: {
  address: string;
  onchain: OnchainStatus;
  chainId: number;
}) {
  const identity = onchain.hasIdentity ? `#${onchain.identityId.toString()}` : "not registered";
  return (
    <section className="panel p-5 sm:p-6">
      <Head label="DIRECT_ONCHAIN_READS" hint="Mantle RPC · registry contracts" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OnchainMini
          label="MNT balance"
          value={
            onchain.balance
              ? `${Number(onchain.balance.formatted).toFixed(4)} ${onchain.balance.symbol}`
              : "—"
          }
          ok={Boolean(onchain.balance)}
        />
        <OnchainMini label="Identity" value={identity} ok={onchain.hasIdentity} />
        <OnchainMini
          label="Controller"
          value={onchain.controller ?? "not set"}
          ok={Boolean(onchain.controller)}
        />
        <OnchainMini
          label="Reputation"
          value={
            onchain.score === undefined
              ? "not readable"
              : `${onchain.score.toString()} · ${onchain.recordCount?.toString() ?? "0"} records`
          }
          ok={onchain.score !== undefined}
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <OnchainMini
          label="Identity registry"
          value={onchain.identityAddress ?? "missing"}
          ok={Boolean(onchain.identityAddress)}
        />
        <OnchainMini
          label="Reputation registry"
          value={onchain.reputationAddress ?? "missing"}
          ok={Boolean(onchain.reputationAddress)}
        />
        <OnchainMini
          label="Explorer"
          value={mantleExplorerAddress(address, chainId)}
          ok
          href={mantleExplorerAddress(address, chainId)}
        />
      </div>
    </section>
  );
}

function OnchainMini({
  label,
  value,
  ok,
  href,
}: {
  label: string;
  value: string;
  ok: boolean;
  href?: string;
}) {
  const content = (
    <div className="mt-1 break-all font-mono text-[11px] text-foreground">{value}</div>
  );
  return (
    <div className="border border-border bg-black/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green" : "bg-orange"}`} />
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="hover:text-yellow">
          {content}
        </a>
      ) : (
        content
      )}
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
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel p-8 text-center">
      <div className="font-display text-xl text-yellow">{title}</div>
      <div className="mx-auto mt-2 max-w-md font-mono text-xs text-muted-foreground">{body}</div>
    </div>
  );
}

function EmptyInline({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-border py-8 text-center font-mono text-[11px] text-muted-foreground">
      {children}
    </div>
  );
}
