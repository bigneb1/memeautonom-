export const MY_WALLET = {
  address: "0x7Ae3...c91F",
  fullAddress: "0x7Ae3F2c1B8d4a90E5f6d2c1B8d4a90E5f6dc91F",
  ercId: "ERC-8004 #271",
  reputation: 847,
  jobsCompleted: 142,
  totalEarned: 2847.32,
  activatedAt: "2026-04-12 09:14:22 UTC",
  balance: { usdc: 312.45, mnt: 0.834 },
  role: "EXECUTOR",
  skills: [
    { name: "apy-scout", status: "active", fires: 47, color: "cyan" },
    { name: "lp-executor", status: "active", fires: 89, color: "cyan" },
    { name: "price-oracle", status: "active", fires: 312, color: "cyan" },
    { name: "rebalancer", status: "paused", fires: 6, color: "orange" },
  ],
};

export const FEED = [
  { t: "00:00:02", wallet: "0x7Ae3...c91F", action: "ACCEPTED_JOB", detail: "job#4821 · query MNT/USDC depth · bounty 1.20 USDC", color: "green" },
  { t: "00:00:14", wallet: "0x7Ae3...c91F", action: "EXECUTED", detail: "depth: 412k USDC @ 0.18% slippage · hash 0x88...2af", color: "cyan" },
  { t: "00:00:18", wallet: "0xC112...88aB", action: "VERIFIED", detail: "job#4821 · hashes match · payout released", color: "green" },
  { t: "00:00:21", wallet: "0x7Ae3...c91F", action: "EARNED", detail: "+1.20 USDC → balance 312.45", color: "green" },
  { t: "00:00:34", wallet: "0x9F22...41dC", action: "POSTED_JOB", detail: "job#4822 · scan APY pools > 8% · bounty 3.00 USDC", color: "yellow" },
  { t: "00:00:41", wallet: "0x7Ae3...c91F", action: "REINVEST", detail: "balance > 300 reserve · skill apy-scout fires", color: "purple" },
  { t: "00:00:47", wallet: "0x7Ae3...c91F", action: "POSTED_JOB", detail: "job#4823 · find LP arb on Mantle DEX · bounty 2.50 USDC", color: "yellow" },
  { t: "00:01:02", wallet: "0x4Bd8...1027", action: "ACCEPTED_JOB", detail: "job#4823 · ETA 8 min · stake 0.50 MNT", color: "cyan" },
  { t: "00:01:18", wallet: "0xE7c1...9912", action: "VERIFIED", detail: "job#4820 · result valid · payout 0.80 USDC", color: "green" },
  { t: "00:01:24", wallet: "0x7Ae3...c91F", action: "DECISION", detail: "skill price-oracle: MNT/USDC < threshold, no action", color: "orange" },
];

export const DECISION_LOG = [
  "[12:04:18] skill `apy-scout` checkCondition() → maxAPY=9.4% > threshold 8.0% → CONDITION_MET",
  "[12:04:18] skill `apy-scout` decideAction() → POST_JOB { bounty: 3.0 USDC, deadline: +10m }",
  "[12:04:19] wallet.execute() → tx 0x88c1...2af3 → confirmed (block 12,814,201)",
  "[12:04:19] reputation.record(0x7Ae3, +1) → rep 847",
  "[12:04:21] poll cycle complete · sleep 5000ms",
  "[12:04:26] skill `price-oracle` checkCondition() → drift 0.02% < threshold → SKIP",
  "[12:04:26] jobRegistry.getOpenJobs() → 8 open · 2 profitable",
  "[12:04:27] wallet.canExecute(job#4821) → TRUE · profit margin 41%",
  "[12:04:27] jobRegistry.acceptJob(4821) → tx 0x91f...0c2 → confirmed",
];

export const ECONOMY_STATS = {
  activeWallets: 271,
  jobsToday: 1842,
  usdcSettled: 18472.91,
  avgDecisionTime: 1.4,
};

export const WALLETS = [
  { addr: "0x7Ae3...c91F", role: "EXECUTOR", rep: 847, autonomy: 100, vol: 2847, jobs: 142, since: "23d" },
  { addr: "0x9F22...41dC", role: "SCOUT",    rep: 921, autonomy: 100, vol: 4120, jobs: 218, since: "31d" },
  { addr: "0xC112...88aB", role: "VERIFIER", rep: 712, autonomy: 100, vol: 1842, jobs: 312, since: "19d" },
  { addr: "0x4Bd8...1027", role: "EXECUTOR", rep: 689, autonomy: 100, vol: 2104, jobs: 98,  since: "14d" },
  { addr: "0xE7c1...9912", role: "VERIFIER", rep: 654, autonomy: 100, vol: 1532, jobs: 287, since: "22d" },
  { addr: "0x33aF...77b2", role: "SCOUT",    rep: 612, autonomy: 100, vol: 3210, jobs: 174, since: "27d" },
  { addr: "0xF8e4...2201", role: "EXECUTOR", rep: 588, autonomy: 100, vol: 1876, jobs: 84,  since: "11d" },
  { addr: "0x21bc...9f04", role: "EXECUTOR", rep: 547, autonomy: 100, vol: 1402, jobs: 71,  since: "9d" },
];

export const SKILLS_MARKET = [
  { name: "apy-scout", desc: "Scans yield pools across Mantle DEXs every 30s. Posts a job when any pool exceeds APY threshold.", fires: "POST_JOB", role: "SCOUT", installs: 184, cli: "byreal skill add apy-scout --threshold 0.8 --bounty 3" },
  { name: "lp-executor", desc: "Executes liquidity provision trades when a profitable job is detected on the registry.", fires: "EXECUTE", role: "EXECUTOR", installs: 142, cli: "byreal skill add lp-executor --slippage 0.3" },
  { name: "price-oracle", desc: "Polls MNT/USDC every 5s. Submits price proofs when drift exceeds 0.5%.", fires: "VERIFY", role: "VERIFIER", installs: 312, cli: "byreal skill add price-oracle" },
  { name: "rebalancer", desc: "Maintains gas reserve. Auto-swaps USDC → MNT when MNT balance < 0.5.", fires: "SWAP", role: "EXECUTOR", installs: 98, cli: "byreal skill add rebalancer --reserve 0.5" },
  { name: "depth-prober", desc: "Queries DEX order-book depth on demand. Earns from depth-query jobs.", fires: "EXECUTE", role: "EXECUTOR", installs: 76, cli: "byreal skill add depth-prober" },
  { name: "arb-hunter", desc: "Detects cross-DEX arbitrage. Posts execution jobs with 8m deadlines.", fires: "POST_JOB", role: "SCOUT", installs: 211, cli: "byreal skill add arb-hunter --min-spread 0.4" },
];

export type SkillStatus = "active" | "paused";
export type FeedColor = "yellow" | "cyan" | "green" | "orange" | "red" | "purple";

export type WalletSkill = {
  name: string;
  status: SkillStatus;
  fires: number;
};

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

const skillsByRole: Record<string, WalletSkill[]> = {
  SCOUT: [
    { name: "apy-scout", status: "active", fires: 47 },
    { name: "arb-hunter", status: "active", fires: 31 },
    { name: "price-oracle", status: "active", fires: 312 },
  ],
  EXECUTOR: [
    { name: "lp-executor", status: "active", fires: 89 },
    { name: "depth-prober", status: "active", fires: 124 },
    { name: "rebalancer", status: "paused", fires: 6 },
  ],
  VERIFIER: [
    { name: "price-oracle", status: "active", fires: 412 },
    { name: "result-checker", status: "active", fires: 287 },
    { name: "hash-verifier", status: "active", fires: 198 },
  ],
};

const recentByRole: Record<string, Execution[]> = {
  SCOUT: [
    { t: "2m ago",  action: "POSTED_JOB", detail: "scan APY pools > 8% · bounty 3.00 USDC", tx: "0x88c1...2af3", color: "yellow" },
    { t: "11m ago", action: "POSTED_JOB", detail: "find arb on Mantle DEX · bounty 2.50 USDC", tx: "0x91f0...0c2b", color: "yellow" },
    { t: "24m ago", action: "REINVEST",   detail: "balance > reserve · skill apy-scout fires", tx: "0x4ad7...11e9", color: "purple" },
    { t: "41m ago", action: "EARNED",     detail: "+1.20 USDC from job#4801", tx: "0x77bb...c0fa", color: "green" },
  ],
  EXECUTOR: [
    { t: "14s ago", action: "ACCEPTED_JOB", detail: "job#4823 · LP arb on Mantle DEX", tx: "0x88c1...2af3", color: "cyan" },
    { t: "3m ago",  action: "EXECUTED",     detail: "depth: 412k USDC @ 0.18% slippage", tx: "0xfa12...8801", color: "cyan" },
    { t: "12m ago", action: "EARNED",       detail: "+1.20 USDC → balance 312.45", tx: "0x66e0...a14c", color: "green" },
    { t: "27m ago", action: "DECISION",     detail: "skill price-oracle: drift below threshold, SKIP", tx: "—",            color: "orange" },
  ],
  VERIFIER: [
    { t: "5s ago",  action: "VERIFIED", detail: "job#4821 · hashes match · payout released", tx: "0x33aa...7712", color: "green" },
    { t: "1m ago",  action: "VERIFIED", detail: "job#4820 · result valid · 0.80 USDC", tx: "0x77c2...e119", color: "green" },
    { t: "8m ago",  action: "REJECTED", detail: "job#4818 · hash mismatch · rep -1 to 0x21bc", tx: "0xfe11...09a1", color: "red" },
    { t: "21m ago", action: "EARNED",   detail: "+0.30 USDC verification fee", tx: "0xab10...44c2", color: "green" },
  ],
};

export function getWalletDetail(w: typeof WALLETS[number]): WalletDetail {
  const role = w.role as WalletDetail["role"];
  return {
    ...w,
    role,
    skills: skillsByRole[role] ?? [],
    recent: recentByRole[role] ?? [],
  };
}
