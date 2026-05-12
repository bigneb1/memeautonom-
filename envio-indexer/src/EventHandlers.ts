/**
 * MemeAutonom — Envio event handlers
 *
 * STUBS. Each handler upserts the minimal entity shape required by the
 * front-end queries in src/lib/api.ts. Fill in TODOs for richer logic
 * (role classification, autonomy score, EconomyStat aggregation).
 */

import {
  ERC8004Identity,
  SkillRegistry,
  JobRegistry,
  AgenticWalletFactory,
} from "generated";

// ---------- helpers ----------

const lc = (a: string) => a.toLowerCase();
const execId = (e: { transaction: { hash: string }; logIndex: number }) =>
  `${e.transaction.hash}-${e.logIndex}`;

async function ensureWallet(addr: string, ts: bigint, ctx: any) {
  const id = lc(addr);
  const existing = await ctx.Wallet.get(id);
  if (existing) return existing;
  const w = {
    id,
    address: id,
    role: "EXECUTOR", // TODO classify from skill mix
    reputation: 0n,
    jobsCompleted: 0n,
    volumeUsdc: 0n,
    autonomyScore: 50,
    activatedAt: ts,
    identityUri: undefined,
  };
  ctx.Wallet.set(w);
  return w;
}

// ---------- ERC8004Identity ----------

ERC8004Identity.IdentityRegistered.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  context.Wallet.set({ ...w, identityUri: event.params.uri, activatedAt: BigInt(event.block.timestamp) });
  context.Execution.set({
    id: execId(event),
    wallet_id: w.id,
    timestamp: BigInt(event.block.timestamp),
    action: "IDENTITY_REGISTER",
    detail: `id=${event.params.id.toString()}`,
    txHash: event.transaction.hash,
    color: "purple",
  });
});

ERC8004Identity.IdentityUpdated.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  context.Wallet.set({ ...w, identityUri: event.params.uri });
});

// ---------- SkillRegistry ----------

SkillRegistry.SkillPublished.handler(async ({ event, context }) => {
  const author = await ensureWallet(event.params.author, BigInt(event.block.timestamp), context);
  context.Skill.set({
    id: event.params.id,
    name: event.params.name,
    uri: event.params.uri,
    author_id: author.id,
    publishedAt: BigInt(event.block.timestamp),
    installs: 0n,
    fires: 0n,
  });
});

SkillRegistry.SkillInstalled.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  const skill = await context.Skill.get(event.params.id);
  if (!skill) return;
  const installId = `${event.params.id}-${w.id}`;
  context.SkillInstall.set({
    id: installId,
    wallet_id: w.id,
    skill_id: skill.id,
    name: skill.name,
    status: "active",
    fires: 0n,
    installedAt: BigInt(event.block.timestamp),
  });
  context.Skill.set({ ...skill, installs: skill.installs + 1n });
});

SkillRegistry.SkillUninstalled.handler(async ({ event, context }) => {
  const id = `${event.params.id}-${lc(event.params.wallet)}`;
  const inst = await context.SkillInstall.get(id);
  if (inst) context.SkillInstall.set({ ...inst, status: "paused" });
});

SkillRegistry.SkillStatusChanged.handler(async ({ event, context }) => {
  const id = `${event.params.id}-${lc(event.params.wallet)}`;
  const inst = await context.SkillInstall.get(id);
  if (inst) context.SkillInstall.set({ ...inst, status: event.params.status === 1 ? "active" : "paused" });
});

SkillRegistry.SkillFired.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  const id = `${event.params.id}-${w.id}`;
  const inst = await context.SkillInstall.get(id);
  if (inst) context.SkillInstall.set({ ...inst, fires: inst.fires + 1n });
  const skill = await context.Skill.get(event.params.id);
  if (skill) context.Skill.set({ ...skill, fires: skill.fires + 1n });

  context.Wallet.set({ ...w, reputation: w.reputation + 1n });
  context.Execution.set({
    id: execId(event),
    wallet_id: w.id,
    timestamp: BigInt(event.block.timestamp),
    action: "SKILL_FIRE",
    detail: skill?.name ?? event.params.id.slice(0, 10),
    txHash: event.transaction.hash,
    color: "yellow",
  });
});

// ---------- JobRegistry ----------

JobRegistry.JobPosted.handler(async ({ event, context }) => {
  const client = await ensureWallet(event.params.client, BigInt(event.block.timestamp), context);
  context.Job.set({
    id: event.params.id.toString(),
    client_id: client.id,
    executor_id: undefined,
    budget: event.params.budget,
    paid: 0n,
    status: "OPEN",
    spec: event.params.spec,
    resultHash: undefined,
    postedAt: BigInt(event.block.timestamp),
    completedAt: undefined,
  });
  context.Execution.set({
    id: execId(event),
    wallet_id: client.id,
    timestamp: BigInt(event.block.timestamp),
    action: "JOB_POST",
    detail: `${event.params.budget.toString()} USDC`,
    txHash: event.transaction.hash,
    color: "cyan",
  });
});

JobRegistry.JobAccepted.handler(async ({ event, context }) => {
  const job = await context.Job.get(event.params.id.toString());
  const exec = await ensureWallet(event.params.executor, BigInt(event.block.timestamp), context);
  if (job) context.Job.set({ ...job, executor_id: exec.id, status: "ACCEPTED" });
  context.Execution.set({
    id: execId(event),
    wallet_id: exec.id,
    timestamp: BigInt(event.block.timestamp),
    action: "JOB_ACCEPT",
    detail: `job#${event.params.id.toString()}`,
    txHash: event.transaction.hash,
    color: "orange",
  });
});

JobRegistry.JobSubmitted.handler(async ({ event, context }) => {
  const job = await context.Job.get(event.params.id.toString());
  if (job) context.Job.set({ ...job, status: "SUBMITTED", resultHash: event.params.resultHash });
});

JobRegistry.JobCompleted.handler(async ({ event, context }) => {
  const job = await context.Job.get(event.params.id.toString());
  const exec = await ensureWallet(event.params.executor, BigInt(event.block.timestamp), context);
  if (job)
    context.Job.set({
      ...job,
      status: "COMPLETED",
      paid: event.params.paid,
      completedAt: BigInt(event.block.timestamp),
    });
  context.Wallet.set({
    ...exec,
    jobsCompleted: exec.jobsCompleted + 1n,
    volumeUsdc: exec.volumeUsdc + event.params.paid,
    reputation: exec.reputation + 10n,
  });
  context.Execution.set({
    id: execId(event),
    wallet_id: exec.id,
    timestamp: BigInt(event.block.timestamp),
    action: "JOB_COMPLETE",
    detail: `+${event.params.paid.toString()} USDC`,
    txHash: event.transaction.hash,
    color: "green",
  });
});

JobRegistry.JobCancelled.handler(async ({ event, context }) => {
  const job = await context.Job.get(event.params.id.toString());
  if (job) context.Job.set({ ...job, status: "CANCELLED" });
});

// ---------- Factory ----------

AgenticWalletFactory.WalletCreated.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  context.Wallet.set({ ...w, activatedAt: BigInt(event.block.timestamp) });
  context.Execution.set({
    id: execId(event),
    wallet_id: w.id,
    timestamp: BigInt(event.block.timestamp),
    action: "WALLET_DEPLOY",
    detail: `salt=${event.params.salt.toString()}`,
    txHash: event.transaction.hash,
    color: "purple",
  });
});
