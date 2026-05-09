// All demo data removed. This module now only exports types and empty
// stubs so the UI keeps its shape and types compile. Wire real data from
// on-chain reads (wagmi/viem) and your indexer in the routes/components
// that consume these exports.

export type SkillStatus = "active" | "paused";
export type FeedColor = "yellow" | "cyan" | "green" | "orange" | "red" | "purple";

export type WalletSkill = { name: string; status: SkillStatus; fires: number };

export type Execution = {
  t: string;
  action: string;
  detail: string;
  tx: string;
  color: FeedColor;
};

export type WalletDetail = {
  addr: string;
  role: "SCOUT" | "EXECUTOR" | "VERIFIER";
  rep: number;
  jobs: number;
  vol: number;
  autonomy: number;
  since: string;
  skills: WalletSkill[];
  recent: Execution[];
};

export type FeedItem = {
  t: string;
  wallet: string;
  action: string;
  detail: string;
  color: FeedColor;
};

export type WalletRow = {
  addr: string;
  role: "SCOUT" | "EXECUTOR" | "VERIFIER";
  rep: number;
  autonomy: number;
  vol: number;
  jobs: number;
  since: string;
};

export type SkillListing = {
  name: string;
  desc: string;
  fires: string;
  role: "SCOUT" | "EXECUTOR" | "VERIFIER";
  installs: number;
  cli: string;
};

// ---------- Empty stubs (no demo data) ----------

export const MY_WALLET = {
  address: "—",
  fullAddress: "",
  ercId: "ERC-8004 · —",
  reputation: 0,
  jobsCompleted: 0,
  totalEarned: 0,
  activatedAt: "—",
  balance: { usdc: 0, mnt: 0 },
  role: "—",
  skills: [] as WalletSkill[],
};

export const FEED: FeedItem[] = [];
export const DECISION_LOG: string[] = [];

export const ECONOMY_STATS = {
  activeWallets: 0,
  jobsToday: 0,
  usdcSettled: 0,
  avgDecisionTime: 0,
};

export const WALLETS: WalletRow[] = [];
export const SKILLS_MARKET: SkillListing[] = [];

export function getWalletDetail(w: WalletRow): WalletDetail {
  return { ...w, skills: [], recent: [] };
}
