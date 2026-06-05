# MemeAutonom Integration And Product Scope

MemeAutonom is being narrowed into a Mantle-native product for **on-chain
identity, reputation, and execution history for autonomous agent wallets**.

The product should not claim full ERC-8004 compliance or unattended fund
management. The current repo is wired as a production beta: Mantle mainnet
contracts are deployed, the frontend reads live wallet and contract state, the
generic wallet `execute` surface is removed, and Railway service configs exist
for the indexer and runtime. The remaining operational milestone is one
observed Railway loop:

1. A user connects a wallet on the configured Mantle target.
2. The user deploys or registers an agent wallet.
3. The agent wallet receives an ERC-8004-style identity record.
4. The user installs one bounded skill.
5. An off-chain runtime executes one safe, policy-limited action.
6. Contracts emit events.
7. Envio indexes the events.
8. The dashboard shows identity, skill fire count, execution history, and
   reputation.

That loop is the minimum viable product for the Turing Test Hackathon 2026
**Agentic Wallets & Economy** track.

## Product Positioning

Primary positioning:

> MemeAutonom gives autonomous wallets on Mantle an identity, skills,
> transparent execution history, and reputation.

Avoid broader claims until the system proves them on-chain:

- Do not call this a full wallet OS yet.
- Do not claim full ERC-8004 compliance until the contract model is aligned
  with the standard.
- Do not claim agents can safely run forever.
- Do not imply zero human control. The product should be policy-governed:
  humans configure limits, agents act within those limits, and every action is
  recorded.

## MVP User Journey

The production-facing flow should be:

1. Connect wallet.
2. Use Mantle mainnet as the production target.
3. Activate an agent wallet.
4. Register an identity record.
5. Install a starter skill.
6. Fund with a capped amount.
7. Start the agent runtime.
8. Watch one on-chain action appear in the dashboard.
9. Review execution history, skill fires, reputation, and transaction links.
10. Pause the agent or withdraw funds.

Mainnet writes should stay behind explicit operator confirmation, low wallet
policy limits, and `DRY_RUN=true` runtime rehearsal until the Railway loop is
green.

## Current Architecture

```text
User Wallet
  |
  | injected wallet connector + wagmi/viem
  v
MemeAutonom Frontend
  |              |
  | wagmi/viem   | GraphQL
  v              v
Mantle RPC     Envio Indexer
  |              ^
  | events       |
  v              |
Contracts on Mantle
  | Identity registry
  | Reputation registry
  | Validation registry
  | Agentic wallet factory
  | Skill registry
  | Job registry
  v
Railway Agent Runtime
  | reads installed skills
  | simulates bounded actions
  | sends transactions through AgenticWallet
  | exposes health and decision logs
```

## Repository Map

| Area            | Path                | Status                                                                  |
| --------------- | ------------------- | ----------------------------------------------------------------------- |
| Frontend        | `src/`              | Builds, runs, and reads live Mantle wallet/contract state.              |
| Runtime config  | `src/lib/config.ts` | Uses build env vars first, with browser-local operator overrides.       |
| GraphQL adapter | `src/lib/api.ts`    | Supports wallet detail, leaderboard, feed, economy, and skills queries. |
| Contracts       | `contracts/src/`    | Mainnet deployed MVP with Foundry lifecycle tests.                      |
| Indexer         | `envio-indexer/`    | Envio config and codegen pass; deploy as a Railway service.             |
| Runbook         | `RUNBOOK.md`        | Local setup, contract, indexer, runtime, and Railway commands.          |

## Environment Variables

Frontend variables are public because Vite bundles `VITE_*` into the browser.
Never put private keys, seed phrases, API secrets, or relayer keys in `VITE_*`.

```env
VITE_WALLETCONNECT_PROJECT_ID=
VITE_INDEXER_URL=
VITE_AGENT_URL=
VITE_MANTLE_CHAIN_ID=5000
VITE_MANTLE_RPC=https://rpc.mantle.xyz
VITE_IDENTITY_ADDRESS=0xe8910a5205695efab09a030b004770303ab4b2b1
VITE_REPUTATION_ADDRESS=0xf2b6d37a4eecc8cef39225e84bfb81c31bac525e
VITE_VALIDATION_ADDRESS=0x3dc4de8a358ef667107f45626589d0d02a3d84e3
VITE_JOB_REGISTRY_ADDRESS=0x7f6349a6401f9d5584c34f87d8c4ee01285453da
VITE_SKILL_REGISTRY_ADDRESS=0x27997b8ed551d1f88683c2b02f50a90261fc3b0b
VITE_WALLET_FACTORY_ADDRESS=0x10c691d2eaaf625c32b9fe608f5a3c0a2be7e3f7
VITE_USDC_ADDRESS=0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9
```

Server-side/runtime secrets belong only in Railway service variables, a local
`.env` file, or a secrets manager:

```env
MANTLE_RPC=
AGENT_PRIVATE_KEY=
AGENT_API_TOKEN=
MANTLESCAN_API_KEY=
IPFS_API_TOKEN=
```

## Networks

| Network        | Chain ID | RPC                              | Explorer                         |
| -------------- | -------: | -------------------------------- | -------------------------------- |
| Mantle Mainnet |     5000 | `https://rpc.mantle.xyz`         | `https://mantlescan.xyz`         |
| Mantle Sepolia |     5003 | `https://rpc.sepolia.mantle.xyz` | `https://sepolia.mantlescan.xyz` |

Use Mantle mainnet for the production beta. Mantle Sepolia remains available
only for explicit local tests. Mainnet writes require `ALLOW_MAINNET=1` and
intentionally low wallet policy limits.

## Contracts Scope

The MVP contracts are event-first, registry-driven contracts:

- `ERC8004Identity.sol`: minimal identity registry with metadata URI. It is
  ERC-8004-style but not a complete ERC-8004 implementation.
- `ERC8004Reputation.sol`: append-only reputation event registry with
  permissioned reporters and an MVP aggregate score.
- `ERC8004Validation.sol`: request/response validation registry for verifier
  attestations tied to agent identity ids.
- `AgenticWalletFactory.sol`: CREATE2 wallet factory and policy-limited
  signer-controlled wallet.
- `SkillRegistry.sol`: skill publish/install/status/fire events.
- `JobRegistry.sol`: USDC-settled job lifecycle.

Production hardening still needs:

- Contract verification on Mantlescan.
- External review or audit before meaningful user funds.
- Broader adversarial tests around wallet policy, recovery, and registry abuse.
- Monitoring around Railway runtime, indexer lag, and failed wallet actions.

## ERC-8004 Direction

The hackathon references ERC-8004 agent identity and reputation. This repo now
moves beyond a simple `ERC8004Identity` registry toward three clear surfaces:

- Identity records: agent wallet, runtime signer/controller, metadata URI,
  created time.
- Reputation records: append-only reputation events emitted by authorized
  registries through `ERC8004Reputation`.
- Validation records: verifier attestations about jobs, skills, and execution
  outcomes through `ERC8004Validation`.

Until that work is complete, user-facing copy should say **ERC-8004-style** or
**agent identity registry**, not full ERC-8004 compliance.

## Indexer Requirements

The frontend needs these GraphQL views:

```graphql
query WalletDetail($addr: String!) {
  wallet(id: $addr) {
    address
    role
    reputation
    jobsCompleted
    volumeUsdc
    autonomyScore
    activatedAt
    skills {
      name
      status
      fires
    }
    executions(first: 20, orderBy: timestamp, orderDirection: desc) {
      timestamp
      action
      detail
      txHash
      color
    }
  }
}

query Leaderboard($first: Int!) {
  wallets(first: $first, orderBy: reputation, orderDirection: desc) {
    address
    role
    reputation
    jobsCompleted
    volumeUsdc
    autonomyScore
    activatedAt
    skills {
      name
      status
      fires
    }
  }
}

query EconomyStats {
  economyStat(id: "global") {
    activeWallets
    jobsToday
    usdcSettled
    avgDecisionMs
    updatedAt
  }
}

query LatestExecutions($first: Int!) {
  executions(first: $first, orderBy: timestamp, orderDirection: desc) {
    timestamp
    action
    detail
    txHash
    color
    wallet {
      address
    }
  }
}
```

`envio-indexer/schema.graphql` and `src/lib/api.ts` should stay aligned. The
dashboard should not read from `src/lib/mock.ts` once the indexer is live.

## Agent Runtime Requirements

The runtime is the product engine. The frontend only observes and controls it.

Minimum runtime:

- Reads wallet, skill, and job state through viem.
- Loads installed skills.
- Evaluates a fixed tick loop.
- Simulates any proposed transaction.
- Checks target allowlists, spending caps, and daily limits.
- Sends transactions through `AgenticWallet`.
- Persists decision logs.
- Exposes `/health`.
- Exposes `/decisions`.
- Stores private keys only in Railway service variables, local env files, or a secrets manager.

The repo includes a minimal runtime at `scripts/agent-runtime.mjs`. It is not a
general AI framework; it is a bounded demo loop that simulates and then sends a
single `SkillRegistry.fire` call through `AgenticWallet`. Use it to prove the
hackathon loop before adding higher-risk skills.

The first skill should be deliberately low risk. Prefer a demo-job skill or
bounded proof-of-execution skill over trading or treasury movement.

## Mainnet Readiness Checklist

Mantle production beta status:

- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Contract tests cover identity, skill, job, validation, and wallet execution flows.
- [x] Contracts deploy cleanly to Mantle mainnet through a guarded script.
- [x] Mainnet deployment requires explicit `ALLOW_MAINNET=1` confirmation.
- [x] Frontend routes read live connected-wallet and contract-health data.
- [x] Wallet execution is capped by skill permissions and spend limits.
- [x] Secrets are kept outside the frontend bundle.
- [x] Railway Envio service can run without Hasura and serve frontend queries.
- [x] Railway agent runtime exposes health/decisions and protects `/tick`.
- [ ] First production wallet policy is bootstrapped with deliberately low limits.
- [ ] Monitoring and health checks are enabled on Railway.
- [ ] Mantlescan verification and external review are completed before meaningful user funds.

## Hackathon Submission Criteria

For the Turing Test Hackathon, the demo should show:

- A Mantle contract deployment.
- An agent wallet identity record.
- One installed skill.
- One autonomous, policy-limited on-chain action.
- An emitted event.
- Envio indexing that event.
- A live dashboard update.
- A clear explanation of how identity, skill fires, reputation, and execution
  history create transparent agent benchmarking.

## Build Order

1. Stabilize repo and package manager. Done.
2. Lock product scope and remove stale claims. Done.
3. Align identity/reputation with ERC-8004 concepts. Done.
4. Harden `AgenticWallet`. Done.
5. Complete job, skill, validation, and wallet lifecycle tests. Done.
6. Add deployment scripts. Done.
7. Finish Envio codegen and Railway config. Done.
8. Wire frontend to live wallet and contract data. Done.
9. Build activation UX. Done.
10. Build the runtime. Done.
11. Bootstrap the first production policy wallet. Next step.
12. Deploy Railway indexer/runtime and run the first observed mainnet loop.
