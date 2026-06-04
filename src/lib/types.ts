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
