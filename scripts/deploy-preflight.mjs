#!/usr/bin/env node
import { createPublicClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === "1" || value === "true" || value === "yes";
}

function selectedChain() {
  const network = process.env.MANTLE_NETWORK || "mainnet";
  return network === "mainnet" || network === "mantle" ? mantle : mantleSepoliaTestnet;
}

function rpcUrlFor(chain) {
  if (chain.id === mantle.id) return process.env.MANTLE_RPC || process.env.RPC_URL;
  return process.env.MANTLE_SEPOLIA_RPC || process.env.RPC_URL;
}

async function main() {
  const chain = selectedChain();
  if (chain.id === mantle.id && !parseBool(process.env.ALLOW_MAINNET, false)) {
    throw new Error("Set ALLOW_MAINNET=1 before running mainnet deploy preflight.");
  }
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("Missing PRIVATE_KEY.");
  const rpcUrl = rpcUrlFor(chain);
  if (!rpcUrl) {
    throw new Error(
      chain.id === mantle.id
        ? "Missing MANTLE_RPC or RPC_URL."
        : "Missing MANTLE_SEPOLIA_RPC or RPC_URL.",
    );
  }

  const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
  const client = createPublicClient({ chain, transport: http(rpcUrl) });
  const [chainId, blockNumber, balance] = await Promise.all([
    client.getChainId(),
    client.getBlockNumber(),
    client.getBalance({ address: account.address }),
  ]);

  if (chainId !== chain.id) {
    throw new Error(`RPC chain mismatch. Expected ${chain.id}, got ${chainId}.`);
  }
  if (balance === 0n) {
    throw new Error(`Deployer ${account.address} has zero native balance on ${chain.name}.`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        chain: chain.name,
        chainId,
        blockNumber: blockNumber.toString(),
        deployer: account.address,
        nativeBalance: formatEther(balance),
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
