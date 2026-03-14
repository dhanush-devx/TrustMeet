# TrustMeet

> **Show up or pay up.** Web3 meetup coordination with STRK staking on StarkNet.

Built on StarkNet using Cairo smart contracts + Next.js frontend. Submitted to [your hackathon].

---

## How It Works

1. **Create** — User A creates a meetup, sets location/time/stake, and specifies User B's address. Stakes STRK immediately.
2. **Join** — User B sees the invite, stakes the same amount, meetup goes **active**.
3. **Check In** — Within ±30 min of the meetup time, both users submit GPS location on-chain.
4. **Finalize** — After check-in window closes, anyone calls `finalize_meetup`. Contract auto-settles:
   - Both showed → full refund
   - Only one showed → they win both stakes
   - Neither showed → both refunded (no penalty)

---

## Stack

| Layer | Tech |
|---|---|
| Smart contracts | Cairo 2.8, OpenZeppelin Contracts |
| StarkNet tooling | Scarb, sncast (snfoundry) |
| Frontend | Next.js 14, TypeScript |
| StarkNet React | `@starknet-react/core` v3 |
| Wallets | Argent X, Braavos |
| Styling | Tailwind CSS |

---

## Project Structure

```
trustmeet/
├── contracts/
│   ├── src/
│   │   └── lib.cairo          # Main TrustMeet contract
│   ├── Scarb.toml
│   └── snfoundry.toml
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx               # Dashboard / Landing
    │   │   ├── create/page.tsx        # Create meetup form
    │   │   └── meetup/[id]/page.tsx   # Meetup detail + actions
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   └── MeetupCard.tsx
    │   ├── hooks/
    │   │   └── useTrustMeet.ts        # Contract interaction hooks
    │   ├── lib/
    │   │   ├── contract.ts            # ABI + addresses
    │   │   ├── gps.ts                 # Coordinate encoding + mock GPS
    │   │   └── meetup.ts              # Types + formatters
    │   └── providers/
    │       └── StarknetProvider.tsx
    └── package.json
```

---

## Setup & Deploy

### Prerequisites

```bash
# Install Scarb (Cairo package manager)
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh

# Install snfoundry (for deploy)
curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh

# Node 18+
node --version
```

### 1. Build the contract

```bash
cd contracts
scarb build
```

### 2. Deploy to Sepolia

```bash
# Set up your account first (one-time)
sncast account create --name myaccount --add-profile sepolia

# Deploy
sncast --profile sepolia deploy \
  --contract-name TrustMeet \
  --constructor-calldata ""
```

Copy the deployed address.

### 3. Set up frontend

```bash
cd frontend
npm install

# Create env file
cp .env.local.example .env.local
# Edit .env.local and paste your deployed contract address

npm run dev
```

Open http://localhost:3000

---

## Contract Interface

```cairo
// Create a meetup and stake
fn create_meetup(title, lat, lng, meetup_time, stake_amount, counterpart) -> meetup_id

// Counterpart joins and stakes
fn join_meetup(meetup_id)

// Check in with GPS coordinates (±30 min window)
fn checkin(meetup_id, lat, lng)

// Settle stakes after check-in window closes
fn finalize_meetup(meetup_id)

// Read functions
fn get_meetup(meetup_id) -> MeetupData
fn get_user_meetups(user) -> Array<u64>
fn get_meetup_count() -> u64
```

### Coordinate Encoding

GPS coordinates are stored on-chain as `u64` to avoid negatives:
- `lat_stored = (lat + 90.0) × 1_000_000`
- `lng_stored = (lng + 180.0) × 1_000_000`

Location tolerance: **10,000 units ≈ 1km radius**

---

## GPS Verification (Hackathon Mode)

For the demo, **mock GPS** is enabled — the frontend simulates coordinates near the meetup location. In production, you'd use:

1. Browser `navigator.geolocation` (current approach in `gps.ts`)
2. A ZK location proof system (e.g., zkLocation) to make GPS tamper-proof
3. A trusted oracle to relay verified coordinates on-chain

Toggle mock GPS in `hooks/useTrustMeet.ts`:
```ts
const { txResult, position } = await checkin(meetupId, true);  // true = mock
```

---

## STRK Token (Sepolia)

```
0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
```

Get testnet STRK from the [StarkNet Sepolia faucet](https://starknet-faucet.vercel.app/).

---

## Built at [Hackathon Name]

Team: [Your name]  
Chain: StarkNet Sepolia  
Contract: `[deployed address]`  
Demo: `[vercel url]`
