#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2] || resolve(process.cwd(), "deployments.env");
const data = readFileSync(file, "utf8").trim().split(/\r?\n/);
const out = {};
for (const line of data) {
  const idx = line.indexOf("=");
  if (idx < 0) continue;
  out[line.slice(0, idx)] = line.slice(idx + 1);
}
console.log(JSON.stringify(out, null, 2));
