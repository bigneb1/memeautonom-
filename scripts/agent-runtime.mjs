#!/usr/bin/env node
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

const PORT = Number(process.env.PORT || "8091");
const HOST = process.env.HOST || "127.0.0.1";
const TICK_MS = Number(process.env.TICK_MS || "30000");
const MAX_DECISIONS = 100;
const DEFAULT_BYREAL_ARGS = "--non-interactive skill";

const decisions = [];
let running = false;
let lastError = "";
const execFileAsync = promisify(execFile);

const walletAbi = [
  {
    type: "function",
    name: "executeSkill",
    stateMutability: "nonpayable",
    inputs: [
      { name: "skillId", type: "bytes32" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
];

const skillAbi = [
  {
    type: "function",
    name: "fire",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "actionHash", type: "bytes32" },
    ],
    outputs: [],
  },
];

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === "1" || value === "true" || value === "yes";
}

function requireAddress(value, name) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value || "")) throw new Error(`Invalid ${name}`);
  return value;
}

function requireBytes32(value, name) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value || "")) throw new Error(`Invalid ${name}`);
  return value;
}

function chain() {
  const network = process.env.MANTLE_NETWORK || "sepolia";
  return network === "mainnet" || network === "mantle" ? mantle : mantleSepoliaTestnet;
}

function rpcUrlFor(selectedChain) {
  if (selectedChain.id === mantle.id) {
    return process.env.MANTLE_RPC || process.env.RPC_URL;
  }
  return process.env.MANTLE_SEPOLIA_RPC || process.env.RPC_URL;
}

function clients() {
  const privateKey = process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing AGENT_PRIVATE_KEY");
  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  const selectedChain = chain();
  if (selectedChain.id === mantle.id && !parseBool(process.env.ALLOW_MAINNET, false)) {
    throw new Error("Set ALLOW_MAINNET=1 before running the agent runtime on Mantle mainnet.");
  }
  const rpcUrl = rpcUrlFor(selectedChain);
  if (!rpcUrl) {
    throw new Error(
      selectedChain.id === mantle.id
        ? "Missing MANTLE_RPC or RPC_URL"
        : "Missing MANTLE_SEPOLIA_RPC or RPC_URL",
    );
  }
  return {
    account,
    publicClient: createPublicClient({ chain: selectedChain, transport: http(rpcUrl) }),
    walletClient: createWalletClient({ account, chain: selectedChain, transport: http(rpcUrl) }),
  };
}

function pushDecision(entry) {
  decisions.unshift({
    ts: new Date().toISOString(),
    ...entry,
  });
  decisions.splice(MAX_DECISIONS);
}

function actionHash() {
  const raw = process.env.ACTION_HASH;
  if (raw) return requireBytes32(raw, "ACTION_HASH");
  const suffix = BigInt(Date.now()).toString(16).padStart(64, "0").slice(-64);
  return `0x${suffix}`;
}

async function runByrealPreview(source) {
  if (!parseBool(process.env.BYREAL_ENABLED, false)) return null;
  const bin = process.env.BYREAL_BIN || "byreal-cli";
  const args = (process.env.BYREAL_ARGS || DEFAULT_BYREAL_ARGS)
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  pushDecision({ source, phase: "byreal-preview", command: `${bin} ${args.join(" ")}` });
  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      timeout: Number(process.env.BYREAL_TIMEOUT_MS || "30000"),
      maxBuffer: 1024 * 1024,
    });
    const summary = stdout.trim().slice(0, 1000);
    pushDecision({
      source,
      phase: "byreal-preview-ok",
      byreal: summary || stderr.trim().slice(0, 1000),
    });
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushDecision({ source, phase: "byreal-preview-error", error: message });
    if (parseBool(process.env.BYREAL_REQUIRED, false)) throw error;
    return null;
  }
}

async function tick(source = "manual") {
  const walletAddress = requireAddress(process.env.WALLET_ADDRESS, "WALLET_ADDRESS");
  const skillRegistry = requireAddress(
    process.env.SKILL_REGISTRY_ADDRESS,
    "SKILL_REGISTRY_ADDRESS",
  );
  const skillId = requireBytes32(process.env.SKILL_ID, "SKILL_ID");
  const dryRun = parseBool(process.env.DRY_RUN, false);
  const { account, publicClient, walletClient } = clients();
  const hash = actionHash();
  await runByrealPreview(source);
  const fireData = encodeFunctionData({
    abi: skillAbi,
    functionName: "fire",
    args: [skillId, hash],
  });
  const walletData = encodeFunctionData({
    abi: walletAbi,
    functionName: "executeSkill",
    args: [skillId, skillRegistry, 0n, fireData],
  });

  pushDecision({
    source,
    phase: "simulate",
    wallet: walletAddress,
    skillRegistry,
    skillId,
    actionHash: hash,
    dryRun,
  });

  await publicClient.call({
    account,
    to: walletAddress,
    data: walletData,
  });

  if (dryRun) {
    pushDecision({ source, phase: "dry-run-ok", wallet: walletAddress, actionHash: hash });
    return { dryRun: true, actionHash: hash };
  }

  const txHash = await walletClient.sendTransaction({
    to: walletAddress,
    data: walletData,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error(`Runtime tx failed: ${txHash}`);
  pushDecision({ source, phase: "sent", wallet: walletAddress, actionHash: hash, txHash });
  return { dryRun: false, actionHash: hash, txHash };
}

function authorized(req) {
  const token = process.env.AGENT_API_TOKEN;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function publicDecisions() {
  if (parseBool(process.env.PUBLIC_DECISIONS, true)) return decisions;
  return decisions.map(({ error, ...entry }) => entry);
}

function json(res, code, payload) {
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 204, {});
    if (req.url === "/health") {
      return json(res, 200, {
        ok: true,
        running,
        dryRun: parseBool(process.env.DRY_RUN, false),
        byrealEnabled: parseBool(process.env.BYREAL_ENABLED, false),
        byrealRequired: parseBool(process.env.BYREAL_REQUIRED, false),
        byrealArgs: process.env.BYREAL_ARGS || DEFAULT_BYREAL_ARGS,
        network: process.env.MANTLE_NETWORK || "sepolia",
        wallet: process.env.WALLET_ADDRESS || "",
        skillRegistry: process.env.SKILL_REGISTRY_ADDRESS || "",
        skillId: process.env.SKILL_ID || "",
        decisions: decisions.length,
        lastError,
      });
    }
    if (req.url === "/decisions") return json(res, 200, { decisions: publicDecisions() });
    if (!authorized(req)) return json(res, 401, { ok: false, error: "unauthorized" });
    if (req.url === "/tick" && req.method === "POST") {
      const result = await tick("http");
      return json(res, 200, { ok: true, result });
    }
    return json(res, 404, { ok: false, error: "not found" });
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    pushDecision({ source: "http", phase: "error", error: lastError });
    return json(res, 500, { ok: false, error: lastError });
  }
});

server.listen(PORT, HOST, () => {
  running = true;
  pushDecision({ source: "runtime", phase: "started", port: PORT });
  console.log(JSON.stringify({ ok: true, host: HOST, port: PORT, tickMs: TICK_MS }));
});

if (parseBool(process.env.AUTO_START, false)) {
  setInterval(() => {
    tick("interval").catch((error) => {
      lastError = error instanceof Error ? error.message : String(error);
      pushDecision({ source: "interval", phase: "error", error: lastError });
    });
  }, TICK_MS);
}
