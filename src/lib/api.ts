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
} from "./mock";

export const INDEXER_URL = getConfig().indexerUrl;

export const indexerClient = INDEXER_URL
  ? new GraphQLClient(INDEXER_URL)
  : null;

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

// ---------- response types (loose; subgraph naming may differ) ----------

type RawSkill = WalletSkill;
type RawExecution = {
  timestamp: number | string;
  action: string;
  detail: string;
  txHash: string;
  color: Execution["color"];
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
    since: w.activatedAt,
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

// ---------- hooks ----------

export function useWalletDetail(addr?: string | null) {
  return useQuery({
    queryKey: ["walletDetail", addr],
    enabled: !!addr && !!indexerClient,
    queryFn: async (): Promise<WalletDetail | null> => {
      if (!indexerClient || !addr) return null;
      const res = await indexerClient.request<{ wallet: RawWallet | null }>(
        WALLET_DETAIL_QUERY,
        { addr: addr.toLowerCase() }
      );
      return res.wallet ? toWalletDetail(res.wallet) : null;
    },
    staleTime: 15_000,
  });
}

export function useLeaderboard(first = 25) {
  return useQuery({
    queryKey: ["leaderboard", first],
    enabled: !!indexerClient,
    queryFn: async (): Promise<WalletDetail[]> => {
      if (!indexerClient) return [];
      const res = await indexerClient.request<{ wallets: RawWallet[] }>(
        LEADERBOARD_QUERY,
        { first }
      );
      return res.wallets.map(toWalletDetail);
    },
    staleTime: 15_000,
  });
}
