# MemeAutonom Envio Indexer

[Envio HyperIndex](https://docs.envio.dev) configuration that powers the
**leaderboard**, **economy feed**, **ticker**, and **per-wallet skills**
queries used by the front-end (`src/lib/api.ts`, `src/components/WalletSkillsPanel.tsx`,
`src/components/DiagnosticsPanel.tsx`).

## 1. Install + run locally

```bash
npm i -g envio
cd envio-indexer
npm install
cp .env.example .env # fill in addresses + start blocks
npm run codegen
npm run dev          # spins up Postgres + GraphQL @ http://localhost:8080/v1/graphql
```

For Mantle Sepolia, use `MANTLE_CHAIN_ID=5003` and
`MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz`. For Mantle mainnet, use
`MANTLE_CHAIN_ID=5000` and `MANTLE_RPC_URL=https://rpc.mantle.xyz`.

Open http://localhost:8080 and run a probe:

```graphql
query {
  wallets(first: 5, orderBy: reputation, orderDirection: desc) {
    address
    role
    reputation
    jobsCompleted
    skills {
      name
      fires
      status
    }
  }
}
```

## 2. Deploy to hosted Envio or Railway

```bash
npx envio login
npm run deploy
# → returns https://indexer.bigdevenergy.link/<id>/v1/graphql
```

Paste the URL in the running app at **/admin → VITE_INDEXER_URL**, or set as
a build env var and republish.

For Railway, use `RAILWAY.md`. The indexer service needs the same contract
addresses and one Railway Postgres plugin. `npm start` runs
`scripts/indexer-service.mjs`, which starts `envio start` internally with
`ENVIO_HASURA=false` and exposes the frontend read model at `/v1/graphql` from
the same service.

## 3. Files

- `config.yaml` — networks, contracts, ABIs, start blocks
- `schema.graphql` — Wallet / identity / reputation / validation / skill / job entities
- `src/EventHandlers.ts` — handlers for core events plus MVP economy aggregation
- `abis/*.json` — copy ABIs from `forge build` output:
  ```bash
  cd ..
  npm run indexer:sync-abis
  ```
