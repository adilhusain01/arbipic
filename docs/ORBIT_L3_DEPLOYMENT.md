# Orbit L3 Deployment Guide

This document describes the ArbiPic deployment on a local Arbitrum Orbit L3 chain.

## Overview

ArbiPic is deployed on two networks:
1. **Arbitrum Sepolia (L2)** - Public testnet for general use
2. **Local Orbit L3** - Custom chain for ultra-low cost verification

## L3 Architecture

```
┌─────────────────┐
│   Ethereum L1   │  (localhost:8545, Chain ID: 1337)
│   (Geth Node)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Arbitrum L2     │  (localhost:8547, Chain ID: 412346)
│ (Nitro Node)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ArbiPic L3      │  (localhost:3347, Chain ID: 333333)
│ (Orbit Chain)   │  ← Stylus Contract Deployed Here
└─────────────────┘
```

## Contract Addresses

| Network | Contract Address | Chain ID | RPC Endpoint |
|---------|-----------------|----------|--------------|
| Arbitrum Sepolia | `0xeb246817d2440f82f4b4c04c2c120afefe1e5ec4` | 421614 | https://sepolia-rollup.arbitrum.io/rpc |
| Local L3 (Orbit) | `0x1294b86822ff4976bfe136cb06cf43ec7fcf2574` | 333333 | http://127.0.0.1:3347 |

## Deployment Details

### L3 Contract Deployment

- **Deployment TX**: `0x1f8b5c5e18069c82e5b850efcbcba0a22813a2def6f84a9d1ec172208b106ee2`
- **Activation TX**: `0xc8af4e2298f70878d4fe02d02a033a695e8629da60f3cd9e08db0e162fb43aa0`
- **Contract Size**: 9.6 KB (uncompressed WASM)
- **WASM Data Fee**: 0.000092 ETH
- **Stylus Deployer**: `0xcEcba2F1DC234f70Dd89F2041029807F8D03A990`

## Running the L3 Chain

### Prerequisites

- Docker Desktop running
- At least 8GB RAM available
- Port 3347, 8547, 8545 free

### Start the Nitro Testnode

```bash
# Clone nitro-testnode (if not already cloned)
git clone https://github.com/OffchainLabs/nitro-testnode.git
cd nitro-testnode

# Start with L3 support
yes | ./test-node.bash --init --l3node --detach
```

### Verify Containers

```bash
docker ps
```

Expected containers:
- `nitro-testnode-l3node-1` (port 3347)
- `nitro-testnode-sequencer-1` (port 8547)
- `nitro-testnode-geth-1` (port 8545)
- `nitro-testnode-poster-1`
- `nitro-testnode-redis-1`

### Deploy Contract to L3

```bash
cd /path/to/ArbiPic/contracts

# Use the pre-funded L3 deployer key
cargo stylus deploy \
    --endpoint http://127.0.0.1:3347 \
    --private-key 0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659
```

### Fund Your Wallet on L3

The L3 uses bridged ETH from L2. To fund a wallet:

1. Get L2 testnet ETH first
2. Use the L1→L2→L3 bridge (built into nitro-testnode)

Or use the pre-funded deployer key for testing.

## Frontend Configuration

The frontend automatically supports both networks. Update [frontend/src/config.ts](../frontend/src/config.ts):

```typescript
// L3 Orbit chain configuration
export const orbitL3: Chain = {
  id: 333333,
  name: 'ArbiPic L3 (Orbit)',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:3347'] },
  },
  testnet: true,
}

// Contract addresses per network
export const VERIFIER_ADDRESS = '0xeb246817d2440f82f4b4c04c2c120afefe1e5ec4' // L2
export const L3_VERIFIER_ADDRESS = '0x1294b86822ff4976bfe136cb06cf43ec7fcf2574' // L3
```

## Adding L3 to MetaMask

1. Open MetaMask → Networks → Add Network
2. Fill in:
   - **Network Name**: ArbiPic L3 (Orbit)
   - **RPC URL**: http://127.0.0.1:3347
   - **Chain ID**: 333333
   - **Currency Symbol**: ETH

## Benefits of L3 Deployment

| Metric | Arbitrum Sepolia (L2) | Orbit L3 |
|--------|----------------------|----------|
| Gas Costs | ~$0.001-0.01 | Near-zero (customizable) |
| Finality | ~1 minute | ~seconds (L3 finality) |
| Throughput | Shared with L2 | Dedicated capacity |
| Customization | Standard | Full control |

## Troubleshooting

### Port Conflicts

If port 6379 is in use (Redis):
```bash
# Find and stop conflicting container
docker ps -a | grep 6379
docker stop <container_name>
docker rm <container_name>
```

### Docker Not Running

```bash
# Start Docker Desktop on macOS
open -a Docker
```

### Logs

```bash
# View L3 node logs
docker logs -f nitro-testnode-l3node-1

# View all container logs
docker compose -f docker-compose.yml logs -f
```

### Reset the Testnode

```bash
cd nitro-testnode
./test-node.bash --cleanup
yes | ./test-node.bash --init --l3node --detach
```

## Production Deployment

For production Orbit deployment:

1. Visit https://orbit.arbitrum.io/
2. Connect wallet on Arbitrum Sepolia
3. Configure your chain parameters
4. Deploy the rollup (~0.01-0.1 ETH)
5. Get your production RPC URL
6. Deploy the Stylus contract

See [Arbitrum Orbit Docs](https://docs.arbitrum.io/launch-orbit-chain/orbit-gentle-introduction) for details.

---

Built with ❤️ for the Arbitrum Hackathon 🏆
