#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

const CHAIN_BY_NAME = {
  sepolia: mantleSepoliaTestnet,
  testnet: mantleSepoliaTestnet,
  mantleSepolia: mantleSepoliaTestnet,
  mainnet: mantle,
  mantle,
};

let publicClient;
let walletClient;

function must(value, name) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function hexAddress(value, name) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Invalid address for ${name}: ${value}`);
  }
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

function bytecodePath(contract) {
  return resolve(process.cwd(), "contracts", "out", `${contract}.sol`, `${contract}.json`);
}

async function main() {
  const network = process.env.MANTLE_NETWORK || "mainnet";
  const chain = CHAIN_BY_NAME[network];
  if (!chain) throw new Error(`Unsupported MANTLE_NETWORK: ${network}`);
  if (
    chain.id === mantle.id &&
    !["1", "true", "yes"].includes((process.env.ALLOW_MAINNET || "").toLowerCase())
  ) {
    throw new Error("Set ALLOW_MAINNET=1 before deploying to Mantle mainnet.");
  }

  const rpcUrl = rpcUrlFor(chain);
  const privateKey = must(process.env.PRIVATE_KEY, "PRIVATE_KEY");
  const usdc = hexAddress(must(process.env.USDC, "USDC"), "USDC");
  const feeSink = hexAddress(must(process.env.FEE_SINK, "FEE_SINK"), "FEE_SINK");
  const feeBps = Number(process.env.FEE_BPS || "250");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) {
    throw new Error("FEE_BPS must be an integer between 0 and 1000.");
  }
  const startBlock = process.env.START_BLOCK || "0";
  const identityUri = process.env.IDENTITY_URI || "";
  const owner = process.env.WALLET_OWNER || "";
  const signer = process.env.WALLET_SIGNER || "";

  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  const contracts = {
    identity: loadArtifact("ERC8004Identity"),
    reputation: loadArtifact("ERC8004Reputation"),
    validation: loadArtifact("ERC8004Validation"),
    skillRegistry: loadArtifact("SkillRegistry"),
    jobRegistry: loadArtifact("JobRegistry"),
    factory: loadArtifact("AgenticWalletFactory"),
  };

  const deployed = {};
  deployed.identity = await deploy("ERC8004Identity", contracts.identity, []);
  deployed.reputation = await deploy("ERC8004Reputation", contracts.reputation, [
    deployed.identity,
  ]);
  deployed.validation = await deploy("ERC8004Validation", contracts.validation, [
    deployed.identity,
  ]);
  deployed.skillRegistry = await deploy("SkillRegistry", contracts.skillRegistry, []);
  deployed.jobRegistry = await deploy("JobRegistry", contracts.jobRegistry, [
    usdc,
    deployed.identity,
    feeSink,
    feeBps,
  ]);
  deployed.factory = await deploy("AgenticWalletFactory", contracts.factory, [deployed.identity]);

  await send("ERC8004Identity", deployed.identity, "setRegistrar", [deployed.factory, true]);
  await send("ERC8004Reputation", deployed.reputation, "setReporter", [
    deployed.skillRegistry,
    true,
  ]);
  await send("ERC8004Reputation", deployed.reputation, "setReporter", [deployed.jobRegistry, true]);
  await send("SkillRegistry", deployed.skillRegistry, "setReputationRegistry", [
    deployed.reputation,
  ]);
  await send("JobRegistry", deployed.jobRegistry, "setReputationRegistry", [deployed.reputation]);

  const lines = [
    `MANTLE_NETWORK=${network}`,
    `MANTLE_CHAIN_ID=${chain.id}`,
    `MANTLE_RPC_URL=${rpcUrl}`,
    `START_BLOCK=${startBlock}`,
    `IDENTITY_ADDRESS=${deployed.identity}`,
    `REPUTATION_ADDRESS=${deployed.reputation}`,
    `VALIDATION_ADDRESS=${deployed.validation}`,
    `SKILL_REGISTRY_ADDRESS=${deployed.skillRegistry}`,
    `JOB_REGISTRY_ADDRESS=${deployed.jobRegistry}`,
    `WALLET_FACTORY_ADDRESS=${deployed.factory}`,
    `USDC_ADDRESS=${usdc}`,
    `FEE_SINK=${feeSink}`,
    `VITE_MANTLE_CHAIN_ID=${chain.id}`,
    `VITE_MANTLE_RPC=${chain.id === mantle.id ? rpcUrl : "https://rpc.mantle.xyz"}`,
    `VITE_IDENTITY_ADDRESS=${deployed.identity}`,
    `VITE_REPUTATION_ADDRESS=${deployed.reputation}`,
    `VITE_VALIDATION_ADDRESS=${deployed.validation}`,
    `VITE_SKILL_REGISTRY_ADDRESS=${deployed.skillRegistry}`,
    `VITE_JOB_REGISTRY_ADDRESS=${deployed.jobRegistry}`,
    `VITE_WALLET_FACTORY_ADDRESS=${deployed.factory}`,
    `VITE_USDC_ADDRESS=${usdc}`,
  ];
  if (chain.id === mantleSepoliaTestnet.id) {
    lines.splice(14, 0, `VITE_MANTLE_SEPOLIA_RPC=${rpcUrl}`);
  }
  writeFileSync(resolve(process.cwd(), "deployments.env"), `${lines.join("\n")}\n`);
  console.log(JSON.stringify(deployed, null, 2));

  if (identityUri || owner || signer) {
    console.log(
      JSON.stringify(
        {
          note: "wallet bootstrap inputs detected",
          owner: owner || undefined,
          signer: signer || undefined,
          identityUri: identityUri || undefined,
        },
        null,
        2,
      ),
    );
  }
}

function loadArtifact(contract) {
  const file = bytecodePath(contract);
  const artifact = JSON.parse(readFileSync(file, "utf8"));
  if (!artifact.bytecode?.object) {
    throw new Error(`Missing bytecode in artifact: ${contract}`);
  }
  if (!artifact.abi) {
    throw new Error(`Missing ABI in artifact: ${contract}`);
  }
  return artifact;
}

async function deploy(name, artifact, args) {
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    args,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error(`No contract address for ${name}`);
  if (receipt.status !== "success") throw new Error(`${name} deployment failed`);
  console.log(`${name}: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

async function send(contractName, address, functionName, args) {
  const artifact = loadArtifact(contractName);
  const data = encodeFunctionData({ abi: artifact.abi, functionName, args });
  const hash = await walletClient.sendTransaction({ to: address, data });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`${contractName}.${functionName} transaction failed`);
  }
  return receipt.status;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
