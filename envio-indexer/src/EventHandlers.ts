/**
 * MemeAutonom — Envio event handlers
 *
 * Each handler upserts the entity shape required by the front-end queries in
 * src/lib/api.ts. Role/autonomy are MVP heuristics until the runtime writes
 * richer policy telemetry.
 */

import {
  ERC8004Identity,
  ERC8004Reputation,
  ERC8004Validation,
  SkillRegistry,
  JobRegistry,
  AgenticWalletFactory,
} from "generated";

// ---------- helpers ----------

const lc = (a: string) => a.toLowerCase();
const execId = (e: { transaction: { hash: string }; logIndex: number }) =>
  `${e.transaction.hash}-${e.logIndex}`;

type WalletEntity = {
  id: string;
  address: string;
  role: string;
  reputation: bigint;
  jobsCompleted: bigint;
  volumeUsdc: bigint;
  autonomyScore: number;
  activatedAt: bigint;
  identityId?: bigint;
  identityUri?: string;
  controller?: string;
};

type EnsureWalletContext = {
  Wallet: {
    get: (id: string) => Promise<WalletEntity | undefined>;
    set: (wallet: WalletEntity) => void;
  };
  EconomyStat: {
    get: (id: string) => Promise<
      | {
          id: string;
          activeWallets: number;
          jobsToday: number;
          usdcSettled: bigint;
          avgDecisionMs: number;
          updatedAt: bigint;
        }
      | undefined
    >;
    set: (stat: {
      id: string;
      activeWallets: number;
      jobsToday: number;
      usdcSettled: bigint;
      avgDecisionMs: number;
      updatedAt: bigint;
    }) => void;
  };
};

async function ensureWallet(addr: string, ts: bigint, ctx: EnsureWalletContext) {
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
    identityId: undefined,
    identityUri: undefined,
    controller: undefined,
  };
  ctx.Wallet.set(w);
  await updateEconomy(ctx, ts, { activeWalletDelta: 1 });
  return w;
}

async function updateEconomy(
  ctx: EnsureWalletContext,
  ts: bigint,
  delta: { activeWalletDelta?: number; jobsTodayDelta?: number; usdcSettledDelta?: bigint } = {},
) {
  const existing = await ctx.EconomyStat.get("global");
  contextSetEconomy(ctx, {
    id: "global",
    activeWallets: Math.max(0, (existing?.activeWallets ?? 0) + (delta.activeWalletDelta ?? 0)),
    jobsToday: Math.max(0, (existing?.jobsToday ?? 0) + (delta.jobsTodayDelta ?? 0)),
    usdcSettled: (existing?.usdcSettled ?? 0n) + (delta.usdcSettledDelta ?? 0n),
    avgDecisionMs: existing?.avgDecisionMs ?? 0,
    updatedAt: ts,
  });
}

function contextSetEconomy(
  ctx: EnsureWalletContext,
  stat: {
    id: string;
    activeWallets: number;
    jobsToday: number;
    usdcSettled: bigint;
    avgDecisionMs: number;
    updatedAt: bigint;
  },
) {
  ctx.EconomyStat.set(stat);
}

// ---------- ERC8004Identity ----------

ERC8004Identity.IdentityRegistered.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  context.Wallet.set({
    ...w,
    identityId: event.params.id,
    identityUri: event.params.uri,
    controller: lc(event.params.controller),
    activatedAt: BigInt(event.block.timestamp),
  });
  context.AgentIdentity.set({
    id: event.params.id.toString(),
    wallet_id: w.id,
    controller: lc(event.params.controller),
    uri: event.params.uri,
    registeredAt: BigInt(event.block.timestamp),
    updatedAt: BigInt(event.block.timestamp),
  });
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
  if (w.identityId !== undefined) {
    const identity = await context.AgentIdentity.get(w.identityId.toString());
    if (identity) {
      context.AgentIdentity.set({
        ...identity,
        uri: event.params.uri,
        updatedAt: BigInt(event.block.timestamp),
      });
    }
  }
});

ERC8004Identity.ControllerUpdated.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  context.Wallet.set({ ...w, controller: lc(event.params.controller) });
  if (w.identityId !== undefined) {
    const identity = await context.AgentIdentity.get(w.identityId.toString());
    if (identity) {
      context.AgentIdentity.set({ ...identity, controller: lc(event.params.controller) });
    }
  }
});

ERC8004Identity.RegistrarUpdated.handler(async () => {});

// ---------- ERC8004Reputation ----------

ERC8004Reputation.ReporterUpdated.handler(async () => {});

ERC8004Reputation.ReputationRecorded.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  context.Wallet.set({ ...w, reputation: event.params.scoreAfter });
  context.ReputationRecord.set({
    id: event.params.recordId.toString(),
    wallet_id: w.id,
    issuer: lc(event.params.issuer),
    value: event.params.value,
    decimals: Number(event.params.decimals),
    scoreAfter: event.params.scoreAfter,
    tag1: event.params.tag1,
    tag2: event.params.tag2,
    uri: event.params.uri,
    fileHash: event.params.fileHash,
    recordedAt: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
  context.Execution.set({
    id: execId(event),
    wallet_id: w.id,
    timestamp: BigInt(event.block.timestamp),
    action: "REPUTATION_RECORD",
    detail: `${event.params.tag1}:${event.params.value.toString()}`,
    txHash: event.transaction.hash,
    color: event.params.value >= 0n ? "green" : "red",
  });
});

// ---------- ERC8004Validation ----------

ERC8004Validation.ValidationRequest.handler(async ({ event, context }) => {
  const identity = await context.AgentIdentity.get(event.params.agentId.toString());
  context.ValidationRequest.set({
    id: event.params.requestHash,
    wallet_id: identity?.wallet_id,
    validator: lc(event.params.validatorAddress),
    agentId: event.params.agentId,
    requestURI: event.params.requestURI,
    requestHash: event.params.requestHash,
    requestedAt: BigInt(event.block.timestamp),
  });
});

ERC8004Validation.ValidationResponse.handler(async ({ event, context }) => {
  const req = await context.ValidationRequest.get(event.params.requestHash);
  context.ValidationResponse.set({
    id: event.params.requestHash,
    request_id: event.params.requestHash,
    validator: lc(event.params.validatorAddress),
    agentId: event.params.agentId,
    response: Number(event.params.response),
    responseURI: event.params.responseURI,
    responseHash: event.params.responseHash,
    tag: event.params.tag,
    respondedAt: BigInt(event.block.timestamp),
    txHash: event.transaction.hash,
  });
  if (req) {
    context.ValidationRequest.set({ ...req, response_id: event.params.requestHash });
  }
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
  if (inst)
    context.SkillInstall.set({ ...inst, status: event.params.status === 1 ? "active" : "paused" });
});

SkillRegistry.SkillFired.handler(async ({ event, context }) => {
  const w = await ensureWallet(event.params.wallet, BigInt(event.block.timestamp), context);
  const id = `${event.params.id}-${w.id}`;
  const inst = await context.SkillInstall.get(id);
  if (inst) context.SkillInstall.set({ ...inst, fires: inst.fires + 1n });
  const skill = await context.Skill.get(event.params.id);
  if (skill) context.Skill.set({ ...skill, fires: skill.fires + 1n });

  context.Execution.set({
    id: execId(event),
    wallet_id: w.id,
    timestamp: BigInt(event.block.timestamp),
    action: "SKILL_FIRE",
    detail: skill?.name ?? event.params.id.slice(0, 10),
    txHash: event.transaction.hash,
    color: "yellow",
  });
  await updateEconomy(context, BigInt(event.block.timestamp));
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
  await updateEconomy(context, BigInt(event.block.timestamp), { jobsTodayDelta: 1 });
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
  await updateEconomy(context, BigInt(event.block.timestamp), {
    usdcSettledDelta: event.params.paid,
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
  await updateEconomy(context, BigInt(event.block.timestamp));
});
