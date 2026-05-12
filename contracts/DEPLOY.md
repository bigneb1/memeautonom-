# MemeAutonom Contracts — Deploy Guide

Solidity sources for the four core contracts referenced by `INTEGRATION.md`:

| Contract | File | Purpose |
|---|---|---|
| `ERC8004Identity` | `src/ERC8004Identity.sol` | Per-wallet on-chain identity (id + IPFS metadata URI) |
| `JobRegistry` | `src/JobRegistry.sol` | USDC-settled job marketplace between wallets |
| `SkillRegistry` | `src/SkillRegistry.sol` | Publish / install / fire decision-module skills |
| `AgenticWalletFactory` (+ `AgenticWallet`) | `src/AgenticWalletFactory.sol` | CREATE2 factory for agent-controlled smart accounts |

Target network: **Mantle Sepolia** (chainId `5003`, RPC `https://rpc.sepolia.mantle.xyz`).

---

## 1. Prerequisites

```bash
# Foundry (recommended)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Project bootstrap (run from this `contracts/` folder)
forge init --no-git --force .
# Move the existing src/*.sol back if forge init wiped them, or just:
forge build
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

---

## 2. Constructor parameters

| Contract | Constructor args |
|---|---|
| `ERC8004Identity` | *(none)* |
| `SkillRegistry` | *(none)* |
| `JobRegistry` | `(address usdc, address identity, address feeSink, uint16 feeBps)` — `feeBps` e.g. `250` = 2.5% |
| `AgenticWalletFactory` | `(address identity)` |

Deploy order: **Identity → SkillRegistry → JobRegistry → Factory.**

---

## 3. Deploy with `forge create`

```bash
# 1) Identity
forge create src/ERC8004Identity.sol:ERC8004Identity \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast

# 2) SkillRegistry
forge create src/SkillRegistry.sol:SkillRegistry \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast

# 3) JobRegistry  (replace IDENTITY with output of step 1)
forge create src/JobRegistry.sol:JobRegistry \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast \
  --constructor-args $USDC <IDENTITY_ADDR> $FEE_SINK 250

# 4) Factory
forge create src/AgenticWalletFactory.sol:AgenticWalletFactory \
  --rpc-url $MANTLE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast \
  --constructor-args <IDENTITY_ADDR>
```

Verify on Mantlescan:

```bash
forge verify-contract <ADDR> src/JobRegistry.sol:JobRegistry \
  --chain 5003 --etherscan-api-key $MANTLESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address,uint16)" $USDC <IDENTITY> $FEE_SINK 250)
```

---

## 4. Wire addresses back into the app

After deploy, paste each address in **/admin** in the running app, OR set them
as build-time env vars (preferred for production):

```env
VITE_IDENTITY_ADDRESS=0x...
VITE_SKILL_REGISTRY_ADDRESS=0x...
VITE_JOB_REGISTRY_ADDRESS=0x...
VITE_WALLET_FACTORY_ADDRESS=0x...
VITE_USDC_ADDRESS=0x...
```

Then point the **Envio indexer** (`/envio-indexer`) at the same addresses
inside `config.yaml` and run `pnpm envio dev`.

---

## 5. Sanity calls (cast)

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
