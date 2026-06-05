# MemeAutonom Railway Deployment

Railway runs only the backend services:

1. `memeautonom-agent`
2. `memeautonom-indexer`
3. one Railway Postgres plugin attached to `memeautonom-indexer`

Deploy the frontend separately on Vercel. Do not create Railway frontend or
Hasura services for this app.

## Secrets

Do not paste private keys into build logs, frontend variables, or `VITE_*`
variables. Keep deployer keys, agent runtime keys, and `AGENT_API_TOKEN` only in
Railway service variables, local shell env, or a secrets manager.

## Agent Runtime Service

Use `railway/agent-runtime.json`.

Variables:

```env
HOST=0.0.0.0
MANTLE_NETWORK=mainnet
ALLOW_MAINNET=1
MANTLE_RPC=https://rpc.mantle.xyz
AGENT_PRIVATE_KEY=
WALLET_ADDRESS=
SKILL_REGISTRY_ADDRESS=0x27997b8ed551d1f88683c2b02f50a90261fc3b0b
SKILL_ID=
AGENT_API_TOKEN=
DRY_RUN=true
AUTO_START=false
PUBLIC_DECISIONS=true
BYREAL_ENABLED=true
BYREAL_REQUIRED=false
BYREAL_ARGS=--non-interactive skill
```

Public endpoints:

- `GET /health`
- `GET /decisions`

Operator endpoint:

- `POST /tick` requires `Authorization: Bearer <AGENT_API_TOKEN>` when
  `AGENT_API_TOKEN` is set.

Set `DRY_RUN=false` only after `/tick` simulation succeeds and wallet policy
limits are intentionally low. Byreal is installed as an optional preview layer;
Mantle execution is still `AgenticWallet.executeSkill(...)` against
`SkillRegistry.fire(...)`.

## Envio Indexer Service

Use `railway/envio-indexer.json` and attach one Railway Postgres plugin to this
service.

The service starts a small wrapper at `envio-indexer/scripts/indexer-service.mjs`.
The wrapper starts `envio start` internally with `ENVIO_HASURA=false`, writes
events into Postgres, and exposes the frontend read model at `/v1/graphql`.
This keeps Railway to one indexer service without a separate Hasura service.

Variables:

```env
MANTLE_CHAIN_ID=5000
MANTLE_RPC_URL=https://rpc.mantle.xyz
START_BLOCK=96223050
IDENTITY_ADDRESS=0xe8910a5205695efab09a030b004770303ab4b2b1
REPUTATION_ADDRESS=0xf2b6d37a4eecc8cef39225e84bfb81c31bac525e
VALIDATION_ADDRESS=0x3dc4de8a358ef667107f45626589d0d02a3d84e3
SKILL_REGISTRY_ADDRESS=0x27997b8ed551d1f88683c2b02f50a90261fc3b0b
JOB_REGISTRY_ADDRESS=0x7f6349a6401f9d5584c34f87d8c4ee01285453da
WALLET_FACTORY_ADDRESS=0x10c691d2eaaf625c32b9fe608f5a3c0a2be7e3f7
DATABASE_URL=${{Postgres.DATABASE_URL}}
ENVIO_PG_SSL_MODE=require
ENVIO_HASURA=false
ENVIO_INDEXER_PORT=9898
INDEXER_API_MAX_FIRST=100
```

Railway health check:

```text
/health
```

Frontend GraphQL URL:

```text
https://<indexer-service>.up.railway.app/v1/graphql
```

## Vercel Frontend Variables

Set these in Vercel Project Settings -> Environment Variables:

```env
VITE_WALLETCONNECT_PROJECT_ID=
VITE_INDEXER_URL=https://<indexer-service>.up.railway.app/v1/graphql
VITE_AGENT_URL=https://<agent-service>.up.railway.app
VITE_MANTLE_CHAIN_ID=5000
VITE_MANTLE_RPC=https://rpc.mantle.xyz
VITE_IDENTITY_ADDRESS=0xe8910a5205695efab09a030b004770303ab4b2b1
VITE_REPUTATION_ADDRESS=0xf2b6d37a4eecc8cef39225e84bfb81c31bac525e
VITE_VALIDATION_ADDRESS=0x3dc4de8a358ef667107f45626589d0d02a3d84e3
VITE_SKILL_REGISTRY_ADDRESS=0x27997b8ed551d1f88683c2b02f50a90261fc3b0b
VITE_JOB_REGISTRY_ADDRESS=0x7f6349a6401f9d5584c34f87d8c4ee01285453da
VITE_WALLET_FACTORY_ADDRESS=0x10c691d2eaaf625c32b9fe608f5a3c0a2be7e3f7
VITE_USDC_ADDRESS=0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9
```

Do not set `AGENT_API_TOKEN` or any private key in Vercel.

## First Production Agent Wallet

Run locally after setting a fresh owner/deployer key in your shell:

```bash
export MANTLE_NETWORK=mainnet
export ALLOW_MAINNET=1
export MANTLE_RPC=https://rpc.mantle.xyz
export PRIVATE_KEY=0x...
export WALLET_FACTORY_ADDRESS=0x10c691d2eaaf625c32b9fe608f5a3c0a2be7e3f7
export SKILL_REGISTRY_ADDRESS=0x27997b8ed551d1f88683c2b02f50a90261fc3b0b
export WALLET_SIGNER=0x...
export WALLET_SALT=1
export SKILL_NAME=MemeAutonomProofSkill
export SKILL_MAX_CALL_AMOUNT=0
export SKILL_DAILY_LIMIT=0
npm run agent:activate-mainnet
```

This writes `agent.deployments.env`. Copy `WALLET_ADDRESS`,
`SKILL_REGISTRY_ADDRESS`, and `SKILL_ID` into the Railway agent service. Set
`AGENT_PRIVATE_KEY` to the runtime signer key and keep `DRY_RUN=true` for the
first observed `/tick`.

## Production Check

1. Open the Vercel app `/demo`.
2. Confirm contract health is green.
3. Confirm `VITE_INDEXER_URL` and `VITE_AGENT_URL` are configured.
4. Open `https://<indexer-service>.up.railway.app/health`.
5. Run the app diagnostics panel and confirm GraphQL probes return `OK`.
6. Open `https://<agent-service>.up.railway.app/health`.
7. Trigger `POST /tick` with the bearer token while `DRY_RUN=true`.
8. Wait for the Envio service to index the emitted event.
9. Set `DRY_RUN=false` only after the dry-run and policy checks are correct.
