# MemeAutonom

MemeAutonom is a Mantle-native reputation and execution layer for autonomous
agent wallets. It gives each agent wallet an on-chain identity, bounded skills,
indexed execution history, and a public reputation trail that judges, users, and
operators can inspect.

The project is built for the [Mantle Turing Test Hackathon 2026](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail),
which focuses on benchmarking autonomous agents on Mantle. MemeAutonom targets
the agent-wallet infrastructure problem behind that benchmark: if agents can
trade, route, or perform on-chain work, they also need a verifiable identity,
policy boundary, execution record, and reputation surface.

## Product Thesis

AI agents should not be evaluated only by screenshots, off-chain logs, or claims.
MemeAutonom turns agent wallet activity into a public record:

- **Identity:** each agent wallet can register metadata and a controller/signer
  relationship on Mantle.
- **Policy:** agent wallets execute only installed skills with explicit target,
  selector, and spend limits.
- **Execution history:** every meaningful action emits events for indexing.
- **Reputation:** skill fires, completed jobs, validations, and outcomes build a
  wallet-level reputation score.
- **Discovery:** the frontend exposes wallet graph navigation, leaderboard,
  wallet detail pages, and a presentation-ready demo view.

## Hackathon Fit

The Turing Test Hackathon is centered on on-chain AI agents, Byreal/Mantle
execution, and transparent benchmarking. MemeAutonom supports that theme by
providing the infrastructure layer around the agents:

- Agent wallets are discoverable and clickable, with Arkham-style wallet detail
  routes at `/wallet/$address`.
- Byreal is integrated as an optional runtime skill layer for agent execution
  workflows.
- Envio indexes Mantle events into a GraphQL read model for the frontend.
- The generic `AgenticWallet.execute(...)` method has been removed; runtime
  actions must use `executeSkill(...)` with a specific installed skill policy.
- The app reads connected wallet and contract state from Mantle RPC instead of
  showing only mocked presentation data.

## Live Architecture

```text
User wallet
  |
  | wagmi + viem
  v
Vercel frontend
  |                         |
  | Mantle RPC reads         | GraphQL
  v                         v
Mantle contracts       Railway Envio indexer
  ^
  |
Railway agent runtime
  |
  | executeSkill(...)
  v
Agentic wallet policy
```

## Repository Map

| Area | Path | Purpose |
| --- | --- | --- |
| Frontend | `src/` | TanStack Start/Vite app for wallet graph, dashboard, demo, activation, and policy bootstrap |
| Contracts | `contracts/src/` | Identity, reputation, validation, skill, job, and agent wallet contracts |
| Envio indexer | `envio-indexer/` | Event handlers, schema, and Railway-ready indexer wrapper |
| Agent runtime | `scripts/agent-runtime.mjs` | Policy-aware runtime that can dry-run or fire installed skills |
| Railway configs | `railway/` | Service configs for the agent runtime and Envio indexer |
| Operations docs | `RUNBOOK.md`, `RAILWAY.md`, `INTEGRATION.md` | Local, deployment, and product integration guides |

## Deployed Mantle Mainnet Contracts

| Contract | Address |
| --- | --- |
| Identity | `0xe8910a5205695efab09a030b004770303ab4b2b1` |
| Reputation | `0xf2b6d37a4eecc8cef39225e84bfb81c31bac525e` |
| Validation | `0x3dc4de8a358ef667107f45626589d0d02a3d84e3` |
| SkillRegistry | `0x27997b8ed551d1f88683c2b02f50a90261fc3b0b` |
| JobRegistry | `0x7f6349a6401f9d5584c34f87d8c4ee01285453da` |
| WalletFactory | `0x10c691d2eaaf625c32b9fe608f5a3c0a2be7e3f7` |
| USDC | `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9` |

First production agent wallet:

| Field | Value |
| --- | --- |
| Wallet | `0x667818F30f36bf34ef7eDb74A5955aAe1DB3aA29` |
| Owner/signer | `0xb12A68eFBFe9234Fa215Fa7AC97aE06421Ba5FEC` |
| Skill | `MemeAutonomProofSkill` |
| Skill ID | `0x9e425249a13c21631832f8fff36284644a4fc96b140b6ac2304dfba1f8eb92eb` |
| Limits | `maxCallAmount=0`, `dailySpendLimit=0` |

## Core User Flow

1. Connect a wallet on Mantle.
2. Open `/demo` to verify chain, contract health, indexer URL, and runtime URL.
3. Open `/activate` to create or inspect an agent wallet from the factory.
4. Open `/bootstrap` to install a skill and configure target/selector limits.
5. Run the Railway agent runtime in `DRY_RUN=true` mode.
6. Trigger a runtime tick, inspect decisions, and confirm the policy checks.
7. Start the Envio indexer and watch emitted events appear in the dashboard.
8. Click wallet graph nodes or leaderboard entries to inspect wallet detail
   pages.

## Local Development

Prerequisites:

- Node.js 20+
- npm 10+
- Foundry, for Solidity tests and deployment work

Install and run:

```bash
npm ci
npm run dev
```

Verification:

```bash
npm run lint
npm run build
```

The production build uses Nitro's Vercel preset and writes Vercel Build Output
API files to `.vercel/output`. This is intentional. It fixes the common failure
mode where Vercel marks a TanStack Start build as successful but serves the
wrong static folder, causing direct links such as `/demo`, `/activate`, or
`/wallet/:address` to show a blank/error page.

## Frontend Environment

Create `.env.local` for local frontend values:

```env
VITE_WALLETCONNECT_PROJECT_ID=
VITE_INDEXER_URL=
VITE_AGENT_URL=
VITE_MANTLE_CHAIN_ID=5000
VITE_MANTLE_RPC=https://rpc.mantle.xyz
VITE_MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
VITE_IDENTITY_ADDRESS=0xe8910a5205695efab09a030b004770303ab4b2b1
VITE_REPUTATION_ADDRESS=0xf2b6d37a4eecc8cef39225e84bfb81c31bac525e
VITE_VALIDATION_ADDRESS=0x3dc4de8a358ef667107f45626589d0d02a3d84e3
VITE_SKILL_REGISTRY_ADDRESS=0x27997b8ed551d1F88683C2b02F50A90261fc3b0b
VITE_JOB_REGISTRY_ADDRESS=0x7f6349a6401f9d5584c34f87d8c4ee01285453da
VITE_WALLET_FACTORY_ADDRESS=0x10c691d2eaaf625c32b9fe608f5a3c0a2be7e3f7
VITE_USDC_ADDRESS=0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9
```

Never put private keys, seed phrases, deployer keys, or `AGENT_API_TOKEN` in
`VITE_*` variables. Vite exposes those values to browsers.

## Vercel Deployment

Deploy only the frontend to Vercel.

Recommended Vercel settings:

- Framework preset: Vite or Other
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave blank
- Node.js version: 22.x

Required Vercel variables:

```env
VITE_INDEXER_URL=https://<memeautonom-indexer>.up.railway.app/v1/graphql
VITE_AGENT_URL=https://<memeautonom-agent>.up.railway.app
VITE_MANTLE_CHAIN_ID=5000
VITE_MANTLE_RPC=https://rpc.mantle.xyz
VITE_MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
VITE_IDENTITY_ADDRESS=0xe8910a5205695efab09a030b004770303ab4b2b1
VITE_REPUTATION_ADDRESS=0xf2b6d37a4eecc8cef39225e84bfb81c31bac525e
VITE_VALIDATION_ADDRESS=0x3dc4de8a358ef667107f45626589d0d02a3d84e3
VITE_SKILL_REGISTRY_ADDRESS=0x27997b8ed551d1F88683C2b02F50A90261fc3b0b
VITE_JOB_REGISTRY_ADDRESS=0x7f6349a6401f9d5584c34f87d8c4ee01285453da
VITE_WALLET_FACTORY_ADDRESS=0x10c691d2eaaf625c32b9fe608f5a3c0a2be7e3f7
VITE_USDC_ADDRESS=0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9
```

Do not set Railway-only secrets in Vercel.

## Railway Services

Railway runs only backend services:

```text
Railway project
├── memeautonom-agent       agent runtime service
├── memeautonom-indexer     Envio indexer service
└── Postgres                database attached to indexer
```

Both Railway services point to this same GitHub repository root. They are
service names, not folders.

Agent service:

- Config file: `railway/agent-runtime.json`
- Start script: `npm run agent:runtime`
- Health: `/health`
- Public decisions: `/decisions`
- Operator tick: `POST /tick` with `Authorization: Bearer <AGENT_API_TOKEN>`

Indexer service:

- Config file: `railway/envio-indexer.json`
- Start script: `cd envio-indexer && npm start`
- Health: `/health`
- GraphQL: `/v1/graphql`
- Database: Railway Postgres via `DATABASE_URL`

Use `RAILWAY.md` for the complete Railway step-by-step deployment guide.

## Contracts

Run contract tests:

```bash
cd contracts
forge test
```

Core contract surfaces:

- `ERC8004Identity`: ERC-8004-style agent identity records.
- `ERC8004Reputation`: reputation records and aggregate score.
- `ERC8004Validation`: validation request/response registry.
- `SkillRegistry`: publish, install, and fire bounded skills.
- `JobRegistry`: USDC-settled jobs.
- `AgenticWalletFactory`: deterministic agent wallet deployment.
- `AgenticWallet`: policy-limited wallet with `executeSkill(...)`.

The contracts are production-beta infrastructure, not audited custody software.
Keep value movement behind low limits until external review is complete.

## Envio Indexer

Run locally:

```bash
cd envio-indexer
npm ci
npm run codegen
npm run dev
```

The Railway wrapper starts Envio and exposes a frontend read model at
`/v1/graphql` without a separate Hasura service.

## Agent Runtime

Local dry-run:

```bash
export MANTLE_NETWORK=mainnet
export ALLOW_MAINNET=1
export MANTLE_RPC=https://rpc.mantle.xyz
export AGENT_PRIVATE_KEY=0x...
export WALLET_ADDRESS=0x667818F30f36bf34ef7eDb74A5955aAe1DB3aA29
export SKILL_REGISTRY_ADDRESS=0x27997b8ed551d1F88683C2b02F50A90261fc3b0b
export SKILL_ID=0x9e425249a13c21631832f8fff36284644a4fc96b140b6ac2304dfba1f8eb92eb
export AGENT_API_TOKEN=local-demo-token
export DRY_RUN=true
npm run agent:runtime
```

Switch `DRY_RUN=false` only after:

- `/health` is green.
- `/tick` simulation succeeds.
- target and selector policies are correct.
- spend limits are intentionally low.
- Envio is indexing emitted events.

## Demo Script For Judges

1. Open `/demo`.
2. Connect a wallet and show real Mantle chain, balance, contract health, and
   predicted wallet reads.
3. Open `/activate` and show how an agent wallet is created or inspected.
4. Open `/bootstrap` and show a bounded skill policy.
5. Open Railway agent `/health` and `/decisions`.
6. Trigger a dry-run `/tick`.
7. Open the wallet graph and click a wallet node.
8. Show the wallet detail page with identity, skills, reputation, and execution
   history.

## Security Model

MemeAutonom deliberately avoids an open-ended agent wallet execution surface:

- No generic `execute(...)` function.
- Explicit skill IDs.
- Explicit allowed target addresses.
- Explicit allowed selectors.
- Per-skill max call and daily spend limits.
- Runtime dry-run mode.
- Public decision log.
- Indexer-backed event history.

Secrets are intentionally excluded from git:

- `.env.local`
- `.env.mainnet.local`
- `deployments.env`
- `agent.deployments.env`
- Railway service variables

## Current Verification

The current production-beta branch has been verified with:

- `npm run build`
- `forge test`
- Envio codegen
- mainnet read-only contract health checks
- first production wallet policy dry-run

## License

Hackathon prototype. Add the final license before production or public package
distribution.
