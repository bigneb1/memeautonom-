#!/usr/bin/env node
import { createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

function must(value, name) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function hexAddress(value, name) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error(`Invalid address for ${name}: ${value}`);
  return value;
}

function hexSelector(value) {
  if (!/^0x[a-fA-F0-9]{8}$/.test(value)) throw new Error(`Invalid selector: ${value}`);
  return value;
}

function bytes32(value, name) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) throw new Error(`Invalid bytes32 for ${name}: ${value}`);
  return value;
}

function rpcUrlFor(chain) {
  if (chain.id === mantle.id) {
    return must(process.env.MANTLE_RPC || process.env.RPC_URL, "MANTLE_RPC or RPC_URL");
  }
  return must(
    process.env.MANTLE_SEPOLIA_RPC || process.env.RPC_URL,
    "MANTLE_SEPOLIA_RPC or RPC_URL",
  );
}

async function main() {
  const privateKey = must(process.env.PRIVATE_KEY, "PRIVATE_KEY");
  const walletAddress = hexAddress(
    must(process.env.WALLET_ADDRESS, "WALLET_ADDRESS"),
    "WALLET_ADDRESS",
  );
  const targetAddress = hexAddress(
    must(process.env.TARGET_ADDRESS, "TARGET_ADDRESS"),
    "TARGET_ADDRESS",
  );
  const selectors = (process.env.SELECTORS || "")
    .split(",")
    .map((s) => s.trim())
    .map(hexSelector)
    .filter(Boolean);
  const rawSkillId = process.env.SKILL_ID || "";
  const skillId = bytes32(rawSkillId, "SKILL_ID");
  const skillMax = BigInt(
    process.env.SKILL_MAX_CALL_AMOUNT || process.env.DEFAULT_MAX_CALL_AMOUNT || "0",
  );
  const skillDaily = BigInt(
    process.env.SKILL_DAILY_LIMIT || process.env.DEFAULT_DAILY_LIMIT || "0",
  );
  const skillEnabled = parseBool(process.env.SKILL_ENABLED, true);
  const network = process.env.MANTLE_NETWORK || "sepolia";
  const chain = network === "mainnet" || network === "mantle" ? mantle : mantleSepoliaTestnet;
  if (chain.id === mantle.id && !parseBool(process.env.ALLOW_MAINNET, false)) {
    throw new Error("Set ALLOW_MAINNET=1 before bootstrapping a wallet on Mantle mainnet.");
  }
  const rpcUrl = rpcUrlFor(chain);

  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const abi = [
    {
      type: "function",
      name: "setTargetAllowed",
      stateMutability: "nonpayable",
      inputs: [
        { name: "target", type: "address" },
        { name: "allowed", type: "bool" },
      ],
      outputs: [],
    },
    {
      type: "function",
      name: "setSelectorAllowed",
      stateMutability: "nonpayable",
      inputs: [
        { name: "target", type: "address" },
        { name: "selector", type: "bytes4" },
        { name: "allowed", type: "bool" },
      ],
      outputs: [],
    },
    {
      type: "function",
      name: "setSkillLimits",
      stateMutability: "nonpayable",
      inputs: [
        { name: "skillId", type: "bytes32" },
        { name: "maxCallAmount", type: "uint128" },
        { name: "dailySpendLimit", type: "uint128" },
        { name: "enabled", type: "bool" },
      ],
      outputs: [],
    },
  ];

  await send("setTargetAllowed", [targetAddress, true]);
  for (const selector of selectors) {
    await send("setSelectorAllowed", [targetAddress, selector, true]);
  }
  await send("setSkillLimits", [skillId, skillMax, skillDaily, skillEnabled]);

  console.log(JSON.stringify({ walletAddress, targetAddress, selectors, skillId }, null, 2));

  async function send(functionName, args) {
    const data = encodeFunctionData({ abi, functionName, args });
    const hash = await walletClient.sendTransaction({ to: walletAddress, data });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error(`${functionName} transaction failed`);
    }
  }
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === "1" || value === "true" || value === "yes";
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
