# MemeAutonom Envio Indexer

[Envio HyperIndex](https://docs.envio.dev) configuration that powers the
**leaderboard**, **economy feed**, **ticker**, and **per-wallet skills**
queries used by the front-end (`src/lib/api.ts`, `src/components/WalletSkillsPanel.tsx`,
`src/components/DiagnosticsPanel.tsx`).

## 1. Install + run locally

```bash
npm i -g envio
cd envio-indexer
pnpm install         # or npm install
cp .env.example .env # fill in addresses + start blocks
pnpm envio dev       # spins up Postgres + GraphQL @ http://localhost:8080/v1/graphql
```

Open http://localhost:8080 and run a probe:

```graphql
query { wallets(limit: 5, order_by: { reputation: desc }) {
  address role reputation jobsCompleted skills { name fires status }
} }
```

## 2. Deploy to hosted Envio

```bash
pnpm envio login
pnpm envio deploy
# → returns https://indexer.bigdevenergy.link/<id>/v1/graphql
```

Paste the URL in the running app at **/admin → VITE_INDEXER_URL**, or set as
a build env var and republish.

## 3. Files

- `config.yaml` — networks, contracts, ABIs, start blocks
- `schema.graphql` — Wallet / Skill / SkillInstall / Execution / Job entities
- `src/EventHandlers.ts` — handler stubs for every event in the 4 contracts
- `abis/*.json` — copy ABIs from `forge build` output:
  ```bash
  jq .abi ../contracts/out/JobRegistry.sol/JobRegistry.json > abis/JobRegistry.json
  jq .abi ../contracts/out/SkillRegistry.sol/SkillRegistry.json > abis/SkillRegistry.json
  jq .abi ../contracts/out/ERC8004Identity.sol/ERC8004Identity.json > abis/ERC8004Identity.json
  jq .abi ../contracts/out/AgenticWalletFactory.sol/AgenticWalletFactory.json > abis/AgenticWalletFactory.json
  ```
