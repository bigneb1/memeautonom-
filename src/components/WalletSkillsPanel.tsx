import { useAccount } from "wagmi";
import { Tag } from "./Tag";
import { useWalletDetail, useLeaderboard, getIndexerUrl } from "@/lib/api";
import type { WalletDetail, WalletSkill } from "@/lib/types";

/**
 * WalletSkillsPanel
 * Reads per-wallet skill installs + reputation from the indexer
 * (see INTEGRATION.md §4.4 WalletDetail / Leaderboard queries) and
 * renders a per-wallet skills view.
 *
 * Two modes:
 *  - mode="me"   → shows the connected wallet
 *  - mode="top"  → shows the top N wallets and their installed skills
 */
export function WalletSkillsPanel({
  mode = "me",
  limit = 6,
}: {
  mode?: "me" | "top";
  limit?: number;
}) {
  if (!getIndexerUrl()) {
    return (
      <Empty
        title="SKILLS_FEED · OFFLINE"
        body="Set VITE_INDEXER_URL to your subgraph / Envio / custom indexer endpoint to stream per-wallet skill installs and reputation. See INTEGRATION.md §4."
      />
    );
  }

  return mode === "me" ? <MeView /> : <TopView limit={limit} />;
}

function MeView() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, isError } = useWalletDetail(address);

  if (!isConnected) {
    return (
      <Empty
        title="CONNECT WALLET"
        body="Connect an agentic wallet to see its installed skills, fire counts and on-chain reputation."
      />
    );
  }
  if (isLoading) return <Empty title="LOADING…" body="Querying indexer." />;
  if (isError || !data) {
    return (
      <Empty
        title="NO RECORD"
        body="Indexer has no skills/reputation entries for this wallet yet."
      />
    );
  }

  return <WalletSkillsCard wallet={data} highlight />;
}

function TopView({ limit }: { limit: number }) {
  const { data = [], isLoading } = useLeaderboard(limit);
  if (isLoading) return <Empty title="LOADING…" body="Querying indexer." />;
  if (data.length === 0) {
    return (
      <Empty
        title="NO WALLETS INDEXED"
        body="No agentic wallets have published skills via SkillRegistry yet."
      />
    );
  }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {data.map((w) => (
        <WalletSkillsCard key={w.addr} wallet={w} />
      ))}
    </div>
  );
}

function WalletSkillsCard({ wallet, highlight }: { wallet: WalletDetail; highlight?: boolean }) {
  const roleColor =
    wallet.role === "SCOUT" ? "yellow" : wallet.role === "EXECUTOR" ? "cyan" : "purple";
  const totalFires = wallet.skills.reduce((s, k) => s + k.fires, 0);

  return (
    <div className={`panel p-4 sm:p-5 ${highlight ? "border-yellow/50" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Tag color={roleColor as "cyan"}>{wallet.role}</Tag>
          <Tag color="cyan">AGENT IDENTITY</Tag>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground shrink-0">
          {wallet.skills.length} skills · {totalFires} fires
        </div>
      </div>

      <div className="font-mono text-[11px] text-foreground break-all">{wallet.addr}</div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Mini label="REP" value={wallet.rep.toLocaleString()} color="text-yellow" />
        <Mini label="AUTONOMY" value={`${wallet.autonomy}%`} color="text-cyan" />
        <Mini label="JOBS" value={wallet.jobs.toLocaleString()} color="text-green" />
      </div>

      <div className="mt-4">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
          INSTALLED_SKILLS
        </div>
        {wallet.skills.length === 0 ? (
          <div className="font-mono text-[10px] text-muted-foreground border border-dashed border-border p-3">
            No skills installed.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {wallet.skills.map((s) => (
              <SkillRow key={s.name} skill={s} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SkillRow({ skill }: { skill: WalletSkill }) {
  return (
    <li className="flex items-center justify-between gap-3 border border-border bg-black/30 px-3 py-2">
      <div className="min-w-0">
        <div className="font-display text-sm text-foreground truncate">{skill.name}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          policy-bound · indexed
        </div>
      </div>
      <div className="text-right shrink-0">
        <span
          className={`tag ${
            skill.status === "active" ? "text-cyan border-cyan/60" : "text-orange border-orange/60"
          }`}
        >
          {skill.status === "active" && (
            <span className="w-1 h-1 rounded-full bg-current live-dot" />
          )}
          {skill.status}
        </span>
        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
          {skill.fires} fires
        </div>
      </div>
    </li>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-border bg-black/40 p-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className={`font-display text-base mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel p-6 text-center">
      <div className="font-display text-lg text-yellow">{title}</div>
      <div className="font-mono text-[11px] text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
        {body}
      </div>
    </div>
  );
}
