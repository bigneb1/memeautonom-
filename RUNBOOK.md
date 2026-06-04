# MemeAutonom Runbook

This repo uses npm as the canonical package manager. `package-lock.json` is the
source of truth for dependency resolution.

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- Foundry, when working on contracts
- Envio CLI, when running the indexer

## Frontend

Install dependencies:

```bash
npm install
```

Run the local app:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

Format source files:

```bash
npm run format
```

## Environment

Create `.env.local` at the repo root for local frontend configuration:

```env
VITE_WALLETCONNECT_PROJECT_ID=
VITE_INDEXER_URL=
VITE_AGENT_URL=
VITE_MANTLE_CHAIN_ID=5003
VITE_MANTLE_RPC=https://rpc.mantle.xyz
VITE_MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
VITE_IDENTITY_ADDRESS=
VITE_REPUTATION_ADDRESS=
VITE_VALIDATION_ADDRESS=
VITE_JOB_REGISTRY_ADDRESS=
VITE_SKILL_REGISTRY_ADDRESS=
VITE_WALLET_FACTORY_ADDRESS=
VITE_USDC_ADDRESS=
```

Do not put private keys or seed phrases in any `VITE_*` value. Vite exposes
those values to the browser.

For the current Mantle mainnet deployment, `deployments.env` contains the public
contract addresses and matching `VITE_*` values. It is gitignored because it may
also contain operator-specific deployment metadata.

## Contracts

The Solidity sources live in `contracts/src`.

Basic local workflow:

```bash
cd contracts
forge init --no-git --force .
forge build
```

Deployment guidance is in `contracts/DEPLOY.md`. Use Mantle Sepolia for policy
and runtime rehearsals, and Mantle mainnet only when `ALLOW_MAINNET=1` is set
from a fresh funded deployer key.

Mantle mainnet deployment is guarded. Use a fresh funded key in a local env var
or secrets manager, then set:

```bash
export MANTLE_NETWORK=mainnet
export ALLOW_MAINNET=1
export MANTLE_RPC=https://rpc.mantle.xyz
```

Do not use a key that has been pasted into chat or committed anywhere.

## Indexer

The Envio project lives in `envio-indexer`.

Install and run:

```bash
cd envio-indexer
npm install
npm run codegen
npm run dev
```

Expected local GraphQL endpoint:

```text
http://localhost:8080/v1/graphql
```

For Railway production, `npm start` runs the bundled indexer service wrapper.
It starts Envio internally, disables Hasura, and serves the frontend read model
at `/v1/graphql` from the same Railway service.

## Agent Runtime

The demo runtime executes one bounded skill fire through an `AgenticWallet`.
Bootstrap the wallet policy first so the wallet allows `SkillRegistry.fire`
for one explicit `SKILL_ID`. The wallet does not expose a generic `execute`
method; runtime actions must use `executeSkill`.

```bash
export MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
export AGENT_PRIVATE_KEY=0x...
export WALLET_ADDRESS=0x...
export SKILL_REGISTRY_ADDRESS=0x...
export SKILL_ID=0x...
export AGENT_API_TOKEN=local-demo-token
export DRY_RUN=true
npm run agent:runtime
```

Endpoints:

- `GET /health`
- `GET /decisions`
- `POST /tick` with `Authorization: Bearer <AGENT_API_TOKEN>` when
  `AGENT_API_TOKEN` is set

Set `DRY_RUN=false` only after `/tick` simulation succeeds and the wallet policy
limits are deliberately low.

Browser-guided flow:

- `/activate` deploys an agent wallet through `AgenticWalletFactory`.
- `/bootstrap` allows the SkillRegistry target/selectors and sets skill-specific limits.
- `/demo` verifies wallet connection, target chain, contract health, indexer URL, and runtime URL.
- Keep `DRY_RUN=true` until indexer, runtime, and wallet policy checks all pass on Railway.

## Railway Deployment Notes

Use `RAILWAY.md` for the service split and required environment variables.
Railway runs only the agent runtime, Envio indexer service, and an attached
Postgres plugin. Deploy the frontend on Vercel with public `VITE_*` variables.
Keep private keys and API tokens only in Railway service variables or a local
`.env` file. Never paste deployer keys, wallet private keys, or seed phrases
into chat.
