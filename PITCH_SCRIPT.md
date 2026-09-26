# ArbiPic Pitch Script

## The Problem (10 seconds)

> "In 2024, we saw 400% increase in AI-generated misinformation. Deepfakes influenced elections. Fake disaster images went viral. **We can no longer trust what we see.**"

---

## The Solution (15 seconds)

> "ArbiPic creates **unforgeable proof** that a photo is real, captured at a specific moment, by a specific person. 
>
> Take a photo → It gets cryptographically fingerprinted → Permanently recorded on-chain → Anyone can verify it forever."

---

## How It Works (20 seconds)

| Step | What Happens |
|------|--------------|
| 📸 **Capture** | Photo taken with device metadata (GPS, timestamp, device ID) |
| 🔐 **Hash** | SHA-256 creates unique fingerprint - change 1 pixel, hash changes completely |
| 🧮 **ZK Proof** | Zero-knowledge commitment proves ownership without revealing data |
| ⛓️ **On-Chain** | Hash + proof stored permanently via Stylus smart contract |
| 🌐 **IPFS** | Full image stored on decentralized storage |
| ✅ **Verify** | Anyone can check authenticity via verification page |

---

## Why Arbitrum Stylus?

> "We write smart contracts in **Rust** instead of Solidity."

| Benefit | Impact |
|---------|--------|
| ⚡ **10-100x cheaper gas** | Complex cryptographic operations become affordable |
| 🔒 **Memory-safe** | No reentrancy attacks, buffer overflows |
| 🚀 **WASM execution** | Near-native performance for hash verification |
| 🛠️ **Better tooling** | Rust ecosystem, proper testing, type safety |

**Real numbers from our benchmarks:**
- Initialize photo: ~47,000 gas
- Verify ownership: ~45,000 gas  
- Full attestation: ~51,000 gas

*Same operations in Solidity would cost 3-5x more.*

---

## Why Orbit L3?

> "We deployed on Arbitrum's Layer 3 - **a chain built specifically for our application**."

| L2 (Sepolia) | L3 (Orbit) |
|--------------|------------|
| Shared with everyone | Dedicated throughput |
| Standard gas costs | **Near-zero gas fees** |
| Public mempool | Private sequencing |
| Limited customization | Custom gas tokens, governance |

**For ArbiPic:**
- Journalists in conflict zones can verify photos for **fractions of a cent**
- No competition for blockspace during breaking news
- Can process **thousands of verifications per second**
- Future: custom gas token for photo credits

---

## The Tech Stack

```
Frontend:     React + Vite + TypeScript + Tailwind
Wallet:       Wagmi v2 + Viem
Contract:     Rust + Stylus SDK (WASM)
Storage:      IPFS via Pinata
Proof:        Keccak256 ZK commitments
Networks:     Arbitrum Sepolia + Orbit L3
```

---

## Use Cases

| Sector | Problem Solved |
|--------|----------------|
| 📰 **Journalism** | Prove photos are from actual events, not AI |
| ⚖️ **Legal** | Timestamped evidence that holds up in court |
| 🏛️ **Government** | Authentic public records and documentation |
| 🎨 **NFTs** | Prove original creation, prevent art theft |
| 📱 **Social Media** | "Verified Real" badge for authentic content |

---

## The One-Liner

> "ArbiPic is **proof-of-reality** for the AI age - cryptographic verification that what you're seeing actually happened, powered by Arbitrum's fastest and cheapest infrastructure."

---

## Demo Flow (60 seconds)

1. **"Let me take a photo right now"** → Capture with webcam
2. **"See this hash? Unique fingerprint"** → Show SHA-256
3. **"One click to verify on-chain"** → MetaMask transaction
4. **"47,000 gas - less than $0.01"** → Show gas cost
5. **"Now anyone can verify"** → Open verification page
6. **"Share the proof"** → Twitter share button
7. **"Switch to L3 - even cheaper"** → Network switcher demo

---

## Closing

> "Every day we wait, millions more fake images enter the internet. ArbiPic isn't just an app - it's **infrastructure for trust** in the digital age.
>
> Built on Arbitrum. Verified forever. **Real photos for a real world.**"

---

## Quick Stats to Mention

- 🔢 SHA-256: 2^256 possible hashes (more than atoms in universe)
- ⚡ Stylus: 10-100x gas savings vs Solidity
- 🌍 IPFS: Decentralized, censorship-resistant storage
- 🔗 L3: Sub-cent transaction costs
- ✅ Verification: Permanent, immutable, public

---

## Competitor Comparison

| Feature | ArbiPic | Others |
|---------|---------|--------|
| On-chain proof | ✅ Permanent | ❌ Centralized DB |
| Gas efficiency | ✅ Stylus/WASM | ❌ Solidity overhead |
| ZK privacy | ✅ Commitment scheme | ❌ All data public |
| L3 scalability | ✅ Dedicated chain | ❌ Shared L1/L2 |
| Open source | ✅ Fully | ❌ Proprietary |
