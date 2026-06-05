#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  encodeAbiParameters,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

const INSTALL_SELECTOR = "0x12f8740a";
const FIRE_SELECTOR = "0xa9363859";

const factoryAbi = [
  {
    type: "function",
    name: "deploy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "signer", type: "address" },
      { name: "salt", type: "uint256" },
      { name: "uri", type: "string" },
    ],
    outputs: [{ name: "wallet", type: "address" }],
  },
  {
    type: "function",
    name: "predict",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "signer", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "wallet", type: "address" }],
  },
];

const skillAbi = [
  {
    type: "function",
    name: "publish",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "uri", type: "string" },
    ],
    outputs: [{ name: "id", type: "bytes32" }],
  },
  {
    type: "function",
    name: "skills",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "author", type: "address" },
      { name: "uri", type: "string" },
      { name: "name", type: "string" },
      { name: "publishedAt", type: "uint64" },
      { name: "installs", type: "uint128" },
      { name: "fires", type: "uint128" },
    ],
  },
  {
    type: "function",
    name: "install",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [],
  },
];

const walletAbi = [
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

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === "1" || value === "true" || value === "yes";
}

function must(value, name) {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function address(value, name) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value || "")) throw new Error(`Invalid ${name}`);
  return getAddress(value);
}

function selectedChain() {
  const network = process.env.MANTLE_NETWORK || "mainnet";
  return network === "mainnet" || network === "mantle" ? mantle : mantleSepoliaTestnet;
}

function rpcUrlFor(chain) {
  if (chain.id === mantle.id)
    return must(process.env.MANTLE_RPC || process.env.RPC_URL, "MANTLE_RPC or RPC_URL");
  return must(
    process.env.MANTLE_SEPOLIA_RPC || process.env.RPC_URL,
    "MANTLE_SEPOLIA_RPC or RPC_URL",
  );
}

async function wait(publicClient, hash, label) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${label} failed: ${hash}`);
  return receipt;
}

async function main() {
  const chain = selectedChain();
  if (chain.id === mantle.id && !parseBool(process.env.ALLOW_MAINNET, false)) {
    throw new Error("Set ALLOW_MAINNET=1 before activating a mainnet agent wallet.");
  }

  const privateKey = must(process.env.PRIVATE_KEY, "PRIVATE_KEY");
  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  const owner = address(process.env.WALLET_OWNER || account.address, "WALLET_OWNER");
  if (owner !== getAddress(account.address)) {
    throw new Error(
      "WALLET_OWNER must match PRIVATE_KEY because wallet policy calls are onlyOwner.",
    );
  }
  const signer = address(process.env.WALLET_SIGNER || account.address, "WALLET_SIGNER");
  const factory = address(
    must(process.env.WALLET_FACTORY_ADDRESS, "WALLET_FACTORY_ADDRESS"),
    "WALLET_FACTORY_ADDRESS",
  );
  const skillRegistry = address(
    must(process.env.SKILL_REGISTRY_ADDRESS, "SKILL_REGISTRY_ADDRESS"),
    "SKILL_REGISTRY_ADDRESS",
  );
  const salt = BigInt(process.env.WALLET_SALT || "1");
  const identityUri = process.env.IDENTITY_URI || "ipfs://memeautonom-agent.json";
  const skillName = process.env.SKILL_NAME || "MemeAutonomProofSkill";
  const skillUri = process.env.SKILL_URI || "ipfs://memeautonom-proof-skill.json";
  const maxCallAmount = BigInt(process.env.SKILL_MAX_CALL_AMOUNT || "0");
  const dailyLimit = BigInt(process.env.SKILL_DAILY_LIMIT || "0");
  const publishSkill = parseBool(process.env.PUBLISH_SKILL, true);
  const installSkill = parseBool(process.env.INSTALL_SKILL, true);
  const outputFile =
    process.env.AGENT_DEPLOYMENTS_FILE || resolve(process.cwd(), "agent.deployments.env");

  const rpcUrl = rpcUrlFor(chain);
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const skillId = keccak256(
    encodeAbiParameters(
      [
        { type: "address", name: "publisher" },
        { type: "string", name: "name" },
      ],
      [owner, skillName],
    ),
  );
  const predictedWallet = await publicClient.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "predict",
    args: [owner, signer, salt],
  });

  const walletCode = await publicClient.getCode({ address: predictedWallet });
  if (!walletCode || walletCode === "0x") {
    const hash = await walletClient.writeContract({
      address: factory,
      abi: factoryAbi,
      functionName: "deploy",
      args: [owner, signer, salt, identityUri],
    });
    await wait(publicClient, hash, "wallet deploy");
  }

  const publishedAt = await publicClient
    .readContract({
      address: skillRegistry,
      abi: skillAbi,
      functionName: "skills",
      args: [skillId],
    })
    .then((skill) => skill[3]);

  if (publishSkill && publishedAt === 0n) {
    const hash = await walletClient.writeContract({
      address: skillRegistry,
      abi: skillAbi,
      functionName: "publish",
      args: [skillName, skillUri],
    });
    await wait(publicClient, hash, "skill publish");
  }

  await wait(
    publicClient,
    await walletClient.writeContract({
      address: predictedWallet,
      abi: walletAbi,
      functionName: "setTargetAllowed",
      args: [skillRegistry, true],
    }),
    "allow skill registry",
  );
  for (const selector of [INSTALL_SELECTOR, FIRE_SELECTOR]) {
    await wait(
      publicClient,
      await walletClient.writeContract({
        address: predictedWallet,
        abi: walletAbi,
        functionName: "setSelectorAllowed",
        args: [skillRegistry, selector, true],
      }),
      `allow selector ${selector}`,
    );
  }
  await wait(
    publicClient,
    await walletClient.writeContract({
      address: predictedWallet,
      abi: walletAbi,
      functionName: "setSkillLimits",
      args: [skillId, maxCallAmount, dailyLimit, true],
    }),
    "set skill limits",
  );

  if (installSkill) {
    const installData = encodeFunctionData({
      abi: skillAbi,
      functionName: "install",
      args: [skillId],
    });
    await wait(
      publicClient,
      await walletClient.writeContract({
        address: predictedWallet,
        abi: walletAbi,
        functionName: "executeSkill",
        args: [skillId, skillRegistry, 0n, installData],
      }),
      "install skill",
    );
  }

  const lines = [
    `MANTLE_NETWORK=${chain.id === mantle.id ? "mainnet" : "sepolia"}`,
    `MANTLE_CHAIN_ID=${chain.id}`,
    `WALLET_ADDRESS=${predictedWallet}`,
    `WALLET_OWNER=${owner}`,
    `WALLET_SIGNER=${signer}`,
    `SKILL_REGISTRY_ADDRESS=${skillRegistry}`,
    `SKILL_ID=${skillId}`,
    `SKILL_NAME=${skillName}`,
    `SKILL_URI=${skillUri}`,
    `SKILL_MAX_CALL_AMOUNT=${maxCallAmount.toString()}`,
    `SKILL_DAILY_LIMIT=${dailyLimit.toString()}`,
  ];
  writeFileSync(outputFile, `${lines.join("\n")}\n`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        chainId: chain.id,
        walletAddress: predictedWallet,
        owner,
        signer,
        skillRegistry,
        skillId,
        outputFile,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
