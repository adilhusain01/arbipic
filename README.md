# ArbiPic 📸

> On-Chain Verifiable Photo Capture System using Stylus and Arbitrum

A decentralized application that enables users to capture photos via webcam and verify them on-chain using Arbitrum's Stylus (Rust smart contracts). Each photo is hashed client-side and verified on Arbitrum Sepolia, creating an immutable record of authenticity.

## 🌟 Features

- **📸 Webcam Integration**: Real-time photo capture using react-webcam
- **🔐 On-Chain Verification**: Photos are hashed (SHA-256) and verified on Arbitrum
- **⚡ Stylus Smart Contracts**: Written in Rust for optimal gas efficiency (~10x cheaper than Solidity)
- **🎨 Modern UI**: Beautiful Tailwind CSS interface with gradient backgrounds
- **💰 Wallet Integration**: Seamless MetaMask connection via Wagmi
- **🔍 Transaction Tracking**: View verification transactions on Arbiscan

## 🏗️ Architecture

### Smart Contract (Rust/Stylus)
- Located in `contracts/src/lib.rs`
- Stores photo hashes with timestamps
- Ultra-efficient gas usage thanks to WASM compilation
- Deployed on Arbitrum Sepolia

### Frontend (React + TypeScript + Vite)
- Modern React 18 with TypeScript
- Vite for lightning-fast development
- Wagmi v2 for Web3 interactions
- Tailwind CSS for styling
- react-webcam for camera access

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Rust toolchain (`rustup install stable`)
- Cargo Stylus CLI: `cargo install cargo-stylus --locked`
- MetaMask wallet with Arbitrum Sepolia ETH
- Get testnet ETH from: https://sepolia-faucet.pk910.de/

### 1. Install Dependencies

**Backend (Rust Contract):**
```bash
cd contracts
cargo build --release
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Deploy Smart Contract

First, set your private key:
```bash
export PRIVATE_KEY="your_private_key_here"
```

Then deploy:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Or manually:
```bash
cd contracts
cargo stylus deploy \
    --endpoint https://sepolia-rollup.arbitrum.io/rpc \
    --private-key $PRIVATE_KEY
```

### 3. Update Contract Address

After deployment, update the contract address in `frontend/src/config.ts`:
```typescript
export const VERIFIER_ADDRESS = '0xYourDeployedAddress' as const
```

### 4. Run Frontend

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000

## 📝 Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect your MetaMask
2. **Capture Photo**: Click "📸 Capture Photo" to take a picture
3. **Verify On-Chain**: Click "🔐 Verify On-Chain" to submit the hash
4. **View Transaction**: Check the transaction on Arbiscan via the provided link

## 🛠️ Development

### Contract Development

```bash
# Check contract validity
cd contracts
cargo stylus check

# Run tests
cargo test

# Export ABI
cargo build --release --features export-abi

# Estimate gas
cargo stylus estimate-gas --endpoint https://sepolia-rollup.arbitrum.io/rpc
```

### Frontend Development

```bash
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 📦 Project Structure

```
ArbiPic/
├── contracts/              # Rust Stylus smart contract
│   ├── src/
│   │   └── lib.rs         # Main contract code
│   ├── Cargo.toml
│   └── Stylus.toml
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   └── PhotoCapture.tsx
│   │   ├── App.tsx
│   │   ├── config.ts      # Contract ABI & address
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── scripts/               # Deployment scripts
│   ├── deploy.sh
│   └── check.sh
└── README.md
```

## 🔑 Smart Contract Functions

- `init()`: Initialize contract with deployer as owner
- `verify_photo(photo_hash)`: Verify a photo hash and store timestamp
- `get_attestation(photo_hash)`: Get verification timestamp for a hash
- `is_verified(photo_hash)`: Check if a hash has been verified
- `get_owner()`: Get contract owner address

## 🌐 Network Configuration

**Arbitrum Sepolia Testnet:**
- RPC URL: https://sepolia-rollup.arbitrum.io/rpc
- Chain ID: 421614
- Explorer: https://sepolia.arbiscan.io/

## 💡 Why Stylus?

- **10x Gas Savings**: Rust/WASM is significantly more efficient than Solidity EVM
- **Memory Safety**: Rust's ownership model prevents common vulnerabilities
- **Performance**: Near-native execution speed
- **Modern Tooling**: Cargo, rustfmt, clippy for better DX

## 🎯 Hackathon Features

This project demonstrates:
- ✅ Stylus smart contract development (Rust)
- ✅ Arbitrum ecosystem integration
- ✅ On-chain identity/verification tools
- ✅ Modern Web3 UX with Wagmi
- ✅ Gas benchmarking capabilities
- ✅ Scalable architecture ready for Orbit L3

## 🏆 Future Enhancements

- [ ] Deploy on custom Orbit L3 chain for even lower costs
- [ ] Integrate Ethereum Attestation Service (EAS) for standardized attestations
- [ ] Add Zero-Knowledge proofs for privacy-preserving verification
- [ ] IPFS integration for storing actual images
- [ ] Batch verification for multiple photos
- [ ] Social sharing features
- [ ] Deepfake detection algorithms

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📄 License

MIT License

## 🔗 Resources

- [Stylus Documentation](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [Arbitrum Developer Docs](https://docs.arbitrum.io/)
- [Cargo Stylus CLI](https://github.com/OffchainLabs/cargo-stylus)
- [Wagmi Documentation](https://wagmi.sh/)

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Join Arbitrum Discord: https://discord.gg/arbitrum

---

Built with ❤️ for the Arbitrum Hackathon 🏆