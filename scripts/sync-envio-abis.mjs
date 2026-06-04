#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const contracts = [
  "ERC8004Identity",
  "ERC8004Reputation",
  "ERC8004Validation",
  "JobRegistry",
  "SkillRegistry",
  "AgenticWalletFactory",
];

const outDir = resolve(process.cwd(), "envio-indexer", "abis");
mkdirSync(outDir, { recursive: true });

for (const contract of contracts) {
  const artifactPath = resolve(
    process.cwd(),
    "contracts",
    "out",
    `${contract}.sol`,
    `${contract}.json`,
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  if (!artifact.abi) throw new Error(`Missing ABI in ${artifactPath}`);

  const target = resolve(outDir, `${contract}.json`);
  writeFileSync(target, `${JSON.stringify(artifact.abi, null, 2)}\n`);
  console.log(target);
}
