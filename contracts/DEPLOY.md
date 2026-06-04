# MemeAutonom Contracts — Deploy Guide

Solidity sources for the six core contracts referenced by `INTEGRATION.md`:

| Contract                                   | File                           | Purpose                                               |
| ------------------------------------------ | ------------------------------ | ----------------------------------------------------- |
| `ERC8004Identity`                          | `src/ERC8004Identity.sol`      | Per-wallet on-chain identity (id + IPFS metadata URI) |
| `ERC8004Reputation`                        | `src/ERC8004Reputation.sol`    | Permissioned reputation records and aggregate score   |
| `ERC8004Validation`                        | `src/ERC8004Validation.sol`    | Agent validation request / response records           |
| `JobRegistry`                              | `src/JobRegistry.sol`          | USDC-settled job marketplace between wallets          |
| `SkillRegistry`                            | `src/SkillRegistry.sol`        | Publish / install / fire decision-module skills       |
| `AgenticWalletFactory` (+ `AgenticWallet`) | `src/AgenticWalletFactory.sol` | CREATE2 factory for agent-controlled smart accounts   |

Default target network: **Mantle Sepolia** (chainId `5003`, RPC `https://rpc.sepolia.mantle.xyz`).
Mantle mainnet is supported only when `MANTLE_NETWORK=mainnet`,
`ALLOW_MAINNET=1`, and `MANTLE_RPC` are set explicitly.

---

## 1. Prerequisites

```bash
# Foundry (recommended)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Project bootstrap (run from this `contracts/` folder)
forge build
forge test
```

You also need:

- a deployer EOA funded with **Mantle Sepolia ETH** (faucet: https://faucet.sepolia.mantle.xyz)
- the **USDC test token address** on Mantle Sepolia (ask in Mantle discord, or deploy a `MockUSDC` ERC20 if none is canonical at deploy time)

Set env:

```bash
export MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
export PRIVATE_KEY=0x...            # deployer
export USDC=0x...                   # Mantle Sepolia USDC
export FEE_SINK=0xYourTreasury      # receives JobRegistry fees
```

For Mantle mainnet, use a fresh funded key stored only in your local shell or a
secret manager:

```bash
export MANTLE_NETWORK=mainnet
export ALLOW_MAINNET=1
export MANTLE_RPC=https://rpc.mantle.xyz
export PRIVATE_KEY=0x...
export USDC=0x...
export FEE_SINK=0xYourTreasury
```

---

## 2. Constructor parameters

| Contract               | Constructor args                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `ERC8004Identity`      | _(none)_                                                                                        |
| `ERC8004Reputation`    | `(address identity)`                                                                            |
| `ERC8004Validation`    | `(address identity)`                                                                            |
| `SkillRegistry`        | _(none)_                                                                                        |
| `JobRegistry`          | `(address usdc, address identity, address feeSink, uint16 feeBps)` — `feeBps` e.g. `250` = 2.5% |
| `AgenticWalletFactory` | `(address identity)`                                                                            |

Deploy order: **Identity → Reputation → Validation → SkillRegistry → JobRegistry → Factory.**

---

## 3. Deploy with `forge create`

```bash
# 1) Identity
forge create src/ERC8004Identity.sol:ERC8004Identity \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast

# 2) Reputation + validation registries
forge create src/ERC8004Reputation.sol:ERC8004Reputation \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast \
  --constructor-args <IDENTITY_ADDR>

forge create src/ERC8004Validation.sol:ERC8004Validation \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast \
  --constructor-args <IDENTITY_ADDR>

# 3) SkillRegistry
forge create src/SkillRegistry.sol:SkillRegistry \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast

# 4) JobRegistry
forge create src/JobRegistry.sol:JobRegistry \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast \
  --constructor-args $USDC <IDENTITY_ADDR> $FEE_SINK 250

# 5) Factory
forge create src/AgenticWalletFactory.sol:AgenticWalletFactory \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast \
  --constructor-args <IDENTITY_ADDR>

# 6) Grant registry permissions
cast send <IDENTITY_ADDR> "setRegistrar(address,bool)" <FACTORY_ADDR> true \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY

cast send <REPUTATION_ADDR> "setReporter(address,bool)" <SKILL_REGISTRY_ADDR> true \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY

cast send <REPUTATION_ADDR> "setReporter(address,bool)" <JOB_REGISTRY_ADDR> true \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY

cast send <SKILL_REGISTRY_ADDR> "setReputationRegistry(address)" <REPUTATION_ADDR> \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY

cast send <JOB_REGISTRY_ADDR> "setReputationRegistry(address)" <REPUTATION_ADDR> \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY
```

### One-command deploy path

If you already have the contract artifacts built, the repo also includes a
Node-based deploy helper that reads `contracts/out/*` and writes
`deployments.env` at the repo root:

```bash
npm run deploy:mantle
```

Required environment variables are the same as above:
`PRIVATE_KEY`, `USDC`, `FEE_SINK`, and either `MANTLE_SEPOLIA_RPC` for Sepolia
or `MANTLE_RPC` for mainnet. Optional variables: `FEE_BPS`, `START_BLOCK`,
`MANTLE_NETWORK`, `ALLOW_MAINNET`.

For wallet policy bootstrap after deployment:

```bash
npm run wallet:bootstrap
```

Set `WALLET_ADDRESS`, `TARGET_ADDRESS`, `SELECTORS`, `SKILL_ID`, `PRIVATE_KEY`,
and the correct RPC variable for the selected network. The wallet no longer
exposes a generic `execute` method; every runtime action must use
`executeSkill` with a non-zero skill id and an explicit skill policy.

After policy bootstrap, the demo runtime can fire the skill through the wallet:

```bash
DRY_RUN=true npm run agent:runtime
curl -X POST http://localhost:8091/tick
```

## 4. Configure a new agent wallet policy

`AgenticWallet` is default-deny. After the factory creates a wallet, the owner
must explicitly allow targets, function selectors, and spend limits before the
runtime signer can execute anything.

Common selectors:

| Call                                    | Selector     |
| --------------------------------------- | ------------ |
| `transfer(address,uint256)`             | `0xa9059cbb` |
| `approve(address,uint256)`              | `0x095ea7b3` |
| `transferFrom(address,address,uint256)` | `0x23b872dd` |

Example bootstrap for a low-risk Sepolia demo wallet:

```bash
# Allow SkillRegistry.fire(bytes32,bytes32)
cast send <AGENT_WALLET> "setTargetAllowed(address,bool)" <SKILL_REGISTRY_ADDR> true \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $OWNER_PRIVATE_KEY

cast send <AGENT_WALLET> "setSelectorAllowed(address,bytes4,bool)" <SKILL_REGISTRY_ADDR> 0xa9363859 true \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $OWNER_PRIVATE_KEY

# Enable a skill-specific policy with zero token/native spend for proof-of-execution calls.
cast send <AGENT_WALLET> "setSkillLimits(bytes32,uint128,uint128,bool)" <SKILL_ID> 0 0 true \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $OWNER_PRIVATE_KEY
```

For skills that move funds, call `setSkillLimits(bytes32,uint128,uint128,bool)`
and use `executeSkill(bytes32,address,uint256,bytes)` from the runtime signer.
Keep Sepolia limits low and document the exact approved targets/selectors.

Verify on Mantlescan:

```bash
forge verify-contract <ADDR> src/JobRegistry.sol:JobRegistry \
  --chain 5003 --etherscan-api-key $MANTLESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address,uint16)" $USDC <IDENTITY> $FEE_SINK 250)
```

---

## 5. Wire addresses back into the app

After deploy, set the addresses as build-time env vars for the frontend:

```env
VITE_MANTLE_CHAIN_ID=5000
VITE_MANTLE_RPC=https://rpc.mantle.xyz
VITE_MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
VITE_IDENTITY_ADDRESS=0x...
VITE_REPUTATION_ADDRESS=0x...
VITE_VALIDATION_ADDRESS=0x...
VITE_SKILL_REGISTRY_ADDRESS=0x...
VITE_JOB_REGISTRY_ADDRESS=0x...
VITE_WALLET_FACTORY_ADDRESS=0x...
VITE_USDC_ADDRESS=0x...
```

Then point the **Envio indexer** (`/envio-indexer`) at the same addresses
inside `config.yaml` and run `npm run dev`.

After `forge build`, sync ABIs for Envio:

```bash
npm run indexer:sync-abis
```

You can also generate a machine-readable environment blob from the deploy
output:

```bash
npm run deploy:env -- ./deployments.env
```

---

## 6. Sanity calls (cast)

```bash
# Register an identity
cast send <IDENTITY> "register(string)" "ipfs://Qm.../agent.json" \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY

# Publish a skill
cast send <SKILL_REGISTRY> "publish(string,string)" "TrendScout" "ipfs://Qm.../skill.json" \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY

# Predict a wallet address before deploy
cast call <FACTORY> "predict(address,address,uint256)(address)" $OWNER $SIGNER 1
```
