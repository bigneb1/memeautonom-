# MemeAutonom — Integration & Production Requirements

This document is the complete checklist to take the MemeAutonom frontend from
"shell with empty states" to a fully-functional autonomous-wallet OS on
**Mantle Network**. Everything the UI currently renders as empty / `—` is
covered below: where the data must come from, which contracts to deploy,
which APIs/SDKs/RPCs to wire, and the exact env vars to set.

> The frontend is already wired with **wagmi v2 + viem + RainbowKit** for
> Mantle Mainnet (`5000`) and Mantle Sepolia (`5003`). All demo data has
> been removed from `src/lib/mock.ts` — every export is an empty stub with
> the correct TypeScript shape, ready to be replaced by live reads.

---

## 0. Architecture overview

```
                ┌──────────────────────────────────┐
                │        MemeAutonom Frontend       │
                │   (TanStack Start + wagmi+viem)   │
                └───────────────┬──────────────────┘
                                │ reads
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
   on-chain reads          GraphQL/REST              WalletConnect
   (viem RPC)               Indexer                   (RainbowKit)
        │                       │                        │
┌───────▼────────┐    ┌─────────▼─────────┐     ┌────────▼────────┐
│ Mantle RPC     │    │ The Graph subgraph │     │ Wallet (signer) │
│  5000 / 5003   │    │  or custom indexer │     └─────────────────┘
└───────┬────────┘    └─────────┬─────────┘
        │                       │
┌───────▼─────────────────────────────────────────────────┐
│  Smart contracts on Mantle                              │
│  · AgenticWalletFactory     (deploys wallets)           │
│  · AgenticWallet (per user) (signs + executes)          │
│  · ERC8004Identity          (NFT identity + reputation) │
│  · JobRegistry              (post / accept / verify)    │
│  · SkillRegistry            (skill metadata)            │
│  · USDC (existing on Mantle)                            │
└─────────────────────────────────────────────────────────┘
        ▲
        │ off-chain decision loop
┌───────┴────────────────────────────┐
│  Byreal Agent Runtime (Node/Rust)  │
│  · polls on-chain state every 5s   │
│  · runs installed Skill modules    │
│  · signs txs with wallet's key     │
└────────────────────────────────────┘
```

---

## 1. Environment variables

Create the following. Publishable values can sit in `.env` (Vite reads
`VITE_*`); secrets must live in Lovable Cloud secrets (server-only).

### 1.1 Frontend (already partially wired)

| Var | Where | Purpose | Where to get it |
|---|---|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | `.env` | RainbowKit / WalletConnect v2 modal | https://cloud.reown.com (formerly WalletConnect Cloud). Currently hardcoded in `src/lib/wagmi.ts` — move to env. |
| `VITE_MANTLE_RPC_MAINNET` | `.env` | viem transport for chain 5000 | Public: `https://rpc.mantle.xyz`. Production: Ankr / BlockPI / dRPC paid tier. |
| `VITE_MANTLE_RPC_SEPOLIA` | `.env` | viem transport for chain 5003 | Public: `https://rpc.sepolia.mantle.xyz`. |
| `VITE_INDEXER_URL` | `.env` | GraphQL endpoint for leaderboard / feed / economy stats | Your own Goldsky / The Graph / Envio deployment (see §4). |
| `VITE_WALLET_FACTORY_ADDRESS` | `.env` | Address of `AgenticWalletFactory` on Mantle | After you deploy §3. |
| `VITE_ERC8004_ADDRESS` | `.env` | Address of `ERC8004Identity` | After deploy §3. |
| `VITE_JOB_REGISTRY_ADDRESS` | `.env` | Address of `JobRegistry` | After deploy §3. |
| `VITE_SKILL_REGISTRY_ADDRESS` | `.env` | Address of `SkillRegistry` | After deploy §3. |
| `VITE_USDC_ADDRESS` | `.env` | Mantle USDC | Mainnet: `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`. Sepolia: deploy a mock USDC. |

### 1.2 Backend (Lovable Cloud secrets — `secrets--add_secret`)

| Secret | Purpose | Where to get it |
|---|---|---|
| `MANTLE_RPC_PRIVATE` | Server-side RPC for indexer cron / server functions | Ankr / BlockPI dashboard |
| `INDEXER_ADMIN_KEY` | Mutate-side of your indexer (if used) | Goldsky / Envio dashboard |
| `BYREAL_API_KEY` | (Optional) hosted Byreal agent runtime | https://byreal.io once available; otherwise self-host (§5) |
| `RELAYER_PRIVATE_KEY` | (Optional) gas relayer for first-time wallet activation | Generate via `cast wallet new`, fund with MNT |
| `MANTLESCAN_API_KEY` | Verify deployed contracts & read tx receipts | https://mantlescan.xyz/myapikey |

> Never put a private key in `VITE_*` — those are bundled into the browser.

---

## 2. Networks, RPCs & SDKs

### 2.1 Networks (already configured)

| Chain | ID | RPC | Explorer |
|---|---|---|---|
| Mantle Mainnet | 5000 | https://rpc.mantle.xyz | https://mantlescan.xyz |
| Mantle Sepolia | 5003 | https://rpc.sepolia.mantle.xyz | https://sepolia.mantlescan.xyz |

Already wired in `src/lib/wagmi.ts` via `wagmi/chains` (`mantle`, `mantleSepoliaTestnet`).

### 2.2 RPC providers (pick one for production)

- **Public** — `https://rpc.mantle.xyz` — fine for low traffic, gets rate-limited.
- **Ankr** — https://www.ankr.com/rpc/mantle — generous free tier, paid for SLA.
- **BlockPI** — https://blockpi.io — Mantle endpoints with archive support.
- **dRPC** — https://drpc.org — load-balanced, websocket support.

Plug the URL into `VITE_MANTLE_RPC_MAINNET` and update
`src/lib/wagmi.ts → transports[mantle.id] = http(import.meta.env.VITE_MANTLE_RPC_MAINNET)`.

### 2.3 SDKs already installed

- `wagmi` (v2) — React hooks for chain, account, balance, contract reads/writes.
- `viem` — low-level chain client (used under the hood).
- `@rainbow-me/rainbowkit` — wallet connect modal.
- `@tanstack/react-query` — data fetching cache.

### 2.4 SDKs to add when you wire things

```bash
bun add graphql-request          # querying the indexer
bun add @tanstack/react-query    # already there; for indexer queries
bun add abitype                  # typed ABIs
bun add @reown/appkit            # optional alt to RainbowKit
```

---

## 3. Smart contracts

You need 4 contracts. Skeletons below — open them in Foundry / Hardhat /
Remix, audit them, and deploy in this order.

### 3.1 `ERC8004Identity.sol`

Soulbound (non-transferable) NFT representing a wallet's autonomous-agent
identity, plus on-chain reputation counter.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC8004Identity is ERC721, Ownable {
    uint256 public nextId = 1;
    mapping(address => uint256) public idOf;          // wallet -> tokenId
    mapping(uint256 => uint256) public reputation;    // tokenId -> rep score
    mapping(address => bool) public reputationWriter; // contracts allowed to bump rep

    event Minted(address indexed agent, uint256 indexed tokenId);
    event ReputationChanged(uint256 indexed tokenId, int256 delta, uint256 newScore);

    constructor() ERC721("MemeAutonom Agent", "MA-AGENT") Ownable(msg.sender) {}

    function mint(address to) external returns (uint256 id) {
        require(idOf[to] == 0, "already minted");
        id = nextId++;
        _safeMint(to, id);
        idOf[to] = id;
        emit Minted(to, id);
    }

    function setReputationWriter(address w, bool ok) external onlyOwner {
        reputationWriter[w] = ok;
    }

    function bumpReputation(address agent, int256 delta) external {
        require(reputationWriter[msg.sender], "not authorized");
        uint256 id = idOf[agent];
        require(id != 0, "no identity");
        uint256 cur = reputation[id];
        uint256 next = delta >= 0 ? cur + uint256(delta) : (cur > uint256(-delta) ? cur - uint256(-delta) : 0);
        reputation[id] = next;
        emit ReputationChanged(id, delta, next);
    }

    // Soulbound: block transfers
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "soulbound");
        return super._update(to, tokenId, auth);
    }
}
```

### 3.2 `AgenticWallet.sol`

Per-user smart account. Holds funds, exposes `execute()` callable only by
the owner's signing key (the off-chain Byreal runtime). Could also be an
ERC-4337 account; minimal version below.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgenticWallet {
    address public immutable owner;       // human EOA controlling activation
    address public agentSigner;           // hot key used by the off-chain runtime
    mapping(bytes32 => bool) public skillEnabled;

    event SkillToggled(bytes32 indexed skill, bool enabled);
    event Executed(address indexed to, uint256 value, bytes data, bytes result);

    modifier onlyAgent() {
        require(msg.sender == agentSigner || msg.sender == owner, "not agent");
        _;
    }

    constructor(address _owner, address _signer) {
        owner = _owner;
        agentSigner = _signer;
    }

    function setAgentSigner(address s) external {
        require(msg.sender == owner, "only owner");
        agentSigner = s;
    }

    function setSkill(bytes32 skill, bool enabled) external {
        require(msg.sender == owner, "only owner");
        skillEnabled[skill] = enabled;
        emit SkillToggled(skill, enabled);
    }

    function execute(address to, uint256 value, bytes calldata data)
        external onlyAgent returns (bytes memory)
    {
        (bool ok, bytes memory res) = to.call{value: value}(data);
        require(ok, "exec failed");
        emit Executed(to, value, data, res);
        return res;
    }

    receive() external payable {}
}
```

### 3.3 `AgenticWalletFactory.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgenticWallet.sol";
import "./ERC8004Identity.sol";

contract AgenticWalletFactory {
    ERC8004Identity public immutable identity;
    mapping(address => address) public walletOf; // owner -> wallet

    event WalletCreated(address indexed owner, address wallet, uint256 identityId);

    constructor(ERC8004Identity _id) { identity = _id; }

    function activate(address agentSigner) external returns (address w) {
        require(walletOf[msg.sender] == address(0), "already activated");
        w = address(new AgenticWallet(msg.sender, agentSigner));
        walletOf[msg.sender] = w;
        uint256 id = identity.mint(w);
        emit WalletCreated(msg.sender, w, id);
    }
}
```

### 3.4 `JobRegistry.sol`

Open marketplace where agentic wallets post jobs, others accept &
execute, verifiers confirm, and payout is released in USDC.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ERC8004Identity.sol";

contract JobRegistry {
    enum Status { Open, Accepted, Submitted, Verified, Cancelled }

    struct Job {
        address poster;
        address acceptor;
        address verifier;
        bytes32 specHash;     // hash of off-chain spec (IPFS CID)
        uint96  bounty;       // in USDC (6 decimals)
        uint64  deadline;
        Status  status;
        bytes32 resultHash;
    }

    IERC20 public immutable usdc;
    ERC8004Identity public immutable identity;
    uint256 public nextId = 1;
    mapping(uint256 => Job) public jobs;

    event JobPosted(uint256 indexed id, address indexed poster, uint96 bounty, bytes32 specHash);
    event JobAccepted(uint256 indexed id, address indexed acceptor);
    event ResultSubmitted(uint256 indexed id, bytes32 resultHash);
    event JobVerified(uint256 indexed id, address indexed verifier);

    constructor(IERC20 _usdc, ERC8004Identity _id) { usdc = _usdc; identity = _id; }

    function post(bytes32 specHash, uint96 bounty, uint64 deadline) external returns (uint256 id) {
        require(usdc.transferFrom(msg.sender, address(this), bounty), "escrow failed");
        id = nextId++;
        jobs[id] = Job(msg.sender, address(0), address(0), specHash, bounty, deadline, Status.Open, bytes32(0));
        emit JobPosted(id, msg.sender, bounty, specHash);
    }

    function accept(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == Status.Open, "not open");
        require(block.timestamp < j.deadline, "expired");
        j.acceptor = msg.sender;
        j.status = Status.Accepted;
        emit JobAccepted(id, msg.sender);
    }

    function submit(uint256 id, bytes32 resultHash) external {
        Job storage j = jobs[id];
        require(msg.sender == j.acceptor, "not acceptor");
        require(j.status == Status.Accepted, "wrong state");
        j.resultHash = resultHash;
        j.status = Status.Submitted;
        emit ResultSubmitted(id, resultHash);
    }

    function verify(uint256 id) external {
        Job storage j = jobs[id];
        require(j.status == Status.Submitted, "not submitted");
        j.verifier = msg.sender;
        j.status = Status.Verified;
        require(usdc.transfer(j.acceptor, j.bounty), "payout failed");
        identity.bumpReputation(j.acceptor, 1);
        identity.bumpReputation(j.verifier, 1);
        emit JobVerified(id, msg.sender);
    }
}
```

### 3.5 `SkillRegistry.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SkillRegistry {
    struct Skill {
        string  name;
        string  metadataURI; // IPFS json: desc, role, default cli params
        address author;
        uint64  installs;
    }
    mapping(bytes32 => Skill) public skills;
    bytes32[] public allSkills;

    event SkillRegistered(bytes32 indexed key, string name, address author);
    event SkillInstalled(bytes32 indexed key, address indexed wallet);

    function register(string calldata name, string calldata metadataURI) external returns (bytes32 key) {
        key = keccak256(bytes(name));
        require(skills[key].author == address(0), "exists");
        skills[key] = Skill(name, metadataURI, msg.sender, 0);
        allSkills.push(key);
        emit SkillRegistered(key, name, msg.sender);
    }

    function install(bytes32 key) external {
        require(skills[key].author != address(0), "unknown");
        skills[key].installs += 1;
        emit SkillInstalled(key, msg.sender);
    }
}
```

### 3.6 Step-by-step deployment (Foundry)

```bash
# 1. Scaffold
mkdir memeautonom-contracts && cd memeautonom-contracts
forge init --no-commit
forge install OpenZeppelin/openzeppelin-contracts

# 2. Drop the .sol files above into src/

# 3. Configure foundry.toml
cat >> foundry.toml <<'EOF'
[rpc_endpoints]
mantle         = "https://rpc.mantle.xyz"
mantle_sepolia = "https://rpc.sepolia.mantle.xyz"

[etherscan]
mantle         = { key = "${MANTLESCAN_API_KEY}", url = "https://api.mantlescan.xyz/api" }
mantle_sepolia = { key = "${MANTLESCAN_API_KEY}", url = "https://api-sepolia.mantlescan.xyz/api" }
EOF

# 4. Export deployer key + Mantlescan key
export PRIVATE_KEY=0x...        # fund with ~5 MNT for mainnet
export MANTLESCAN_API_KEY=...

# 5. Deploy to Sepolia first
forge create src/ERC8004Identity.sol:ERC8004Identity \
  --rpc-url mantle_sepolia --private-key $PRIVATE_KEY --verify

forge create src/AgenticWalletFactory.sol:AgenticWalletFactory \
  --constructor-args <ERC8004_ADDR> \
  --rpc-url mantle_sepolia --private-key $PRIVATE_KEY --verify

forge create src/JobRegistry.sol:JobRegistry \
  --constructor-args <USDC_ADDR> <ERC8004_ADDR> \
  --rpc-url mantle_sepolia --private-key $PRIVATE_KEY --verify

forge create src/SkillRegistry.sol:SkillRegistry \
  --rpc-url mantle_sepolia --private-key $PRIVATE_KEY --verify

# 6. Wire reputation writer
cast send <ERC8004_ADDR> "setReputationWriter(address,bool)" <JOB_REGISTRY_ADDR> true \
  --rpc-url mantle_sepolia --private-key $PRIVATE_KEY

# 7. Repeat with --rpc-url mantle for production
```

Copy each address into your `.env` as `VITE_*_ADDRESS`.

Save the ABIs into `src/abi/*.json` and use them with wagmi:

```ts
import { useReadContract } from 'wagmi'
import { abi } from '@/abi/JobRegistry.json'

const { data } = useReadContract({
  address: import.meta.env.VITE_JOB_REGISTRY_ADDRESS,
  abi,
  functionName: 'jobs',
  args: [jobId],
})
```

---

## 4. Indexer (powers the dashboard)

The UI's leaderboard, economy stats, feed, ticker, and wallet drawer all
need historical / aggregated data that you cannot get from a single RPC
call. Pick one:

### 4.1 Option A — The Graph (Goldsky-hosted)

1. Install Graph CLI: `npm i -g @graphprotocol/graph-cli`.
2. `graph init --product hosted-service` and point at your contracts.
3. Define entities for `Job`, `Wallet`, `Execution`, `Skill`, `ReputationEvent`.
4. Map events from §3 contracts to those entities.
5. Deploy via Goldsky: https://goldsky.com → connect repo → push.
6. Set `VITE_INDEXER_URL` to the GraphQL endpoint Goldsky gives you.

### 4.2 Option B — Envio (faster, HyperIndex)

1. https://envio.dev → install CLI → `pnpm envio init`.
2. Write a TS handler per event.
3. `pnpm envio dev`, then deploy to Envio Cloud.

### 4.3 Option C — Custom indexer (full control)

Run a small Node.js worker that uses `viem`'s `watchContractEvent` against
the Mantle RPC, writes into Postgres (Lovable Cloud already provisions
one), and exposes a GraphQL/REST API via TanStack Start server functions.

### 4.4 GraphQL queries the UI needs

```graphql
query Leaderboard {
  wallets(first: 50, orderBy: reputation, orderDirection: desc) {
    address role reputation jobsCompleted volumeUsdc autonomyScore activatedAt
  }
}

query EconomyStats {
  global(id: "global") { activeWallets jobsToday usdcSettled24h avgDecisionTimeSec }
}

query Feed($limit: Int!) {
  events(first: $limit, orderBy: timestamp, orderDirection: desc) {
    timestamp wallet { address } action detail color txHash
  }
}

query WalletDetail($addr: String!) {
  wallet(id: $addr) {
    address role reputation jobsCompleted volumeUsdc autonomyScore
    skills { name status fires }
    executions(first: 20) { timestamp action detail txHash color }
  }
}
```

Wire those into `src/lib/api.ts` with `graphql-request` + `useQuery`,
then replace the empty arrays in `src/lib/mock.ts` consumers.

---

## 5. Off-chain agent runtime (Byreal)

Each AgenticWallet needs an off-chain process that runs the 5-second
decision loop, evaluates installed skills, and signs/broadcasts txs.

### 5.1 Architecture

```
┌─────────────── Byreal Agent (Node.js, Docker) ───────────────┐
│  loop every 5s {                                              │
│    state = readChain(JobRegistry, USDC, MyWallet)             │
│    for skill in installedSkills {                             │
│      if (skill.checkCondition(state)) {                       │
│        action = skill.decideAction(state)                     │
│        wallet.execute(action.to, action.value, action.data)   │
│      }                                                        │
│    }                                                          │
│    persistDecisionLog()                                       │
│  }                                                            │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 Stack

- Node.js 20 + TypeScript
- `viem` for chain reads / writes
- Local SQLite (or Postgres) for decision log
- Each skill = a folder under `skills/<name>/index.ts` exporting
  `checkCondition()` and `decideAction()`.
- Hot key (signer) stored encrypted (KMS / age) — never on disk in plain.

### 5.3 Hosting

Run one container per active wallet on Fly.io / Railway / a small VPS.
Or run a single multi-tenant runtime that loads each user's signer from
KMS. Either way the Byreal runtime is **separate from this frontend**.

### 5.4 CLI

The `byreal skill add <name>` UX shown in `src/routes/skills.tsx` requires
a CLI binary. Build it as a separate `byreal` npm package; the CLI calls
`SkillRegistry.install()` on-chain and writes the skill config into the
local runtime config file.

---

## 6. Wiring the UI to live data (file-by-file)

| File | Currently uses | Replace with |
|---|---|---|
| `src/routes/index.tsx` (`MY_WALLET`, `FEED`, `DECISION_LOG`) | empty stubs | `useReadContract` for ERC8004 id + reputation, `useBalance` for USDC/MNT, GraphQL `Feed` + `WalletDetail` for the user's address. |
| `src/routes/economy.tsx` (`ECONOMY_STATS`, `WALLETS`, `FEED`) | empty stubs | GraphQL `EconomyStats` + `Leaderboard` + `Feed`. |
| `src/routes/leaderboard.tsx` (`WALLETS`, `getWalletDetail`) | empty stubs | GraphQL `Leaderboard` + `WalletDetail($addr)`. |
| `src/routes/skills.tsx` (`SKILLS_MARKET`) | empty stub | `SkillRegistry.allSkills()` → fetch metadata JSON from IPFS. |
| `src/components/Ticker.tsx` | empty | GraphQL subscription or polling on global stats / latest events. |
| `src/components/NodeGraph.tsx` | random nodes | Top N wallets from `Leaderboard` query + recent `Job` edges between them. |
| `src/components/WalletDrawer.tsx` | empty arrays | `WalletDetail($addr)` query, fired when row clicked. |

Keep the existing prop shapes — the types in `src/lib/mock.ts` (`WalletRow`,
`WalletDetail`, `FeedItem`, `Execution`, `WalletSkill`, `SkillListing`,
`FeedColor`) are the API contract between data layer and UI. Map your
GraphQL responses into those types in a thin `src/lib/api.ts` adapter so
the components don't change.

---

## 7. Storage (IPFS) for skill metadata + job specs

- **Provider**: web3.storage, Pinata, or Filebase.
- **Use case 1**: Skill metadata JSON (`name`, `description`, `role`,
  `defaultParams`) referenced by `SkillRegistry.metadataURI`.
- **Use case 2**: Job specs (`description`, `inputs`, `expectedOutput`)
  referenced by `JobRegistry.specHash` (store CID, hash with keccak256).
- **Use case 3**: Job results — same pattern.

Get an API key from your provider, store as `IPFS_API_TOKEN` in Lovable
Cloud secrets, expose an upload helper via a TanStack Start server
function.

---

## 8. Production checklist

- [ ] Replace hardcoded `WALLETCONNECT_PROJECT_ID` in `src/lib/wagmi.ts` with `import.meta.env.VITE_WALLETCONNECT_PROJECT_ID`.
- [ ] Switch RPCs from public to a paid provider (Ankr/BlockPI).
- [ ] Deploy all 4 contracts to Mantle Sepolia, run a full job lifecycle, then redeploy to Mantle Mainnet.
- [ ] **Audit** the contracts (Spearbit, Trail of Bits, or Code4rena) — they custody user USDC.
- [ ] Stand up the indexer; confirm the 4 GraphQL queries return data.
- [ ] Build the Byreal runtime + CLI; run one wallet end-to-end against Sepolia.
- [ ] Add `src/lib/api.ts` with `graphql-request` and replace each `mock.ts` import.
- [ ] Add KMS-backed signer storage for the off-chain agent.
- [ ] Add error boundaries + loading skeletons around every contract / GraphQL hook.
- [ ] Set `og:image` per route once you have real data + screenshots.
- [ ] Monitoring: Sentry on the frontend, Grafana/Loki on the agent runtime, Tenderly alerts on the contracts.

---

## 9. Quick reference — addresses & links

| What | Where |
|---|---|
| Mantle docs | https://docs.mantle.xyz |
| Mantle bridge | https://bridge.mantle.xyz |
| Mantlescan | https://mantlescan.xyz |
| Faucet (Sepolia) | https://faucet.sepolia.mantle.xyz |
| USDC on Mantle (mainnet) | `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9` |
| WETH on Mantle (mainnet) | `0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111` |
| WalletConnect Cloud | https://cloud.reown.com |
| Goldsky | https://goldsky.com |
| Envio | https://envio.dev |
| The Graph | https://thegraph.com |

---

That's the full scope. Build §3 first (you're blocked on contract
addresses for everything else), then §4 (indexer fills the dashboard),
then §5 (runtime makes wallets actually autonomous). The frontend in
this repo is ready to receive data the moment those land.

---

## 12. Skills system — how it actually works

A **skill** is a pluggable capability an autonomous wallet installs. Skills are
the unit of behavior in MemeAutonom: a wallet with no skills is inert; a wallet
with skills proposes and executes actions on its own. There is no upper bound
on how many skills exist — anyone can publish one to the `SkillRegistry`.

### 12.1 The four parts of a skill

1. **Manifest** — JSON pinned to IPFS, registered on-chain via
   `SkillRegistry.publish(skillId, manifestCID, feePolicy)`.
   Fields:
   - `name`, `version`, `description`, `author`
   - `permissions[]` — which actions the skill may propose
     (`swap`, `transfer`, `stake`, `vote`, `read-only`, …)
   - `triggers[]` — `tick`, `event:<topic>`, `cron:<expr>`, `webhook`
   - `inputs[]` — required env / secrets (e.g. `RPC_URL`, `API_KEY:dexscreener`)
   - `riskClass` — `safe` | `medium` | `high`
   - `feePolicy` — flat / % of profit / subscription

2. **Runtime handler** — code executed by the off-chain Byreal decision loop.
   Runs in a sandboxed worker. Pure function:
   `decide(state, ctx) → ProposedAction[]`.
   Examples shipped in v1:
   - `apy-scout` — polls Mantle DEX/lending APYs, proposes rebalances
   - `executor` — signs and submits proposed swaps via the AgenticWallet
   - `risk-guard` — vetoes proposals exceeding `riskClass` or slippage limits
   - `verifier` — validates other wallets' job submissions for reward

3. **On-chain binding** — when a user installs a skill, the AgenticWallet
   stores `(skillId → permissionMask, spendingCap, expiry)`. The wallet's
   `execute()` checks this mask before executing any proposal. This is the
   only thing that lets a skill move funds.

4. **Reputation hook** — every successful execution increments the wallet's
   ERC-8004 reputation **and** the skill's global `fires` counter. Failed
   executions slash both. This is what powers the leaderboard and the
   "fire counts" shown in the Wallet Drawer.

### 12.2 Lifecycle

```
publish skill ──► SkillRegistry (IPFS CID + feePolicy)
       │
user installs ──► AgenticWallet.installSkill(skillId, cap, expiry)
       │
Byreal loop tick ──► skill.decide() ──► ProposedAction
       │
risk-guard veto? ──┬─► drop + log
                   └─► AgenticWallet.execute() ──► Mantle tx
                                                     │
                                              ERC8004Identity.bumpRep()
                                              SkillRegistry.bumpFires()
```

### 12.3 Why "271" was a placeholder
There is no fixed wallet count. The Economy page now reads
`ECONOMY_STATS.activeWallets` from the indexer (`getEconomyStats` query in
§5). Until your subgraph is deployed it shows `N wallets` / `—` instead of a
fake number. The actual count is unbounded — every smart account spawned by
`AgenticWalletFactory` increments it.

### 12.4 If you "get everything" (full deploy)
With contracts deployed (§3), indexer live (§5), and Byreal runtime running
(§6), the loop is:
1. User connects via RainbowKit → `AgenticWalletFactory.create()` mints them
   a smart account + ERC-8004 identity.
2. They browse `/skills`, install one or more skills (on-chain tx).
3. Byreal worker picks up the new wallet, loads its installed skills,
   begins ticking.
4. Each successful tx updates reputation + skill fires; the indexer surfaces
   it; the leaderboard, economy graph, and wallet drawer all light up
   automatically — no further frontend changes needed.

