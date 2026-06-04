# MemeAutonom

MemeAutonom is a Mantle-native dashboard and execution layer for autonomous
agent wallets. The product focus is narrow:

> On-chain identity, transparent execution history, and reputation for
> autonomous wallets on Mantle.

The project targets the Turing Test Hackathon 2026 **Agentic Wallets &
Economy** track.

## What The MVP Must Prove

The MVP is one complete, verifiable loop:

1. Connect wallet.
2. Activate or register an agent wallet on Mantle Sepolia.
3. Register an ERC-8004-style identity record.
4. Record reputation and validation events from bounded registries.
5. Install a bounded skill.
6. Run an off-chain agent runtime.
7. Execute one safe on-chain action.
8. Emit contract events.
9. Index those events with Envio.
10. Show identity, execution history, skill fires, and reputation in the
    dashboard.

## Current Status

- Frontend builds with TanStack Start, Vite, wagmi, viem, and a lightweight injected wallet connector.
- Mantle mainnet contract addresses are wired through gitignored local env and can be exported to Railway.
- Agent wallets use `executeSkill(bytes32,address,uint256,bytes)` only; the generic `execute` surface has been removed.
- The dashboard reads connected-wallet identity, reputation, balance, and production contract health directly from Mantle RPC.
- Envio codegen is passing. Run the indexer and agent runtime as Railway services for the production loop.

## Main Areas

| Area                      | Path             |
| ------------------------- | ---------------- |
| Frontend                  | `src/`           |
| Contracts                 | `contracts/src/` |
| Envio indexer             | `envio-indexer/` |
| Product/integration scope | `INTEGRATION.md` |
| Local runbook             | `RUNBOOK.md`     |

## Local Development

```bash
npm install
npm run dev
```

Verification:

```bash
npm run lint
npm run build
```

See `RUNBOOK.md` for environment variables, contracts, indexer, and Railway notes.

## Mainnet Operation

The deployed contracts are wired for Mantle mainnet. Keep real value movement
behind explicit skill policies, low spend limits, and Railway runtime dry-runs
until the full loop is observed in production. Private keys and API secrets must
never be committed or placed in `VITE_*` variables.
