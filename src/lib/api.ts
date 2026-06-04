// GraphQL client for the MemeAutonom indexer (subgraph / Envio / custom).
// See INTEGRATION.md §4 for the schema. Until VITE_INDEXER_URL is set, all
// hooks return empty data so the UI shows its "awaiting indexer" state.

import { GraphQLClient, gql } from "graphql-request";
import { useQuery } from "@tanstack/react-query";
import { getConfig } from "./config";
import type {
  WalletRow,
  WalletSkill,
  Execution,
  WalletDetail,
  FeedItem,
  SkillListing,
} from "./types";

export function getIndexerUrl() {
  return getConfig().indexerUrl;
}

export const INDEXER_URL = getIndexerUrl();

function getIndexerClient() {
  const url = getIndexerUrl();
  return url ? new GraphQLClient(url) : null;
}

// ---------- queries (mirror INTEGRATION.md §4.4) ----------

const WALLET_DETAIL_QUERY = gql`
  query WalletDetail($addr: String!) {
    wallet(id: $addr) {
      address
      role
      reputation
      jobsCompleted
      volumeUsdc
      autonomyScore
      activatedAt
      skills {
        name
        status
        fires
      }
      executions(first: 20, orderBy: timestamp, orderDirection: desc) {
        timestamp
        action
        detail
        txHash
        color
      }
    }
  }
`;

const LEADERBOARD_QUERY = gql`
  query Leaderboard($first: Int!) {
    wallets(first: $first, orderBy: reputation, orderDirection: desc) {
      address
      role
      reputation
      jobsCompleted
      volumeUsdc
      autonomyScore
      activatedAt
      skills {
        name
        status
        fires
      }
    }
  }
`;

const ECONOMY_STATS_QUERY = gql`
  query EconomyStats {
    economyStat(id: "global") {
      activeWallets
      jobsToday
      usdcSettled
      avgDecisionMs
      updatedAt
    }
  }
`;

const LATEST_EXECUTIONS_QUERY = gql`
  query LatestExecutions($first: Int!) {
    executions(first: $first, orderBy: timestamp, orderDirection: desc) {
      timestamp
      action
      detail
      txHash
      color
      wallet {
        address
      }
    }
  }
`;

const SKILLS_QUERY = gql`
  query SkillsMarket($first: Int!) {
    skills(first: $first, orderBy: fires, orderDirection: desc) {
      name
      uri
      installs
      fires
      author {
        address
        role
      }
    }
  }
`;

// ---------- response types (loose; subgraph naming may differ) ----------

type RawSkill = WalletSkill;
type RawExecution = {
  timestamp: number | string;
  action: string;
  detail: string;
  txHash: string;
  color: Execution["color"];
  wallet?: {
    address: string;
  };
};
type RawWallet = {
  address: string;
  role: WalletRow["role"];
  reputation: number;
  jobsCompleted: number;
  volumeUsdc: number;
  autonomyScore: number;
  activatedAt: string;
  skills?: RawSkill[];
  executions?: RawExecution[];
};
type RawEconomyStat = {
  activeWallets: number | string;
  jobsToday: number | string;
  usdcSettled: number | string;
  avgDecisionMs: number | string;
  updatedAt: number | string;
};
type RawSkillListing = {
  name: string;
  uri: string;
  installs: number | string;
  fires: number | string;
  author?: {
    address: string;
    role: WalletRow["role"];
  };
};

export type EconomyStats = {
  activeWallets: number;
  jobsToday: number;
  usdcSettled: number;
  avgDecisionTime: number;
  updatedAt?: string;
};

export type AgentDecision = {
  ts: string;
  source?: string;
  phase?: string;
  wallet?: string;
  skillId?: string;
  actionHash?: string;
  txHash?: string;
  error?: string;
};

export function mantleExplorerAddress(address: string, chainId = 5003) {
  const base = chainId === 5000 ? "https://mantlescan.xyz" : "https://sepolia.mantlescan.xyz";
  return `${base}/address/${address}`;
}

export function mantleExplorerTx(txHash: string, chainId = 5003) {
  const base = chainId === 5000 ? "https://mantlescan.xyz" : "https://sepolia.mantlescan.xyz";
  return `${base}/tx/${txHash}`;
}

export function configuredMantleChainId() {
  return getConfig().mantleChainId;
}

const EMPTY_ECONOMY: EconomyStats = {
  activeWallets: 0,
  jobsToday: 0,
  usdcSettled: 0,
  avgDecisionTime: 0,
};

function toNumber(v: number | string | bigint | undefined | null) {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  if (!v) return 0;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

function relTime(ts: number | string) {
  const t = typeof ts === "string" ? parseInt(ts, 10) : ts;
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - t));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function toWalletRow(w: RawWallet): WalletRow {
  return {
    addr: w.address,
    role: w.role,
    rep: w.reputation,
    autonomy: w.autonomyScore,
    vol: w.volumeUsdc,
    jobs: w.jobsCompleted,
    since: relTime(w.activatedAt),
  };
}

function toWalletDetail(w: RawWallet): WalletDetail {
  return {
    ...toWalletRow(w),
    skills: w.skills ?? [],
    recent: (w.executions ?? []).map((e) => ({
      t: relTime(e.timestamp),
      action: e.action,
      detail: e.detail,
      tx: e.txHash,
      color: e.color,
    })),
  };
}

function toFeedItem(e: RawExecution): FeedItem {
  return {
    t: relTime(e.timestamp),
    wallet: e.wallet?.address ?? "unknown",
    action: e.action,
    detail: `${e.detail}${e.txHash ? ` · ${e.txHash.slice(0, 10)}` : ""}`,
    color: e.color,
  };
}

function toSkillListing(s: RawSkillListing): SkillListing {
  return {
    name: s.name,
    desc: s.uri ? `Metadata: ${s.uri}` : "Indexed bounded skill.",
    fires: toNumber(s.fires).toLocaleString(),
    role: s.author?.role ?? "EXECUTOR",
    installs: toNumber(s.installs),
    cli: `byreal skills install "${s.name}"`,
  };
}

// ---------- hooks ----------

export function useWalletDetail(addr?: string | null) {
  const indexerUrl = getIndexerUrl();
  return useQuery({
    queryKey: ["walletDetail", indexerUrl, addr],
    enabled: !!addr && !!indexerUrl,
    queryFn: async (): Promise<WalletDetail | null> => {
      const client = getIndexerClient();
      if (!client || !addr) return null;
      const res = await client.request<{ wallet: RawWallet | null }>(WALLET_DETAIL_QUERY, {
        addr: addr.toLowerCase(),
      });
      return res.wallet ? toWalletDetail(res.wallet) : null;
    },
    staleTime: 15_000,
  });
}

export function useLeaderboard(first = 25) {
  const indexerUrl = getIndexerUrl();
  return useQuery({
    queryKey: ["leaderboard", indexerUrl, first],
    enabled: !!indexerUrl,
    queryFn: async (): Promise<WalletDetail[]> => {
      const client = getIndexerClient();
      if (!client) return [];
      const res = await client.request<{ wallets: RawWallet[] }>(LEADERBOARD_QUERY, {
        first,
      });
      return res.wallets.map(toWalletDetail);
    },
    staleTime: 15_000,
  });
}

export function useEconomyStats() {
  const indexerUrl = getIndexerUrl();
  return useQuery({
    queryKey: ["economyStats", indexerUrl],
    enabled: !!indexerUrl,
    queryFn: async (): Promise<EconomyStats> => {
      const client = getIndexerClient();
      if (!client) return EMPTY_ECONOMY;
      const res = await client.request<{ economyStat: RawEconomyStat | null }>(ECONOMY_STATS_QUERY);
      if (!res.economyStat) return EMPTY_ECONOMY;
      return {
        activeWallets: toNumber(res.economyStat.activeWallets),
        jobsToday: toNumber(res.economyStat.jobsToday),
        usdcSettled: toNumber(res.economyStat.usdcSettled),
        avgDecisionTime: toNumber(res.economyStat.avgDecisionMs) / 1000,
        updatedAt: relTime(res.economyStat.updatedAt),
      };
    },
    staleTime: 15_000,
  });
}

export function useLatestExecutions(first = 20) {
  const indexerUrl = getIndexerUrl();
  return useQuery({
    queryKey: ["latestExecutions", indexerUrl, first],
    enabled: !!indexerUrl,
    queryFn: async (): Promise<FeedItem[]> => {
      const client = getIndexerClient();
      if (!client) return [];
      const res = await client.request<{ executions: RawExecution[] }>(LATEST_EXECUTIONS_QUERY, {
        first,
      });
      return res.executions.map(toFeedItem);
    },
    staleTime: 15_000,
  });
}

export function useSkillsMarket(first = 20) {
  const indexerUrl = getIndexerUrl();
  return useQuery({
    queryKey: ["skillsMarket", indexerUrl, first],
    enabled: !!indexerUrl,
    queryFn: async (): Promise<SkillListing[]> => {
      const client = getIndexerClient();
      if (!client) return [];
      const res = await client.request<{ skills: RawSkillListing[] }>(SKILLS_QUERY, { first });
      return res.skills.map(toSkillListing);
    },
    staleTime: 15_000,
  });
}

export function useAgentDecisions() {
  const cfg = getConfig();
  const baseUrl = cfg.agentUrl.replace(/\/$/, "");
  return useQuery({
    queryKey: ["agentDecisions", baseUrl],
    enabled: !!baseUrl,
    queryFn: async (): Promise<AgentDecision[]> => {
      const res = await fetch(`${baseUrl}/decisions`);
      if (!res.ok) throw new Error(`agent decisions HTTP ${res.status}`);
      const payload = (await res.json()) as { decisions?: AgentDecision[] };
      return payload.decisions ?? [];
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
